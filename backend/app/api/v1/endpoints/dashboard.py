from datetime import datetime, timedelta
from typing import List, Dict, Any
from collections import Counter
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.document_chunk import DocumentChunk
from app.models.chat import ChatMessage, Conversation
from app.models.memory import Memory
from app.models.knowledge_triple import KnowledgeTriple
from app.services.recommendation_service import extract_topics_from_text

router = APIRouter()

CATEGORY_COLORS = {
    "Study Material": "#6366F1",   # Indigo
    "Technical Spec": "#0EA5E9",   # Sky
    "Research Paper": "#8B5CF6",   # Violet
    "Code / Scripts": "#10B981",   # Emerald
    "Personal Notes": "#F59E0B",   # Amber
    "Uncategorized":  "#94A3B8",   # Slate
}

@router.get("")
@router.get("/stats")
def get_dashboard_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Returns dashboard statistics, charts data, recent documents, and recent questions.
    """
    user_id = current_user.id

    # 1. Stat cards
    total_docs = db.query(func.count(Document.id)).filter(Document.user_id == user_id).scalar() or 0
    total_chunks = db.query(func.count(DocumentChunk.id)).filter(DocumentChunk.user_id == user_id).scalar() or 0
    total_questions = db.query(func.count(ChatMessage.id)).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.role == "user"
    ).scalar() or 0
    total_memories = db.query(func.count(Memory.id)).filter(Memory.user_id == user_id).scalar() or 0

    # 2. Documents by category (Donut chart data)
    category_counts = (
        db.query(Document.category, func.count(Document.id))
        .filter(Document.user_id == user_id)
        .group_by(Document.category)
        .all()
    )
    categories_data = []
    for cat_name, count in category_counts:
        name = cat_name or "Study Material"
        categories_data.append({
            "name": name,
            "value": count,
            "color": CATEGORY_COLORS.get(name, "#6366F1")
        })
    if not categories_data:
        categories_data = [{"name": "No Documents", "value": 1, "color": "#CBD5E1"}]

    # 3. Top topics (Bar chart data)
    docs = db.query(Document).filter(Document.user_id == user_id).all()
    topic_counter = Counter()

    for doc in docs:
        chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).limit(4).all()
        text = " ".join([c.content for c in chunks]) if chunks else doc.original_name
        doc_topics = extract_topics_from_text(text, top_k=4)
        for t in doc_topics:
            topic_counter[t] += 1

    triples = db.query(KnowledgeTriple).filter(KnowledgeTriple.user_id == user_id).all()
    for tr in triples:
        if tr.subject and len(tr.subject) < 30:
            topic_counter[tr.subject.title()] += 1
        if tr.object and len(tr.object) < 30:
            topic_counter[tr.object.title()] += 1

    top_topics_data = []
    for topic, count in topic_counter.most_common(7):
        top_topics_data.append({
            "topic": topic,
            "count": count
        })
    if not top_topics_data:
        top_topics_data = [{"topic": "Awaiting Docs", "count": 0}]

    # 4. Activity over time (Line chart data for past 7 days)
    now = datetime.utcnow()
    days = [(now - timedelta(days=i)).date() for i in range(6, -1, -1)]
    activity_map = {d: {"date": d.strftime("%b %d"), "documents": 0, "questions": 0} for d in days}

    recent_docs_query = db.query(Document.created_at).filter(
        Document.user_id == user_id,
        Document.created_at >= (now - timedelta(days=7))
    ).all()
    for (d_date,) in recent_docs_query:
        if d_date:
            dt = d_date.date()
            if dt in activity_map:
                activity_map[dt]["documents"] += 1

    recent_questions_query = db.query(ChatMessage.created_at).filter(
        ChatMessage.user_id == user_id,
        ChatMessage.role == "user",
        ChatMessage.created_at >= (now - timedelta(days=7))
    ).all()
    for (q_date,) in recent_questions_query:
        if q_date:
            qt = q_date.date()
            if qt in activity_map:
                activity_map[qt]["questions"] += 1

    activity_data = list(activity_map.values())

    # 5. Recent documents (top 5)
    recent_docs_list = (
        db.query(Document)
        .filter(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .limit(5)
        .all()
    )
    formatted_recent_docs = [
        {
            "id": d.id,
            "name": d.original_name,
            "file_type": d.file_type,
            "file_size": d.file_size,
            "category": d.category or "Study Material",
            "category_confidence": d.category_confidence or 0.0,
            "total_chunks": d.total_chunks,
            "created_at": d.created_at.isoformat() if d.created_at else None
        }
        for d in recent_docs_list
    ]

    # 6. Recent questions (top 5)
    user_questions = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.user_id == user_id,
            ChatMessage.role == "user"
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(5)
        .all()
    )
    formatted_recent_questions = []
    for q in user_questions:
        assistant_reply = (
            db.query(ChatMessage)
            .filter(
                ChatMessage.conversation_id == q.conversation_id,
                ChatMessage.role == "assistant",
                ChatMessage.created_at >= q.created_at
            )
            .order_by(ChatMessage.created_at.asc())
            .first()
        )
        excerpt = assistant_reply.content[:140] + "..." if assistant_reply and assistant_reply.content else "Response generated"
        formatted_recent_questions.append({
            "id": q.id,
            "conversation_id": q.conversation_id,
            "question": q.content,
            "answer_preview": excerpt,
            "confidence_score": assistant_reply.confidence_score if assistant_reply else None,
            "created_at": q.created_at.isoformat() if q.created_at else None
        })

    return {
        "stats": {
            "total_documents": total_docs,
            "total_chunks": total_chunks,
            "questions_asked": total_questions,
            "memories_saved": total_memories
        },
        "charts": {
            "categories": categories_data,
            "top_topics": top_topics_data,
            "activity_over_time": activity_data
        },
        "recent_documents": formatted_recent_docs,
        "recent_questions": formatted_recent_questions
    }
