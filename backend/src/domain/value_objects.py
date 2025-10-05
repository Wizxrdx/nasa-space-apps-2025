class ValueObject:
    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        if not isinstance(other, ValueObject):
            return NotImplemented
        return self.value == other.value

    def __repr__(self):
        return f"ValueObject({self.value})"


class ModelPath(ValueObject):
    pass


class DataPath(ValueObject):
    pass


class PredictionResult(ValueObject):
    pass


class TrainingData(ValueObject):
    pass


class ModelParameters(ValueObject):
    pass