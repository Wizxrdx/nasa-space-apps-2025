from functools import lru_cache
from services.model_service import ModelService

@lru_cache()
def get_model_service() -> ModelService:
    # Construct once per process; reuse across requests
    return ModelService()