import os

class ArtifactStore:
    def __init__(self, storage_path: str):
        self.storage_path = storage_path

    def save_model(self, model_name: str, model_data: bytes) -> None:
        model_path = f"{self.storage_path}/{model_name}"
        with open(model_path, "wb") as model_file:
            model_file.write(model_data)

    def load_model(self, model_name: str) -> bytes:
        model_path = f"{self.storage_path}/{model_name}"
        with open(model_path, "rb") as model_file:
            return model_file.read()

    def list_models(self) -> list:
        import os
        return os.listdir(self.storage_path)

    def delete_model(self, model_name: str) -> None:
        model_path = f"{self.storage_path}/{model_name}"
        os.remove(model_path)