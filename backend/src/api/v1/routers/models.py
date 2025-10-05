from __future__ import annotations
import os
from typing import List
from fastapi import APIRouter, HTTPException, Depends

from api.dependencies import get_model_service

router = APIRouter()

@router.get("/", summary="List all model families")
def list_models(model_service = Depends(get_model_service)):
    models: List[str] = model_service.get_models()
    return {"models": models}

@router.get("/all", summary="List all base models and trained models (including versions)")
def list_all_models(model_service = Depends(get_model_service)):
    list_base_models = model_service.get_base_models()
    models = model_service.get_models()
    all_models = {}
    all_models["base"] = list_base_models
    for model in models:
        all_models[model] = model_service.list_versions(model)
    return {"all_models": all_models}

@router.get("/base", summary="List base (unversioned) models")
def list_base_models(model_service = Depends(get_model_service)):
    models: List[str] = model_service.get_base_models()
    return {"base_models": models}

@router.get("/{model_name}/versions", summary="List versions for a model")
def list_model_versions(model_name: str, model_service = Depends(get_model_service)):
    models = set(model_service.get_models())
    if model_name not in models:
        raise HTTPException(status_code=404, detail=f"Model '{model_name}' not found.")
    versions: List[str] = model_service.list_versions(model_name)
    return {
        "model": model_name,
        "parent": model_service.get_parent_model(model_name),
        "versions": versions,
        "latest": versions[-1] if versions else None,
    }