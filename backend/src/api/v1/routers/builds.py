from fastapi import APIRouter, Depends, HTTPException, Query
from api.dependencies import get_model_service

router = APIRouter()

@router.get("/")
async def list_builds(limit: int = Query(50, ge=1, le=500), model_service = Depends(get_model_service)):
    try:
        return model_service.list_builds(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{build_id}")
async def get_build(build_id: str, model_service = Depends(get_model_service)):
    try:
        rec = model_service.get_build(build_id)
        if not rec:
            raise HTTPException(status_code=404, detail="Build not found")
        return rec
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))