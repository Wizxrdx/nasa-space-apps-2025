def read_json(file_path):
    import json
    with open(file_path, 'r') as file:
        return json.load(file)

def write_json(file_path, data):
    import json
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)

def read_csv(file_path):
    import pandas as pd
    return pd.read_csv(file_path)

def write_csv(file_path, data):
    import pandas as pd
    data.to_csv(file_path, index=False)