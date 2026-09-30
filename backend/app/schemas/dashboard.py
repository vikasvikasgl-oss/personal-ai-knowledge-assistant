from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class DashboardStats(BaseModel):
    total_documents: int
    total_chunks: int
    total_questions: int
    total_memories: int

class CategoryCount(BaseModel):
    name: str
    value: int
    color: str

class TopicFrequency(BaseModel):
    topic: str
    count: int

class ActivityDataPoint(BaseModel):
    date: str
    documents: int
    questions: int

class DashboardCharts(BaseModel):
    documents_by_category: List[CategoryCount]
    top_topics: List[TopicFrequency]
    activity_over_time: List[ActivityDataPoint]

class RecentDocument(BaseModel):
    id: int
    name: str
    category: str
    file_type: str
    total_pages: int
    total_chunks: int
    status: str
    created_at: str

class RecentQuestion(BaseModel):
    id: int
    question: str
    created_at: str
    confidence_score: Optional[float] = None
    conversation_id: int

class DashboardResponse(BaseModel):
    stats: DashboardStats
    charts: DashboardCharts
    recent_documents: List[RecentDocument]
    recent_questions: List[RecentQuestion]
