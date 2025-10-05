import json
from pathlib import Path
import shutil
from typing import Any, List
import os
import joblib
from pandas import DataFrame

from utils.settings import MODELS_DIR

class ModelRepository:
    def __init__(self):
        self.models_dir = os.path.abspath(MODELS_DIR)
        os.makedirs(self.models_dir, exist_ok=True)

    def _version_dir(self, model_name: str, version: str) -> str:
        return os.path.join(self.models_dir, model_name, version)

    def save_model(self, model: Any, model_name: str, version: str, dataset: DataFrame) -> str:
        version_dir = self._version_dir(model_name, version)
        os.makedirs(version_dir, exist_ok=True)
        file_path = os.path.join(version_dir, "model.pkl")
        joblib.dump(model, file_path)
        dataset_path = os.path.join(version_dir, "dataset.csv")
        dataset.to_csv(dataset_path, index=False)
        return file_path

    def save_fork_info(self, path: str, model: str, version: str, build_id: str, hyperparams: str, metrics: str) -> None:
        info_path = os.path.join(Path(path).parent.parent, "parent.json")
        info = {
            "model": model,
            "version": version,
        }
        with open(info_path, "w") as f:
            json.dump(info, f)
        self.save_version_info(Path(path).parent, build_id, hyperparams, metrics)
    
    def save_version_info(self, path: str, build_id: str, hyperparams: str, metrics: str) -> None:
        info_path = os.path.join(path, "info.json")
        info = {
            "build_id": build_id,
            "hyperparameters": hyperparams,
            "metrics": metrics,
        }
        with open(info_path, "w") as f:
            json.dump(info, f)

    def get_parent_model(self, model_name: str) -> Any | None:
        parent_path = os.path.join(self.models_dir, model_name, "parent.json")
        if not os.path.exists(parent_path):
            return None
        with open(parent_path, "r") as f:
            return json.load(f)

    def load_model(self, model_name: str, version: str) -> Any:
        file_path = os.path.join(self._version_dir(model_name, version), "model.pkl")
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Model '{model_name}' version '{version}' not found at {file_path}")
        return joblib.load(file_path)
        
    def list_models(self) -> List[str]:
        return sorted(
            d for d in os.listdir(self.models_dir)
            if os.path.isdir(os.path.join(self.models_dir, d)) and not os.path.exists(os.path.join(self.models_dir, d, "model.pkl"))
        )
        
    def list_versions(self, model_name: str) -> List[str]:
        root = os.path.join(self.models_dir, model_name)
        if not os.path.isdir(root):
            return []
        return sorted(
            d for d in os.listdir(root)
            if os.path.isdir(os.path.join(root, d))
        )
    
    def latest_version(self, model_name: str) -> str | None:
        versions = self.list_versions(model_name)
        return versions[-1] if versions else None

    def delete_version(self, model_name: str, version: str) -> None:
        version_dir = self._version_dir(model_name, version)
        if not os.path.isdir(version_dir):
            raise FileNotFoundError(f"{model_name}/{version} not found")
        shutil.rmtree(version_dir)
