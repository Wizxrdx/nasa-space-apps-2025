class ModelEntity:
    def __init__(self, model_id: str, model_name: str, version: str, parameters: dict):
        self.model_id = model_id
        self.model_name = model_name
        self.version = version
        self.parameters = parameters

class PredictionEntity:
    def __init__(self, input_data: dict, prediction: float, model_id: str):
        self.input_data = input_data
        self.prediction = prediction
        self.model_id = model_id

class RetrainEntity:
    def __init__(self, model_id: str, training_data: list, parameters: dict):
        self.model_id = model_id
        self.training_data = training_data
        self.parameters = parameters