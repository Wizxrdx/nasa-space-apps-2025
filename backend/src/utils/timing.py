from time import time, perf_counter

class Timer:
    def __init__(self):
        self.start_time = None
        self.end_time = None

    def start(self):
        self.start_time = perf_counter()

    def stop(self):
        self.end_time = perf_counter()
        return self.elapsed_time()

    def elapsed_time(self):
        if self.start_time is None or self.end_time is None:
            raise ValueError("Timer has not been started or stopped.")
        return self.end_time - self.start_time

def time_function(func):
    def wrapper(*args, **kwargs):
        timer = Timer()
        timer.start()
        result = func(*args, **kwargs)
        elapsed = timer.stop()
        print(f"Function '{func.__name__}' executed in {elapsed:.4f} seconds.")
        return result
    return wrapper