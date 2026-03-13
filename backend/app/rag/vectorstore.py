import os
from typing import List, Tuple
from langchain.schema import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma


class VectorStore:
    def __init__(self, persist_dir: str, embedding_model: str):
        self.persist_dir = persist_dir
        os.makedirs(persist_dir, exist_ok=True)

        # Free local embeddings — no API key, runs on CPU
        self.embeddings = HuggingFaceEmbeddings(
            model_name=embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )

        self.db = Chroma(
            persist_directory=persist_dir,
            embedding_function=self.embeddings,
            collection_name="docmind",
        )

    def add_documents(self, documents: List[Document]) -> List[str]:
        return self.db.add_documents(documents)

    def similarity_search(self, query: str, k: int = 5) -> List[Tuple[Document, float]]:
        return self.db.similarity_search_with_relevance_scores(query, k=k)

    def delete_by_doc_id(self, doc_id: str) -> int:
        collection = self.db._collection
        results = collection.get(where={"doc_id": doc_id})
        if results["ids"]:
            collection.delete(ids=results["ids"])
            return len(results["ids"])
        return 0

    def list_documents(self) -> List[dict]:
        collection = self.db._collection
        results = collection.get(include=["metadatas"])
        seen = {}
        for meta in results["metadatas"]:
            doc_id = meta.get("doc_id", "unknown")
            if doc_id not in seen:
                seen[doc_id] = {
                    "doc_id": doc_id,
                    "source_file": meta.get("source_file", "unknown"),
                    "total_chunks": meta.get("total_chunks", 0),
                }
        return list(seen.values())

    def get_chunk_count(self) -> int:
        return self.db._collection.count()
