from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api.routes import router

settings = get_settings()

app = FastAPI(
    title="DocMind — RAG Document Q&A",
    description="Upload documents and ask questions using Llama 3.3 70B + ChromaDB",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {"name": "DocMind", "version": "1.0.0", "docs": "/docs"}
