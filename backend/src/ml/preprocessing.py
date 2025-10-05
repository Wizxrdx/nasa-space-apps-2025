from sklearn.preprocessing import StandardScaler
import pandas as pd

class DataPreprocessor:
    def __init__(self):
        self.scaler = StandardScaler()

    def fit(self, X):
        self.scaler.fit(X)

    def transform(self, X):
        return self.scaler.transform(X)

    def fit_transform(self, X):
        return self.scaler.fit_transform(X)

    def inverse_transform(self, X):
        return self.scaler.inverse_transform(X)

def preprocess_input_data(data):
    df = pd.DataFrame(data)
    # Add any additional preprocessing steps here
    return df