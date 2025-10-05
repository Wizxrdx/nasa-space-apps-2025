import shap
from typing import Any, Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from xgboost import XGBClassifier
from sklearn.utils import class_weight
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


class Trainer:
    def train(self, df: pd.DataFrame, **kwargs) -> Dict[str, Any]:
        model = XGBClassifier(
            objective='multi:softprob',
            num_class=3,
            random_state=11111,
            **kwargs
        )

        y = df["label"]
        X = df.drop(columns=["label"])

        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(X, y, train_size=0.7, shuffle=True, random_state=11111)

        # Scale X
        scaler = StandardScaler()
        scaler.fit(X_train.values)
        X_train = pd.DataFrame(scaler.transform(X_train.values), index=X_train.index, columns=X_train.columns)
        X_test = pd.DataFrame(scaler.transform(X_test.values), index=X_test.index, columns=X_test.columns)
        classes_weights = class_weight.compute_sample_weight(
            class_weight='balanced',
            y=y_train
        )

        model.fit(X_train, y_train, sample_weight=classes_weights)
        return (model, scaler, X_test, y_test)
    
    def eval(self, model: Any, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
        pred = model.predict(X_test)

        acc = accuracy_score(y_test, pred)
        prec = precision_score(y_test, pred, average='weighted', zero_division=0)
        rec = recall_score(y_test, pred, average='weighted', zero_division=0)
        f1 = f1_score(y_test, pred, average='weighted', zero_division=0)
        macro_f1 = f1_score(y_test, pred, average='macro', zero_division=0)
        return {
            "accuracy": acc,
            "precision": prec,
            "recall": rec,
            "f1": f1,
            "macro_f1": macro_f1
        }

    def train_and_eval(self, df: pd.DataFrame, **kwargs) -> Tuple[Dict[str, Any], Dict[str, float]]:
        model, scaler, X_test, y_test = self.train(df, **kwargs)

        # Create pipeline
        pipeline = Pipeline([
            ('scaler', scaler),   # will scale features
            ('xgb', model)        # your trained XGB model
        ])

        # Save pipeline to a single file
        return pipeline, self.eval(pipeline, X_test, y_test)
    
    def shap(self, model: Any, df: pd.DataFrame) -> Dict[str, Any]:
        try:
            # Expecting a Pipeline([('scaler', ...), ('xgb', ...)])
            if isinstance(model, Pipeline) and "xgb" in model.named_steps and "scaler" in model.named_steps:
                xgb = model.named_steps["xgb"]
                scaler = model.named_steps["scaler"]
                X_scaled = pd.DataFrame(
                    scaler.transform(df),
                    columns=df.columns,
                    index=df.index
                )
            else:
                # Fallback: assume bare estimator and df already prepared
                xgb = model
                X_scaled = df

            # Single row
            x_row = X_scaled.iloc[[0]]

            # Pick class to explain (predicted class)
            if hasattr(xgb, "predict_proba"):
                proba = xgb.predict_proba(x_row)[0]
                class_idx = int(np.argmax(proba))
            else:
                class_idx = 0

            explainer = shap.TreeExplainer(xgb)
            ex = explainer(x_row)

            values = ex.values
            base_values = ex.base_values

            # Handle shapes: (1, n_features, n_classes) vs (1, n_features)
            if values.ndim == 3:
                vec = values[0, :, class_idx]
                base = float(base_values[0, class_idx]) if np.ndim(base_values) == 2 else float(base_values[class_idx])
            elif values.ndim == 2:
                vec = values[0, :]
                base = float(base_values[0]) if np.ndim(base_values) > 0 else float(base_values)
            else:
                vec = values
                base = float(base_values)

            per_feature = {feature: float(v) for feature, v in zip(X_scaled.columns, vec)}

            return {
                "class_index": class_idx,
                "base_value": base,
                "per_feature": per_feature,
            }
        except Exception as e:
            raise RuntimeError(f"Failed to compute SHAP values: {e}")