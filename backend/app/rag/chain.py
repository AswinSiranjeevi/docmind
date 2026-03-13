from typing import AsyncGenerator, List, Tuple
from langchain.schema import Document
from langchain_groq import ChatGroq
from langchain.prompts import ChatPromptTemplate
from langchain.schema.output_parser import StrOutputParser

from app.rag.vectorstore import VectorStore


SYSTEM_PROMPT = """You are an expert document analyst. Answer questions based ONLY on the provided context.

Rules:
- Be precise and cite specific parts of the documents
- If the answer is not in the context, say "I couldn't find this in the uploaded documents."
- Format responses clearly with markdown when helpful
- Always be factual — never hallucinate information

Context:
{context}
"""


class RAGChain:
    def __init__(self, vector_store: VectorStore, llm_model: str, groq_api_key: str, retrieval_k: int = 5):
        self.vector_store = vector_store
        self.retrieval_k = retrieval_k

        # Free Llama 3.3 70B via Groq
        self.llm = ChatGroq(
            model=llm_model,
            groq_api_key=groq_api_key,
            streaming=True,
            temperature=0.1,
        )

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            ("human", "{question}"),
        ])

    def _format_context(self, docs_with_scores: List[Tuple[Document, float]]) -> str:
        parts = []
        for i, (doc, score) in enumerate(docs_with_scores):
            source = doc.metadata.get("source_file", "unknown")
            page = doc.metadata.get("page", "")
            page_info = f", page {page + 1}" if page != "" else ""
            parts.append(
                f"[Source {i+1}: {source}{page_info} | Relevance: {score:.2f}]\n{doc.page_content}"
            )
        return "\n\n---\n\n".join(parts)

    def retrieve(self, query: str) -> Tuple[List[Tuple[Document, float]], str]:
        docs_with_scores = self.vector_store.similarity_search(query, k=self.retrieval_k)
        context = self._format_context(docs_with_scores)
        return docs_with_scores, context

    async def stream(self, query: str) -> AsyncGenerator[str, None]:
        _, context = self.retrieve(query)
        chain = self.prompt | self.llm | StrOutputParser()
        async for chunk in chain.astream({"context": context, "question": query}):
            yield chunk

    def get_sources(self, query: str) -> List[dict]:
        docs_with_scores, _ = self.retrieve(query)
        sources = []
        seen = set()
        for doc, score in docs_with_scores:
            key = (doc.metadata.get("source_file"), doc.metadata.get("chunk_index"))
            if key not in seen:
                seen.add(key)
                sources.append({
                    "source_file": doc.metadata.get("source_file", "unknown"),
                    "chunk_index": doc.metadata.get("chunk_index", 0),
                    "relevance_score": round(score, 3),
                    "excerpt": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                    "page": doc.metadata.get("page", None),
                })
        return sources
