from fastapi.params import Query
from pydantic import BaseModel, Field
from typing import Any, List, Literal, Optional

class PredictRequest(BaseModel):
    model_version: Optional[str] = None
    response_format: Literal["json", "csv"] = Query("csv")

class PredictResponse(BaseModel):
    prediction: List[Any]
    rows: int
    evaluation: Optional[dict] = None

class RetrainRequest(BaseModel):
    training_data: List[List[Any]]
    labels: List[Any]

class RetrainResponse(BaseModel):
    message: str
    model_version: str

class SinglePredictBody(BaseModel):
    data: dict[str, Any] = Field(..., description="Feature key-values matching required columns")

class SinglePredictResponse(BaseModel):
    prediction: str
    shap_values: Optional[dict] = None
