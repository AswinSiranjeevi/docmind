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

router = APIRouter()

_vector_store: VectorStore = None
_rag_chain: RAGChain = None
_processor: DocumentProcessor = None


def get_deps(settings: Settings = Depends(get_settings)):
    global _vector_store, _rag_chain, _processor
    if _vector_store is None:
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
    return _vector_store, _rag_chain, _processor, settings


class QueryRequest(BaseModel):
    question: str


@router.get("/health")
async def health():
    return {"status": "ok", "service": "DocMind RAG"}


@router.post("/upload")
async def upload(file: UploadFile = File(...), deps=Depends(get_deps)):
    vector_store, _, processor, settings = deps
    ext = Path(file.filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported type '{ext}'. Allowed: {list(SUPPORTED_EXTENSIONS.keys())}")

    os.makedirs(settings.upload_dir, exist_ok=True)
    file_path = os.path.join(settings.upload_dir, file.filename)

    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        chunks, doc_id = processor.process(file_path, file.filename)
        vector_store.add_documents(chunks)
    except Exception as e:
        os.remove(file_path)
        raise HTTPException(500, f"Processing failed: {str(e)}")

    return {
        "message": "Uploaded and indexed successfully",
        "doc_id": doc_id,
        "filename": file.filename,
        "chunks_created": len(chunks),
    }


@router.post("/query/stream")
async def query_stream(request: QueryRequest, deps=Depends(get_deps)):
    vector_store, rag_chain, _, _ = deps

    if vector_store.get_chunk_count() == 0:
        raise HTTPException(400, "No documents uploaded yet. Please upload a document first.")

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
async def list_documents(deps=Depends(get_deps)):
    vector_store, _, _, _ = deps
    docs = vector_store.list_documents()
    return {"documents": docs, "total": len(docs)}


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, deps=Depends(get_deps)):
    vector_store, _, _, _ = deps
    deleted = vector_store.delete_by_doc_id(doc_id)
    if deleted == 0:
        raise HTTPException(404, f"Document '{doc_id}' not found")
    return {"message": f"Deleted {deleted} chunks for '{doc_id}'"}


@router.get("/stats")
async def stats(deps=Depends(get_deps)):
    vector_store, _, _, _ = deps
    docs = vector_store.list_documents()
    return {"total_documents": len(docs), "total_chunks": vector_store.get_chunk_count()}
