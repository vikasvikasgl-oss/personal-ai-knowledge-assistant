from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict

class TripleBase(BaseModel):
    subject: str
    subject_type: str = "Concept"
    relation: str
    object: str
    object_type: str = "Concept"
    confidence: float = 1.0

class TripleCreate(TripleBase):
    document_id: int

class TripleResponse(TripleBase):
    id: int
    user_id: int
    document_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class GraphNode(BaseModel):
    id: str
    label: str
    type: str = "Concept"
    color: Optional[str] = None
    document_ids: List[int] = []
    documents: List[Dict[str, Any]] = []
    degree: int = 1

class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    relation: str
    label: str
    document_id: int
    document_name: str

class GraphDataResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    total_nodes: int
    total_edges: int
    total_triples: int
    node_types: List[str]

class ExtractionStatusResponse(BaseModel):
    document_id: int
    triples_extracted: int
    status: str
    message: str
