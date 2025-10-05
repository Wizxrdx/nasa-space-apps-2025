class Config:
    def __init__(self):
        self.model_path = "path/to/your/model"
        self.artifact_store_path = "path/to/your/artifacts"
        self.logging_level = "INFO"
        self.api_version = "v1"
        self.retrain_data_path = "path/to/your/retrain/data"
        self.environment = "development"  # or "production"
    
    def get_model_path(self):
        return self.model_path
    
    def get_artifact_store_path(self):
        return self.artifact_store_path
    
    def get_logging_level(self):
        return self.logging_level
    
    def get_api_version(self):
        return self.api_version
    
    def get_retrain_data_path(self):
        return self.retrain_data_path
    
    def get_environment(self):
        return self.environment

config = Config()