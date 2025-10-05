from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional

from pandas import DataFrame

from repositories.model_repository import ModelRepository
from repositories.build_history_repository import BuildHistoryRepository
from ml.model_registry import ModelRegistry
from ml.dummy_trainer import Trainer

LABEL_MAP = {0: "CONFIRMED", 1: "CANDIDATE", 2: "FALSE POSITIVE"}

class ModelService:
    def __init__(self,
                 registry: ModelRegistry | None = None,
                 models: ModelRepository | None = None,
                 history: BuildHistoryRepository | None = None,
                 trainer: Trainer | None = None):
        self.registry = registry or ModelRegistry()
        self.models = models or ModelRepository()
        self.history = history or BuildHistoryRepository()
        self.trainer = trainer or Trainer()

    def shap(self, df: DataFrame, model_name: str, version: Optional[str] = None) -> Dict[str, Any]:
        # Resolve model_name/version: use default if not provided, else latest if version None
        model = None
        if version is not None:
            try:
                model = self.models.load_model(model_name=model_name, version=version)
            except FileNotFoundError:
                raise RuntimeError("Model does not exist.")

        if model is None:
            try:
                model = self.registry.get_model(model_name)
            except FileNotFoundError:
                raise RuntimeError("Base model does not exist.")
        try:
            shap_values = self.trainer.shap(model, df)
            return shap_values
        except Exception as e:
            raise RuntimeError(f"Failed to compute SHAP values: {e}")

    def predict(self, df: DataFrame, model_name: str, version: Optional[str] = None) -> List[Any]:
        # Resolve model_name/version: use default if not provided, else latest if version None
        model = None
        if version is not None:
            try:
                model = self.models.load_model(model_name=model_name, version=version)
            except FileNotFoundError:
                raise RuntimeError("Model does not exist.")

        if model is None:
            try:
                model = self.registry.get_model(model_name)
            except FileNotFoundError:
                raise RuntimeError("Base model does not exist.")
        
        preds = model.predict(df.values)

        # Return raw numeric predictions (no label mapping)
        try:
            import numpy as np
            arr = np.asarray(preds).ravel()
            return [v.item() if hasattr(v, "item") else v for v in arr]
        except Exception:
            try:
                return list(preds)
            except Exception:
                return preds

    def retrain(self,
                action: str,
                fork_name: Optional[str] = None,
                fork_base_model: Optional[str] = None,
                fork_model: Optional[str] = None,
                fork_version: Optional[str] = None,
                version_model: Optional[str] = None,
                version_base_model: Optional[str] = None,
                original_df: Optional[DataFrame] = None,
                hyperparams: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        build_id = self.history.new_id()
        started_at = datetime.utcnow().isoformat()
        try:
            # process outputs
            if action == "fork":
                if not fork_name:
                    raise ValueError("fork_name is required when action='fork'.")
                if fork_name in self.models.list_models():
                    raise ValueError(f"fork_name '{fork_name}' already exists. Choose a different name.")
                if fork_base_model:
                    base_model = self.registry.get_model(fork_base_model)
                    if not base_model:
                        raise ValueError(f"Base model '{fork_base_model}' not found in registry.")
                    model_name = fork_base_model
                    model_version = None
                elif fork_model and fork_version:
                    base_model = self.registry.get_model(fork_model)
                    if not base_model:
                        raise ValueError(f"Model '{fork_model}' not found in registry.")
                    resolved_version = self.registry.resolve_version(fork_model, fork_version)
                    if not resolved_version:
                        raise ValueError(f"Version '{fork_version}' for model '{fork_model}' not found.")
                    model_name = fork_model
                    model_version = fork_version
                else:
                    raise ValueError("For 'fork' action, either 'fork_base_model' or both 'fork_model' and 'fork_version' must be provided.")

            elif action == "version":
                if version_model:
                    base_model = self.registry.get_model(version_model)
                    if not base_model:
                        raise ValueError(f"Model '{version_model}' not found in registry.")
                    model_name = version_model
                    model_version = None
                elif version_base_model:
                    base_model = self.registry.get_model(version_base_model)
                    if not base_model:
                        raise ValueError(f"Base model '{version_base_model}' not found in registry.")
                    model_name = version_base_model
                    model_version = None
                else:
                    raise ValueError("For 'version' action, either 'version_model' or 'version_base_model' must be provided.")
            else:
                raise ValueError("Action must be either 'fork' or 'version'.")
                
            # Pass hyperparameters to trainer if supported
            hp = hyperparams or {}
            if hasattr(self.trainer, "train_and_eval"):
                model, metrics = self.trainer.train_and_eval(original_df, **hp)
            else:
                model, metrics = self.trainer.train_and_eval(original_df)

            new_version = datetime.utcnow().strftime("%Y%m%d%H%M%S")
            if action == "fork":
                path = self.models.save_model(model, fork_name, new_version, original_df)
                self.models.save_fork_info(path, model_name, model_version, build_id, str(hyperparams), str(metrics))
                self.history.append({
                    "id": build_id,
                    "model_name": fork_name,
                    "version": new_version,
                    "started_at": started_at,
                    "finished_at": datetime.utcnow().isoformat(),
                    "status": "success",
                    "metrics": metrics,
                    "note": f"Saved at {path}",
                })
            else:
                path = self.models.save_model(model, fork_model, new_version, original_df)
                self.models.save_version_info(fork_model, new_version, build_id)
                self.history.append({
                    "id": build_id,
                    "model_name": fork_model,
                    "version": new_version,
                    "started_at": started_at,
                    "finished_at": datetime.utcnow().isoformat(),
                    "status": "success",
                    "metrics": metrics,
                    "note": f"Saved at {path}",
                })
            
            return {
                "build_id": build_id,
                "status": "success",
                "model_name": fork_model,
                "model_version": new_version,
                "metrics": metrics,
            }
        except Exception as e:
            self.history.append({
                "id": build_id,
                "model_name": fork_model,
                "version": None,
                "started_at": started_at,
                "finished_at": datetime.utcnow().isoformat(),
                "status": "failed",
                "metrics": None,
                "note": str(e),
            })
            raise

    def get_models(self) -> List[str]:
        return self.models.list_models()
    
    def get_base_models(self) -> List[str]:
        return self.registry.list_base_models()
    
    def get_parent_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        return self.models.get_parent_model(model_name)
    
    def list_versions(self, model_name: str) -> List[str]:
        return self.models.list_versions(model_name)

    def list_builds(self, limit: int = 50):
        return self.history.list(limit)

    def get_build(self, build_id: str):
        return self.history.get(build_id)