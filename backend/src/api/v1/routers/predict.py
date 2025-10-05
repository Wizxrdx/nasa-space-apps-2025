import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.encoders import jsonable_encoder
from api.v1.schemas.predict import PredictResponse, SinglePredictBody, SinglePredictResponse
from api.dependencies import get_model_service
from utils.settings import COLUMNS, LABEL_MAP, _to_label

router = APIRouter()

@router.post("/", response_model=PredictResponse)
async def predict(
    file: UploadFile = File(..., description="CSV file with feature rows"),
    model: str = Query(..., description="Model name"),
    version: str | None = Query(None, description="Model version (optional)"),
    evaluate: bool = Query(False, description="Whether to include evaluation metrics (requires 'label' column)"),
    model_service = Depends(get_model_service),
):
    if file.content_type not in ("text/csv", "application/vnd.ms-excel", "application/csv"):
        raise HTTPException(status_code=415, detail="Unsupported media type. Upload a CSV file.")
    try:
        # Read all bytes (or switch to chunked if files are huge)
        file.file.seek(0)
        df = pd.read_csv(file.file, sep=None, engine="python")
        df.fillna(np.nan, inplace=True)

        if df.empty:
            raise HTTPException(status_code=400, detail="CSV is empty or has no data rows.")
        
        if evaluate:
            if "label" not in df.columns:
                raise HTTPException(status_code=400, detail="Evaluation requested but 'label' column is missing.")
        
        # Fail on duplicate columns
        if df.columns.duplicated().any():
            dups = df.columns[df.columns.duplicated()].tolist()
            raise HTTPException(status_code=400, detail=f"Duplicate columns found: {dups}")
        
        # Validate required and unexpected columns
        required = COLUMNS
        missing = [c for c in required if c not in df.columns]
        unexpected = [c for c in df.columns if c not in required]
        # Allow label column only for evaluation
        if "label" in unexpected:
            unexpected.remove("label")
        if missing:
            raise HTTPException(status_code=400, detail=f"Missing required feature columns: {missing}")
        if unexpected:
            raise HTTPException(status_code=400, detail=f"Unexpected columns present: {unexpected}. Allowed columns: {required}")

        # Use all required features; exclude label (if present) for prediction
        features_df = df[required]
        preds_num = model_service.predict(features_df, model_name=model, version=version)
        if len(preds_num) != len(df):
            raise HTTPException(status_code=500, detail="Prediction length mismatch.")

        preds = [_to_label(v) for v in preds_num]

        if evaluate:
            from sklearn.metrics import classification_report

            # Normalize ground-truth labels to the same string names
            label_series = df["label"].copy()
            num = pd.to_numeric(label_series, errors="coerce")
            is_num = num.notna()
            label_series = label_series.astype(str)
            # Map numeric gt -> names; fallback to numeric string if unknown
            label_series.loc[is_num] = num[is_num].astype(int).map(LABEL_MAP).fillna(
                num[is_num].astype(int).astype(str)
            )
            true_labels = label_series.tolist()

            label_order = list(LABEL_MAP.values())
            report = classification_report(
                true_labels, preds, labels=label_order, output_dict=True, zero_division=0
            )
            return PredictResponse(prediction=preds, rows=len(preds), evaluation=report)

        return PredictResponse(prediction=preds, rows=len(preds))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/single/", response_model=SinglePredictResponse)
async def predict_single(
    payload: SinglePredictBody,
    model: str = Query(..., description="Model name"),
    version: str | None = Query(None, description="Model version (optional)"),
    model_service = Depends(get_model_service),
):
    try:
        data = payload.data or {}

        unexpected = [k for k in data.keys() if k not in COLUMNS]
        if unexpected:
            raise HTTPException(
                status_code=400,
                detail=f"Unexpected columns present: {unexpected}. Allowed columns: {COLUMNS}"
            )
        if len(data) < 5:
            raise HTTPException(status_code=400, detail="Provide at least 5 feature values.")

        row = {c: data.get(c, np.nan) for c in COLUMNS}
        features_df = pd.DataFrame([row], columns=COLUMNS)

        preds_num = model_service.predict(features_df, model_name=model, version=version)
        shap_values = model_service.shap(features_df, model_name=model, version=version)
        if len(preds_num) != 1:
            raise HTTPException(status_code=500, detail="Prediction length mismatch.")

        pred = _to_label(preds_num[0])

        return SinglePredictResponse(
            prediction=pred,
            shap_values=jsonable_encoder(shap_values)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))