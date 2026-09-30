"""
Personal Memory Service
Detects facts stated by the user in chat conversations, persists them in the
memories table, and provides relevant memories to inject into RAG context.
"""

import re
import json
import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.models.memory import Memory

logger = logging.getLogger(__name__)

# Heuristic patterns that indicate the user is asserting personal facts/preferences
PERSONAL_ASSERTION_PATTERNS = [
    # "My project uses MediaPipe", "My name is John", "My stack is FastAPI"
    r"\bmy\s+([a-zA-Z0-9_\-\s]{2,25})\s+(?:is|uses|has|runs|requires|relies on|supports|consists of)\s+([^.!?\n]+)",
    # "I am building a drone", "I am a backend engineer"
    r"\bi(?:\s+am|\x27m)\s+(?:a|an|working on|building|designing|using|learning|focused on)\s+([^.!?\n]+)",
    # "I use PyTorch", "I prefer dark mode", "I work with FastAPI"
    r"\bi\s+(?:use|work with|prefer|like|love|specialize in|rely on|chose)\s+([^.!?\n]+)",
    # "We use Kubernetes", "We are building an ERP"
    r"\bwe\s+(?:use|are using|are building|have|rely on)\s+([^.!?\n]+)",
    # "Remember that..."
    r"\bremember\s+(?:that\s+)?([^.!?\n]+)",
]

def extract_memories_heuristic(message: str) -> List[Dict[str, str]]:
    """
    Rule-based extraction that captures direct user assertions with high precision.
    """
    facts = []
    text = message.strip()

    # Clean leading punctuation
    for pattern in PERSONAL_ASSERTION_PATTERNS:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for m in matches:
            full_match = m.group(0).strip()
            # Determine appropriate category
            lower = full_match.lower()
            if any(k in lower for k in ["project", "app", "system", "tool", "library", "framework", "repo", "package"]):
                category = "Project"
            elif any(k in lower for k in ["mediapipe", "pytorch", "fastapi", "react", "python", "docker", "faiss", "gemini", "sql", "aws"]):
                category = "Tech Stack"
            elif any(k in lower for k in ["prefer", "like", "love", "favorite", "style", "mode"]):
                category = "Preference"
            elif any(k in lower for k in ["name", "role", "engineer", "student", "developer", "architect"]):
                category = "Profile"
            else:
                category = "Fact"

            # Convert 1st person "my/I" into 3rd person fact description
            converted = re.sub(r"\bmy\b", "User's", full_match, flags=re.IGNORECASE)
            converted = re.sub(r"\b(?:i\s+am|i'm)\b", "User is", converted, flags=re.IGNORECASE)
            converted = re.sub(r"\bi\b", "User", converted, flags=re.IGNORECASE)
            converted = re.sub(r"\bwe\b", "User's team", converted, flags=re.IGNORECASE)
            converted = re.sub(r"\bremember\s+(?:that\s+)?", "", converted, flags=re.IGNORECASE)

            cleaned_fact = converted.strip()
            if len(cleaned_fact) >= 8 and not any(f["content"].lower() == cleaned_fact.lower() for f in facts):
                # Capitalize first letter
                cleaned_fact = cleaned_fact[0].upper() + cleaned_fact[1:]
                facts.append({"content": cleaned_fact, "category": category})

    return facts

def detect_and_store_memories(user_id: int, message: str, db: Session) -> List[Memory]:
    """
    Analyzes user chat message, extracts any stated personal facts,
    and stores them in the memories table if not already present.
    """
    if not message or len(message.strip()) < 8:
        return []

    # 1. Extract candidates via fast heuristic
    candidates = extract_memories_heuristic(message)

    # 2. Try LLM-based extraction if available and heuristic found nothing on a promising message
    if not candidates and any(k in message.lower() for k in ["my ", "i am", "i'm", "i use", "we use", "remember"]):
        try:
            from app.services.llm_service import generate_gemini_answer
            prompt = (
                f"Analyze this message from a user in a private chat:\n\"{message}\"\n\n"
                f"Extract any specific facts, project details, tech stacks, or preferences the user states about themselves. "
                f"Format your response as a valid JSON list of objects: [{{ \"content\": \"User's project uses MediaPipe\", \"category\": \"Project\" }}]. "
                f"If no personal facts are stated, return []. Return ONLY the JSON."
            )
            # Use quick prompt if LLM is active
            import os
            if os.getenv("GEMINI_API_KEY"):
                llm_resp = generate_gemini_answer(prompt, "System instructions: Extract user facts as JSON.")
                # Extract json substring
                json_match = re.search(r"\[\s*\{.*\}\s*\]", llm_resp, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    for item in parsed:
                        if isinstance(item, dict) and "content" in item:
                            candidates.append({
                                "content": item["content"].strip(),
                                "category": item.get("category", "General")
                            })
        except Exception as e:
            logger.debug(f"LLM memory extraction deferred: {e}")

    if not candidates:
        return []

    # 3. Store non-duplicate memories
    stored_memories: List[Memory] = []
    existing = db.query(Memory).filter(Memory.user_id == user_id).all()
    existing_contents = [e.content.lower().strip() for e in existing]

    for item in candidates:
        content = item["content"].strip()
        lower_content = content.lower()

        # Check if already saved (exact or substring)
        if any(lower_content in ex or ex in lower_content for ex in existing_contents):
            continue

        memory = Memory(
            user_id=user_id,
            content=content,
            category=item.get("category", "General"),
            source="chat"
        )
        db.add(memory)
        stored_memories.append(memory)
        existing_contents.append(lower_content)

    if stored_memories:
        try:
            db.commit()
            for m in stored_memories:
                db.refresh(m)
            logger.info(f"Stored {len(stored_memories)} new memory facts for user {user_id}: {[m.content for m in stored_memories]}")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to persist memories: {e}")

    return stored_memories

def get_relevant_memories(user_id: int, query: str, db: Session, limit: int = 5) -> List[Memory]:
    """
    Returns user memories that are relevant to the current user query.
    If query matches specific terms in a memory, those are prioritized.
    Otherwise returns the most recent memories up to limit.
    """
    all_memories = db.query(Memory).filter(
        Memory.user_id == user_id
    ).order_by(Memory.created_at.desc()).all()

    if not all_memories:
        return []

    if not query:
        return all_memories[:limit]

    # Keyword relevance score
    q_words = set(re.findall(r"\w+", query.lower()))
    stop_words = {"what", "is", "my", "the", "a", "an", "in", "for", "of", "to", "and", "or", "do", "does", "did"}
    meaningful_q_words = q_words - stop_words

    def score_memory(m: Memory):
        m_words = set(re.findall(r"\w+", m.content.lower()))
        overlap = len(meaningful_q_words.intersection(m_words))
        return overlap

    scored = [(score_memory(m), m) for m in all_memories]
    # Prioritize memories that have keyword overlap
    scored.sort(key=lambda x: x[0], reverse=True)

    return [m for score, m in scored][:limit]

def format_memories_for_rag(memories: List[Memory]) -> str:
    """
    Formats memory objects into structured context text for LLM prompt injection.
    """
    if not memories:
        return ""

    lines = ["USER PERSONAL KNOWLEDGE & MEMORIES (Learned from user):"]
    for m in memories:
        lines.append(f"- {m.content} [Category: {m.category}]")
    return "\n".join(lines)
