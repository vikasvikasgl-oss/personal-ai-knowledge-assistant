from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services.recommendation_service import generate_recommendations

router = APIRouter()

@router.get("")
def get_user_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate personalized recommendations, related documents using embedding similarity,
    and detect knowledge gaps based on the user's documents.
    """
    return generate_recommendations(user_id=current_user.id, db=db)
