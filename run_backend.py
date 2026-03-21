"""Wrapper per avviare il backend NetHelper dalla root del progetto."""
import os
import sys

# Aggiungi backend/ al PYTHONPATH e spostati in quella directory
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
os.chdir(backend_dir)
sys.path.insert(0, backend_dir)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=False,
    )
