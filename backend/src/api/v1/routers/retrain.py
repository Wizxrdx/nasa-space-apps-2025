from __future__ import annotations
from typing import Literal, Optional
from pathlib import Path
import json
import pandas as pd

from fastapi import APIRouter, HTTPException, Depends, File, Form, UploadFile
from api.dependencies import get_model_service
from api.v1.schemas.retrain import RetrainResponse

# We locate datasets/ next to models/ using MODELS_DIR
from utils.settings import MODELS_DIR

router = APIRouter()

def _load_dataset_from_store(use_dataset: str, dataset_model: Optional[str], dataset_version: Optional[str]) -> pd.DataFrame:
    datasets_dir = Path(MODELS_DIR).parent / "datasets"
    candidates: list[Path] = []
    if use_dataset == "base_model":
        if not dataset_model:
            raise HTTPException(status_code=400, detail="dataset_model is required for use_dataset='base_model'.")
        candidates = [
            datasets_dir / dataset_model / "base.csv",
            Path(MODELS_DIR) / dataset_model / "base" / "train.csv",
            Path(MODELS_DIR) / dataset_model / "base" / "dataset.csv",
        ]
    elif use_dataset == "model_version":
        if not dataset_model or not dataset_version:
            raise HTTPException(status_code=400, detail="dataset_model and dataset_version are required for use_dataset='model_version'.")
        candidates = [
            datasets_dir / dataset_model / dataset_version / "train.csv",
            Path(MODELS_DIR) / dataset_model / dataset_version / "train.csv",
            Path(MODELS_DIR) / dataset_model / dataset_version / "dataset.csv",
        ]
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported use_dataset '{use_dataset}'.")
    for p in candidates:
        if p.exists():
            return pd.read_csv(p, sep=None, engine="python")
    raise HTTPException(status_code=404, detail=f"Dataset not found. Searched: {', '.join(str(p) for p in candidates)}")

@router.post("/", response_model=RetrainResponse)
async def retrain(
    # ACTION (target)
    action: Literal["fork", "version"] = Form(..., description="Create a fork or a new version"),
    # Versioning target (required when action='version')
    # Forking target + source (required when action='fork') OR target (when base model fork)
    fork_name: Optional[str] = Form(None, description="Target model family for new fork (action='fork')"),
    target_model: Optional[str] = Form(None, description="Target model family for new version (action='version')"),
    target_version: Optional[str] = Form(None, description="Source version to fork from (when fork_source_type='model_version')"),
    # DATASET (independent of action)
    use_dataset: Literal["csv", "model_version", "base_model"] = Form(..., description="Where to load the dataset from"),
    dataset_model: Optional[str] = Form(None, description="When use_dataset in {model_version, base_model}: dataset source model"),
    dataset_version: Optional[str] = Form(None, description="When use_dataset='model_version': dataset source version"),
    hyperparams: Optional[str] = Form(None, description="JSON string of hyperparameters to pass to trainer"),
    file: UploadFile | None = File(None, description="CSV file (required when use_dataset='csv')"),
    model_service = Depends(get_model_service),
):
    # Validate action requirements
    if action == "fork":
        if fork_name is None:
            raise HTTPException(status_code=400, detail="fork_name is required when action='fork'.")
        if fork_name == target_model:
            raise HTTPException(status_code=400, detail="fork_name cannot be the same as target_model.")
        if target_model is None:
            raise HTTPException(status_code=400, detail="target_model is required when action='fork'.")
        # If forking to a model name, target_version is required
        if not model_service.registry.get_model_info(target_model) and target_version is None:
            raise HTTPException(status_code=400, detail="target_version is required when forking to a model.")
    else:  # action == "version"
        # Only model name is needed (target_model already provided). Ignore fork_* if sent.
        if target_model is None:
            raise HTTPException(status_code=400, detail="target_model is required when action='version'.")
        if not model_service.registry.get_model_info(target_model):
            raise HTTPException(status_code=400, detail=f"target_model '{target_model}' does not exist.")

    # Load dataset
    if use_dataset == "csv":
        if not file:
            raise HTTPException(status_code=400, detail="CSV file is required when use_dataset='csv'.")
        if file.content_type not in ("text/csv", "application/vnd.ms-excel", "application/csv", "text/plain"):
            raise HTTPException(status_code=415, detail="Unsupported media type. Upload a CSV file.")
        try:
            file.file.seek(0)
            df = pd.read_csv(file.file, sep=None, engine="python")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV: {e}")
    else:
        df = _load_dataset_from_store(use_dataset, dataset_model, dataset_version)

    if df.empty:
        raise HTTPException(status_code=400, detail="Dataset is empty.")
    df.columns = df.columns.str.strip()
    if "label" not in df.columns:
        raise HTTPException(status_code=400, detail="Dataset must include a 'label' column.")

    # Call service
    try:
        # Validate action requirements
        if action == "fork":
            if target_model and target_version is None:
                if model_service.registry.get_model_info(target_model):
                    result = model_service.retrain(
                        action=action,
                        fork_name=fork_name,
                        fork_base_model=target_model,
                        original_df=df,
                        hyperparams=hyperparams
                    )
                else:
                    result = model_service.retrain(
                        action=action,
                        fork_name=fork_name,
                        fork_model=target_model,
                        fork_version=target_version,
                        original_df=df,
                        hyperparams=hyperparams
                    )
        else:  # action == "version"
            # Only model name is needed (target_model already provided). Ignore fork_* if sent.
            if target_model:
                if not model_service.registry.get_model_info(target_model):
                    result = model_service.retrain(
                            action=action,
                            version_model=target_model,
                            original_df=df,
                            hyperparams=hyperparams
                        )
                else:
                    result = model_service.retrain(
                            action=action,
                            version_base_model=target_model,
                            original_df=df,
                            hyperparams=hyperparams
                        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return RetrainResponse(
        message=("Fork created" if action == "fork" else "New version created"),
        build_id=result["build_id"],
        status=result["status"],
        model_version=result["model_version"],
        metrics=result["metrics"],
    )