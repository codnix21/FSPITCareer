from fastapi import FastAPI
from pydantic import BaseModel, Field
import hashlib
import math
import re

app = FastAPI(
    title="FSP IT Career ML Service",
    description="Семантический matching. Mock embeddings готовы к замене на sentence-transformers + pgvector.",
    version="1.0.0",
)


class SemanticRequest(BaseModel):
    candidate_id: str
    vacancy_id: str


class SemanticResponse(BaseModel):
    similarity: float
    source: str = "mock"


class TextSemanticRequest(BaseModel):
    candidate_text: str = Field(..., min_length=1)
    vacancy_text: str = Field(..., min_length=1)


def _tokenize(text: str, dim: int = 32) -> list[float]:
    """Lightweight bag-of-hash embedding (stand-in for sentence-transformers)."""
    tokens = re.findall(r"[a-zA-Zа-яА-Я0-9+#.]{2,}", text.lower())
    vec = [0.0] * dim
    if not tokens:
        return vec
    for t in tokens:
        h = int(hashlib.md5(t.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if (h // dim) % 2 == 0 else -1.0
        vec[idx] += sign
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


@app.get("/health")
def health():
    return {"status": "ok", "service": "ml-service", "mode": "hash_embedding_mock"}


@app.post("/api/v1/matching/semantic", response_model=SemanticResponse)
def semantic_match(body: SemanticRequest):
    digest = hashlib.sha256(f"{body.candidate_id}:{body.vacancy_id}".encode()).hexdigest()
    raw = int(digest[:8], 16) / 0xFFFFFFFF
    similarity = round(0.55 + raw * 0.43, 4)
    return SemanticResponse(similarity=similarity, source="deterministic_id_mock")


@app.post("/api/v1/matching/semantic-text", response_model=SemanticResponse)
def semantic_text(body: TextSemanticRequest):
    a = _tokenize(body.candidate_text)
    b = _tokenize(body.vacancy_text)
    sim = _cosine(a, b)
    # Map cosine [-1,1] → [0,1]
    similarity = round((sim + 1) / 2, 4)
    return SemanticResponse(similarity=similarity, source="hash_embedding_mock")
