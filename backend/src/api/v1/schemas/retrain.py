from pydantic import BaseModel

class RetrainRequest(BaseModel):
    training_data: list
    labels: list[int]

class RetrainResponse(BaseModel):
    message: str
    build_id: str
    status: str
    model_version: str
    metrics: dict