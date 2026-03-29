from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..database import get_db
from ..models.feedback import Feedback
from ..models.user import User
from ..dependencies import get_current_user

router = APIRouter(tags=["Feedback"])


class FeedbackCreate(BaseModel):
    report_id: Optional[int] = None
    report_type: Optional[str] = None   # "xray" | "lab"
    rating: str                          # "up" | "down"
    comment: Optional[str] = None


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit feedback for an AI diagnostic analysis result.
    Stores the user's accuracy rating and optional comment.
    """
    if payload.rating not in ("up", "down"):
        raise HTTPException(status_code=400, detail="Rating must be 'up' or 'down'")

    fb = Feedback(
        user_id=current_user.id,
        report_id=payload.report_id,
        report_type=payload.report_type,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return {"message": "Feedback submitted successfully", "id": fb.id}
