import os
import json
from typing import Any

import joblib
from repositories.model_repository import ModelRepository
from utils.settings import MODELS_DIR

class ModelRegistry:
    def __init__(self, models_repo: ModelRepository | None = None):
        os.makedirs(MODELS_DIR, exist_ok=True)
        self.registry_path = os.path.join(MODELS_DIR, "registry.json")
        self._repo = models_repo or ModelRepository()

    def _read(self) -> dict[str, Any]:
        if not os.path.exists(self.registry_path):
            return {}
        with open(self.registry_path, "r", encoding="utf-8") as f:
            return json.load(f)
        
    def get_model(self, model_name: str) -> dict[str, Any] | None:
        info = self.get_model_info(model_name)
        if info is None:
            raise FileNotFoundError
        
        file_path = os.path.join(MODELS_DIR, info['model'], "model.pkl")
        if not os.path.exists(file_path):
            raise FileNotFoundError
        return joblib.load(file_path)

    def get_default_model(self) -> dict[str, str] | None:
        data = self._read()
        return data.get("default")

    def get_kepler_model(self) -> dict[str, Any] | None:
        data = self._read()
        return data.get("kepler")
    
    def get_k2_model(self) -> dict[str, Any] | None:
        data = self._read()
        return data.get("k2")
    
    def get_tess_model(self) -> dict[str, Any] | None:
        data = self._read()
        return data.get("tess")
    
    def get_model_dataset_path(self, model_name: str) -> str | None:
        data = self._read()
        data.get(model_name)
        return os.path.join(MODELS_DIR, model_name, "dataset.csv")
    
    def get_model_info(self, model_name: str) -> dict[str, Any] | None:
        data = self._read()
        return data.get(model_name)

    def list_base_models(self) -> list[str]:
        data = self._read()
        return sorted(data.keys())