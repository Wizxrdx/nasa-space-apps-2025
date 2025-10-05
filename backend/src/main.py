from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.routers import predict, retrain, builds, models

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router, prefix="/api/v1/predict", tags=["predict"])
app.include_router(retrain.router, prefix="/api/v1/retrain", tags=["retrain"])
app.include_router(builds.router, prefix="/api/v1/builds", tags=["builds"])
app.include_router(models.router, prefix="/api/v1/models", tags=["models"])

@app.get("/")
def read_root():
    return {"message": "Welcome to the Machine Learning API"}