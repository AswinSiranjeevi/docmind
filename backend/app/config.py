rom pydantic_settings import BaseSettings
from functools import lru_cache
 
 
class Settings(BaseSettings):
    groq_api_key: str
    chroma_persist_dir: str = "./chroma_db"
    upload_dir: str = "./uploads"
    embedding_model: str = "all-MiniLM-L6-v2"   # free local HuggingFace model
    llm_model: str = "llama-3.3-70b-versatile"   # Groq's best free model
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retrieval_k: int = 5
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
 
    class Config:
        env_file = ".env"
 
 
@lru_cache()
def get_settings() -> Settings:
    return Settings()
 
