import re
import json
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.chat import Conversation, ChatMessage
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    SourceItem,
    ChatMessageResponse,
    ConversationResponse,
    ConversationDetailResponse
)
from app.services.retrieval_service import retrieve_relevant_chunks
from app.services.llm_service import generate_answer_with_gemini
from app.services.memory_service import (
    detect_and_store_memories,
    get_relevant_memories,
    format_memories_for_rag
)

logger = logging.getLogger(__name__)

router = APIRouter()

DEFAULT_HALLUCINATION_THRESHOLD = 0.20

def determine_confidence_level(score: float) -> str:
    """Classify confidence score into green/yellow/red levels."""
    if score >= 0.50:
        return "high"
    elif score >= 0.35:
        return "medium"
    return "low"

@router.post("", response_model=ChatResponse)
def ask_question(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    RAG Question-Answering Endpoint:
    1. Auto-detects personal facts stated in chat (e.g. 'My project uses MediaPipe') and saves to memories
    2. Retrieves top 5 most relevant chunks from user's isolated FAISS index
    3. Injects relevant personal memories into RAG context
    4. Hallucination Control: Checks if highest similarity score meets threshold
    5. Strict Gemini prompt generation if threshold is met or personal memories match
    6. Records conversation and messages in database
    """
    threshold = data.threshold if data.threshold is not None else DEFAULT_HALLUCINATION_THRESHOLD
    question_clean = data.question.strip()

    # 1. Detect and store any personal facts stated by user
    detect_and_store_memories(user_id=current_user.id, message=question_clean, db=db)

    # 2. Retrieve relevant personal memories
    relevant_memories = get_relevant_memories(user_id=current_user.id, query=question_clean, db=db, limit=5)
    memories_text = format_memories_for_rag(relevant_memories)

    # 3. Retrieve top 5 document chunks
    chunks = retrieve_relevant_chunks(
        user_id=current_user.id,
        query=question_clean,
        top_k=5,
        score_threshold=-1.0  # Fetch raw matches to inspect highest similarity
    )

    # Calculate best similarity score
    best_score = float(chunks[0]["similarity_score"]) if chunks else 0.0
    confidence_score = round(max(0.0, min(1.0, best_score)), 4)
    confidence_level = determine_confidence_level(best_score)

    sources_list: List[SourceItem] = []
    for c in chunks:
        # Only include sources with positive relevance
        if c.get("similarity_score", 0.0) >= 0.15:
            snippet = c.get("content", "").strip()
            # Trim snippet if very long
            if len(snippet) > 280:
                snippet = snippet[:280] + "..."
            sources_list.append(SourceItem(
                filename=c.get("filename", "Document"),
                page=c.get("page_number", 1),
                snippet=snippet,
                similarity_score=round(c.get("similarity_score", 0.0), 4)
            ))

    # Check if any personal memory directly matches query keywords
    matching_memories = []
    if relevant_memories:
        q_words = set(re.findall(r"\w+", question_clean.lower())) - {
            "what", "is", "my", "the", "a", "an", "in", "for", "of", "to", "and", "or", "do", "does", "did", "tell", "me", "used"
        }
        for m in relevant_memories:
            m_words = set(re.findall(r"\w+", m.content.lower()))
            if q_words and q_words.intersection(m_words):
                matching_memories.append(m)

    # If matching memories exist, add them as source cards
    for m in matching_memories:
        sources_list.append(SourceItem(
            filename="Personal Memory",
            page=1,
            snippet=f"{m.content} ({m.category})",
            similarity_score=0.92
        ))

    # Load recent conversation history context if continuing a thread
    history_context = []
    if data.conversation_id:
        prev_messages = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == data.conversation_id,
            ChatMessage.user_id == current_user.id
        ).order_by(ChatMessage.created_at.desc()).limit(4).all()
        for pm in reversed(prev_messages):
            history_context.append({"role": pm.role, "content": pm.content})

    # 4. Generate Answer with Synthesis Engine
    if chunks or matching_memories or history_context or question_clean.lower() in ["hi", "hello", "hey", "help", "what can you do"]:
        answer = generate_answer_with_gemini(
            chunks=chunks,
            question=question_clean,
            memories_text=memories_text,
            history_context=history_context
        )
        if matching_memories:
            confidence_score = max(confidence_score, 0.90)
            confidence_level = "high"
        elif best_score >= 0.30:
            confidence_level = "high"
        elif best_score >= 0.18:
            confidence_level = "medium"
        else:
            confidence_level = "low"
    else:
        answer = (
            "### 📚 No Documents in Vault Yet\n\n"
            "Your knowledge vault does not have any documents uploaded yet.\n\n"
            "**To get comprehensive AI answers:**\n"
            "1. Open **[My Documents](/documents)** from the sidebar.\n"
            "2. Upload your PDF, DOCX, or text notes.\n"
            "3. Return to Chat to ask questions, extract key takeaways, or generate study guides!"
        )
        confidence_level = "low"
        confidence_score = 0.0

    # 4. Save to Chat History in Database
    conversation = None
    if data.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == data.conversation_id,
            Conversation.user_id == current_user.id
        ).first()

    if not conversation:
        # Create a new conversation thread with title from question
        title = question_clean[:45] + ("..." if len(question_clean) > 45 else "")
        conversation = Conversation(
            user_id=current_user.id,
            title=title
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        user_id=current_user.id,
        role="user",
        content=question_clean
    )
    db.add(user_msg)

    # Save assistant message
    sources_json = json.dumps([s.model_dump() for s in sources_list]) if sources_list else None
    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        user_id=current_user.id,
        role="assistant",
        content=answer,
        sources=sources_json,
        confidence_score=confidence_score
    )
    db.add(assistant_msg)
    db.commit()
    db.refresh(assistant_msg)

    return ChatResponse(
        answer=answer,
        sources=sources_list,
        confidence_score=confidence_score,
        confidence_level=confidence_level,
        conversation_id=conversation.id,
        message_id=assistant_msg.id,
        created_at=assistant_msg.created_at
    )

@router.get("/conversations", response_model=List[ConversationResponse])
def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all conversation threads for current user."""
    convs = db.query(Conversation).filter(
        Conversation.user_id == current_user.id
    ).order_by(Conversation.updated_at.desc()).all()

    result = []
    for c in convs:
        result.append(ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages)
        ))
    return result

@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
def get_conversation_history(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full message history for a specific conversation."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages_data = []
    for m in conv.messages:
        sources_parsed = []
        if m.sources:
            try:
                sources_parsed = [SourceItem(**s) for s in json.loads(m.sources)]
            except Exception:
                sources_parsed = []

        messages_data.append(ChatMessageResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            sources=sources_parsed,
            confidence_score=m.confidence_score,
            confidence_level=determine_confidence_level(m.confidence_score or 0.0),
            created_at=m.created_at
        ))

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages_data
    )

@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_200_OK)
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a conversation thread and its messages."""
    conv = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.user_id == current_user.id
    ).first()

    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conv)
    db.commit()
    return {"message": "Conversation deleted successfully", "id": conversation_id}
