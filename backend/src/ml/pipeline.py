from typing import Any, Dict
from sklearn.pipeline import Pipeline as SklearnPipeline

class DataPipeline:
    def __init__(self, preprocessing_steps: Any, model: Any):
        self.pipeline = SklearnPipeline(steps=preprocessing_steps + [('model', model)])

    def predict(self, data: Dict[str, Any]) -> Any:
        return self.pipeline.predict(data)

    def retrain(self, X: Any, y: Any) -> None:
        self.pipeline.fit(X, y)