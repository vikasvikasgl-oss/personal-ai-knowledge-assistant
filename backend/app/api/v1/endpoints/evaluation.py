import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.evaluation_service import (
    get_full_evaluation_report,
    run_evaluation_pipeline
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("", response_model=Dict[str, Any])
def get_evaluation_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Returns full ML evaluation report:
    1. Document Classification metrics: accuracy, precision, recall, F1, confusion matrix, per-class metrics
    2. Vector Retrieval metrics: average cosine similarity, top-1/top-3/top-5 retrieval accuracy, MRR, query breakdown
    """
    return get_full_evaluation_report(user_id=current_user.id, db=db)

@router.post("/run", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def trigger_evaluation_run(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers a live evaluation run across classification and vector retrieval benchmarks.
    """
    logger.info(f"User {current_user.id} requested live ML evaluation run")
    return run_evaluation_pipeline(user_id=current_user.id, db=db)
