import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.memory import Memory
from app.schemas.memory import (
    MemoryCreate,
    MemoryUpdate,
    MemoryResponse,
    MemoryListResponse
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=MemoryListResponse)
def list_memories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all personal memories for current user."""
    memories = db.query(Memory).filter(
        Memory.user_id == current_user.id
    ).order_by(Memory.created_at.desc()).all()

    return MemoryListResponse(
        memories=memories,
        total=len(memories)
    )

@router.post("", response_model=MemoryResponse, status_code=status.HTTP_201_CREATED)
def create_memory(
    data: MemoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually add a personal fact or memory."""
    cleaned = data.content.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Memory content cannot be empty.")

    memory = Memory(
        user_id=current_user.id,
        content=cleaned,
        category=data.category or "General",
        source=data.source or "manual"
    )
    db.add(memory)
    db.commit()
    db.refresh(memory)
    return memory

@router.put("/{memory_id}", response_model=MemoryResponse)
def update_memory(
    memory_id: int,
    data: MemoryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Edit an existing memory."""
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id
    ).first()

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found.")

    if data.content is not None:
        cleaned = data.content.strip()
        if not cleaned:
            raise HTTPException(status_code=400, detail="Memory content cannot be empty.")
        memory.content = cleaned

    if data.category is not None:
        memory.category = data.category.strip() or "General"

    memory.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(memory)
    return memory

@router.delete("/{memory_id}", status_code=status.HTTP_200_OK)
def delete_memory(
    memory_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a memory entry."""
    memory = db.query(Memory).filter(
        Memory.id == memory_id,
        Memory.user_id == current_user.id
    ).first()

    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found.")

    db.delete(memory)
    db.commit()
    return {"message": "Memory deleted successfully", "id": memory_id}
