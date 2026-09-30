from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DocumentTopics(BaseModel):
    document_id: int
    document_name: str
    category: str
    topics: List[str]

class RecommendationItem(BaseModel):
    id: str
    type: str  # "knowledge_gap" | "related_docs" | "topic_deep_dive" | "next_step"
    badge: str
    title: str
    description: str
    similarity_score: Optional[int] = None
    tags: List[str] = []
    documents: List[Dict[str, Any]] = []
    action_prompt: Optional[str] = None

class RecommendationsResponse(BaseModel):
    recommendations: List[RecommendationItem]
    document_topics: List[DocumentTopics]
    total_recommendations: int
    summary: Dict[str, Any]
