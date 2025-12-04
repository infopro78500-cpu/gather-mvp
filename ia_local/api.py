# ia_local/api.py
from fastapi import FastAPI
import subprocess

app = FastAPI()

@app.get("/api/detect-duplicates")
def detect_duplicates():
    result = subprocess.run(
        ["python", "ia_local/main.py", "--encode", "--search", "--move", "--csv-export", "ia_local/data/doublons_detectés.csv"],
        capture_output=True,
        text=True
    )
    return {
        "stdout": result.stdout,
        "stderr": result.stderr,
        "returncode": result.returncode
    }
