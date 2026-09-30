from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    original_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False)  # pdf, docx, txt, image
    file_size = Column(Integer, nullable=False)      # in bytes
    category = Column(String(100), default="Study Material", nullable=True)  # Study Material, Resume/Career, Research Paper, Project, Assignment, Personal Notes
    category_confidence = Column(Float, default=0.0, nullable=True)
    status = Column(String(50), default="Processing", nullable=False)  # Processing, Ready, Failed
    total_pages = Column(Integer, default=1, nullable=False)
    total_chunks = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    knowledge_triples = relationship("KnowledgeTriple", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(id={self.id}, user_id={self.user_id}, name='{self.original_name}', category='{self.category}', status='{self.status}')>"
