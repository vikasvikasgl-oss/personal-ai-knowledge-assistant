from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(100), default="General", nullable=True)  # Project, Tech Stack, Preference, Fact, Profile
    source = Column(String(50), default="chat", nullable=True)        # chat, manual
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="memories")

    def __repr__(self):
        return f"<Memory(id={self.id}, user_id={self.user_id}, category='{self.category}', content='{self.content[:30]}...')>"
