import hashlib
from pathlib import Path
from typing import List, Tuple

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader,
)
from langchain_core.documents import Document


SUPPORTED_EXTENSIONS = {
    ".pdf": PyPDFLoader,
    ".txt": TextLoader,
    ".docx": Docx2txtLoader,
    ".md": TextLoader,  # treat markdown as plain text
}


class DocumentProcessor:
    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def load(self, file_path: str) -> List[Document]:
        ext = Path(file_path).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type: {ext}. Supported: {list(SUPPORTED_EXTENSIONS.keys())}"
            )
        loader_cls = SUPPORTED_EXTENSIONS[ext]
        loader = loader_cls(file_path)
        return loader.load()

    def process(self, file_path: str, original_filename: str) -> Tuple[List[Document], str]:
        raw_docs = self.load(file_path)
        chunks = self.splitter.split_documents(raw_docs)
        doc_id = self._generate_doc_id(file_path)

        for i, chunk in enumerate(chunks):
            chunk.metadata.update({
                "doc_id": doc_id,
                "source_file": original_filename,
                "chunk_index": i,
                "total_chunks": len(chunks),
            })

        return chunks, doc_id

    def _generate_doc_id(self, file_path: str) -> str:
        with open(file_path, "rb") as f:
            content_hash = hashlib.md5(f.read()).hexdigest()[:8]
        return f"{Path(file_path).stem}_{content_hash}"