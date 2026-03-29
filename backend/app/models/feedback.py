from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from ..database import Base


class Feedback(Base):
    """Stores user feedback/ratings on AI diagnostic analysis results."""
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    report_id = Column(Integer, ForeignKey("reports.id", ondelete="SET NULL"), nullable=True)
    report_type = Column(String, nullable=True)  # "xray" or "lab"
    rating = Column(String, nullable=False)       # "up" (accurate) or "down" (inaccurate)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", backref="feedback")
