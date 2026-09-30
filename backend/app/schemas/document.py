from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel

class DocumentChunkResponse(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    page_number: int
    content: str
    token_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_type: str
    file_size: int
    category: Optional[str] = "Study Material"
    category_confidence: Optional[float] = 0.0
    status: str
    total_pages: int
    total_chunks: int
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DocumentDetailResponse(DocumentResponse):
    chunks: List[DocumentChunkResponse] = []

    class Config:
        from_attributes = True

class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int
