from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, Field

class SourceItem(BaseModel):
    filename: str
    page: int
    snippet: str
    similarity_score: float

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question or prompt")
    conversation_id: Optional[int] = Field(None, description="Existing conversation ID to append message to")
    threshold: Optional[float] = Field(0.35, ge=0.0, le=1.0, description="Minimum cosine similarity hallucination cutoff")

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceItem] = []
    confidence_score: float
    confidence_level: str  # "high", "medium", "low"
    conversation_id: int
    message_id: int
    created_at: datetime

class ChatMessageResponse(BaseModel):
    id: int
    role: str
    content: str
    sources: Optional[List[SourceItem]] = []
    confidence_score: Optional[float] = None
    confidence_level: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0

    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True
