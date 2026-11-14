Why Docker was needed for Chroma
WSL 2 requirement
Initial wsl --status / wsl --version problems
WSL installation getting stuck at 0.0%
--web-download attempt
C: drive running out of space
Moving Downloads to D:
Confirming the Downloads folder was actually relocated
The WSL installation failure caused by insufficient C: space
Restart/retry
Installing Ubuntu under WSL 2
Verifying wsl -l -v
Installing/updating Docker
docker --version
docker info
docker run hello-world
Understanding docker ps -a
Understanding docker system df
Final working architecture
Why we're using MySQL + Chroma, not PostgreSQL + pgvector
How Docker fits into the Chroma portion of our architecture





# Docker + WSL + Chroma Setup

> [!important]
> This note documents the Docker + WSL setup required to run Chroma for Nexus AI.

## Related Notes

- [[01 Architecture]]
- [[04 Memory]]
- [[09 Embeddings]]
- [[10 Vector Databases]]
- [[11 RAG]]
- [[08 Future Roadmap]]

---

## Docker → Chroma Connection

[[09 Embeddings]]
        ↓
[[10 Vector Databases]]
        ↓
Docker
        ↓
Chroma
        ↓
[[11 RAG]]

### Why this connection exists

[[09 Embeddings]] explains how text becomes vectors.

[[10 Vector Databases]] explains how those vectors are stored and searched.

Docker provides the environment in which we run Chroma.

[[11 RAG]] uses the retrieved information to provide relevant context to the LLM.

---

## Nexus AI Memory Graph

```text
[[04 Memory]]
      │
      ▼
[[09 Embeddings]]
      │
      ▼
[[10 Vector Databases]]
      │
      ├── Docker
      │     │
      │     ▼
      │   Chroma
      │
      ▼
Semantic Search
      │
      ▼
[[11 RAG]]
      │
      ▼
Agentic RAG




                 [[04 Memory]]
                      │
             ┌────────┴────────┐
             ▼                 ▼
          MySQL              Chroma
             │                 │
      Structured Data      Vector Search
             │                 │
             │           [[09 Embeddings]]
             │                 │
             └────────┬────────┘
                      ▼
                 Relevant Context
                      │
                      ▼
                  [[11 RAG]]




                               [[01 Architecture]]
                      │
                      ▼
                [[02 Agent Loop]]
                      │
                      ▼
                 [[03 Tool Calling]]
                      │
                      ▼
                  [[04 Memory]]
                      │
                      ▼
                [[09 Embeddings]]
                      │
                      ▼
             [[10 Vector Databases]]
                   /       \
                  /         \
             Docker        Chroma
                  \         /
                   \       /
                    ▼     ▼
                    [[11 RAG]]
                       │
                       ▼
                  Agentic RAG