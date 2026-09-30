from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class KnowledgeTriple(Base):
    __tablename__ = "knowledge_triples"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    
    subject = Column(String(255), nullable=False, index=True)
    subject_type = Column(String(100), default="Concept", nullable=False)
    relation = Column(String(255), nullable=False)
    object = Column(String(255), nullable=False, index=True)
    object_type = Column(String(100), default="Concept", nullable=False)
    confidence = Column(Float, default=1.0, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    document = relationship("Document", back_populates="knowledge_triples")
    user = relationship("User")

    def __repr__(self):
        return f"<KnowledgeTriple(id={self.id}, ({self.subject})-[{self.relation}]->({self.object}))>"
