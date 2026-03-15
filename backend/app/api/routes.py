import os
import shutil
import json
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import get_settings, Settings
from app.rag.processor import DocumentProcessor, SUPPORTED_EXTENSIONS
from app.rag.vectorstore import VectorStore
from app.rag.chain import RAGChain
from app.auth import get_current_user, create_access_token

router = APIRouter()

_vector_store: VectorStore = None
_rag_chain: RAGChain = None
_processor: DocumentProcessor = None

# Allowed MIME type signatures (magic bytes)
ALLOWED_MIME_PREFIXES = {
    ".pdf": b"%PDF",
    ".txt": None,   # plain text - no magic bytes
    ".md":  None,
    ".docx": b"PK",  # ZIP-based format
}

MAX_FILE_SIZE_MB = 20
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def validate_file_content(file_path: str, ext: str) -> None:
    """Validate file content matches its extension using magic bytes."""
    expected = ALLOWED_MIME_PREFIXES.get(ext)
    if expected is None:
        return  # txt/md - just check it's readable text
    with open(file_path, "rb") as f:
        header = f.read(8)
    if not header.startswith(expected):
        raise HTTPException(
            status_code=400,
            detail=f"File content does not match extension '{ext}'. Upload rejected."
        )


def get_dependencies(settings: Settings = Depends(get_settings)):
    global _vector_store, _rag_chain, _processor
    if _vector_store is None:
        try:
            _vector_store = VectorStore(
                persist_dir=settings.chroma_persist_dir,
                embedding_model=settings.embedding_model,
            )
            _rag_chain = RAGChain(
                vector_store=_vector_store,
                llm_model=settings.llm_model,
                groq_api_key=settings.groq_api_key,
                retrieval_k=settings.retrieval_k,
            )
            _processor = DocumentProcessor(
                chunk_size=settings.chunk_size,
                chunk_overlap=settings.chunk_overlap,
            )
        except Exception as e:
            _vector_store = None
            _rag_chain = None
            _processor = None
            raise HTTPException(
                status_code=500,
                detail=f"Initialization failed: {str(e)}. Make sure GROQ_API_KEY is set in your .env file."
            )
    return _vector_store, _rag_chain, _processor, settings


class QueryRequest(BaseModel):
    question: str

class LoginRequest(BaseModel):
    api_key: str


# ── Auth ──────────────────────────────────────────────────────────────────────

@router.post("/auth/token")
async def login(request: LoginRequest, settings: Settings = Depends(get_settings)):
    """Exchange API key for JWT token."""
    if request.api_key != settings.app_api_key:
        raise HTTPException(status_code=401, detail="Invalid API key.")
    token = create_access_token(user_id="user")
    return {"access_token": token, "token_type": "bearer", "expires_in": "24h"}


# ── Health (public) ───────────────────────────────────────────────────────────

@router.get("/health")
async def health():
    return {"status": "ok", "service": "DocMind RAG"}


# ── Protected endpoints ───────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    deps=Depends(get_dependencies),
    user_id: str = Depends(get_current_user),
):
    vector_store, _, processor, settings = deps
    ext = Path(file.filename).suffix.lower()

    # Extension check
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Allowed: {list(SUPPORTED_EXTENSIONS.keys())}",
        )

    # File size check
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB."
        )

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, file.filename)

    with open(file_path, "wb") as f:
        f.write(contents)

    # MIME type / magic bytes validation
    try:
        validate_file_content(file_path, ext)
    except HTTPException:
        os.remove(file_path)
        raise

    try:
        chunks, doc_id = processor.process(file_path, file.filename)
        vector_store.add_documents(chunks)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    return {
        "message": "Document uploaded and indexed successfully",
        "doc_id": doc_id,
        "filename": file.filename,
        "chunks_created": len(chunks),
    }


@router.post("/query/stream")
async def query_stream(
    request: QueryRequest,
    deps=Depends(get_dependencies),
    user_id: str = Depends(get_current_user),
):
    vector_store, rag_chain, _, _ = deps

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    if len(request.question) > 2000:
        raise HTTPException(status_code=400, detail="Question too long. Max 2000 characters.")

    if vector_store.get_chunk_count() == 0:
        raise HTTPException(status_code=400, detail="No documents uploaded yet.")

    sources = rag_chain.get_sources(request.question)

    async def event_stream():
        yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"
        async for chunk in rag_chain.stream(request.question):
            yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/documents")
async def list_documents(
    deps=Depends(get_dependencies),
    user_id: str = Depends(get_current_user),
):
    vector_store, _, _, _ = deps
    docs = vector_store.list_documents()
    return {"documents": docs, "total": len(docs)}


@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    deps=Depends(get_dependencies),
    user_id: str = Depends(get_current_user),
):
    vector_store, _, _, _ = deps
    deleted_count = vector_store.delete_by_doc_id(doc_id)
    if deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found")
    return {"message": f"Deleted {deleted_count} chunks for '{doc_id}'"}


@router.get("/stats")
async def get_stats(
    deps=Depends(get_dependencies),
    user_id: str = Depends(get_current_user),
):
    vector_store, _, _, _ = deps
    docs = vector_store.list_documents()
    return {"total_documents": len(docs), "total_chunks": vector_store.get_chunk_count()}