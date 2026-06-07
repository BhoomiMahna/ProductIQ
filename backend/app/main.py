from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import api

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReviewIQ API", version="1.0.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to ReviewIQ API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

