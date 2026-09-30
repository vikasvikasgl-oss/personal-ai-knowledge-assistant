from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class MemoryBase(BaseModel):
    content: str
    category: Optional[str] = "General"

class MemoryCreate(MemoryBase):
    source: Optional[str] = "manual"

class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None

class MemoryResponse(BaseModel):
    id: int
    user_id: int
    content: str
    category: str
    source: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MemoryListResponse(BaseModel):
    memories: List[MemoryResponse]
    total: int
