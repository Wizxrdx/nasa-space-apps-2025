from pydantic import BaseModel
from typing import Any, List, Optional

class PredictionResponse(BaseModel):
    prediction: Any
    confidence: Optional[float] = None

class RetrainRequest(BaseModel):
    training_data: List[Any]
    labels: List[Any]
    parameters: Optional[dict] = None

class RetrainResponse(BaseModel):
    success: bool
    message: str
    model_version: Optional[str] = None