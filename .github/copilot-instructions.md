# Copilot Instructions for S+ Lab LLM Council

## Project Overview

S+ Lab LLM Council is a 3-stage deliberation system where multiple LLMs collaboratively answer user questions through parallel querying, anonymized peer review, and synthesis. The key innovation is preventing model bias through anonymized labels ("Response A", "Response B", etc.) during Stage 2 ranking.

## Architecture

**Backend (Python/FastAPI)** on port 8001:
- `backend/council.py` - Core 3-stage orchestration logic (Stage 1: parallel queries, Stage 2: anonymized rankings, Stage 3: chairman synthesis)
- `backend/openrouter.py` - OpenRouter API client with graceful degradation (continues if some models fail)
- `backend/storage.py` - JSON file persistence in `data/conversations/`
- `backend/config.py` - Model configuration and API settings

**Frontend (React/Vite)** on port 5173:
- `frontend/src/api.js` - API client with SSE streaming support
- `frontend/src/components/Stage*.jsx` - Tab views for each deliberation stage
- Stage 2 de-anonymization happens client-side for display transparency

## Critical Commands

```bash
# Backend - ALWAYS run from project root with module syntax
uv run python -m backend.main

# Frontend
cd frontend && npm run dev

# Or use the start script
./start.sh
```

## Key Conventions

### Backend Module Imports
Always use **relative imports** in backend modules:
```python
# Correct
from .config import COUNCIL_MODELS
from .openrouter import query_model

# Wrong - will break module resolution
from backend.config import COUNCIL_MODELS
```

### Port Configuration
Backend runs on **port 8001** (not 8000). If changing ports, update both:
- `backend/main.py` (uvicorn.run)
- `frontend/src/api.js` (API_BASE)

### Markdown Rendering
All ReactMarkdown components must use the `markdown-content` wrapper class defined in `index.css`:
```jsx
<div className="markdown-content">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

### Stage 2 Ranking Format
The ranking prompt enforces strict format for reliable parsing:
```
FINAL RANKING:
1. Response C
2. Response A
3. Response B
```
The parser in `council.py` (`parse_ranking_from_text()`) handles fallback extraction if models deviate.

### Error Handling
Backend uses graceful degradation - if some models fail, processing continues with successful responses. Never fail the entire request due to a single model failure.

### Metadata Persistence
Metadata (`label_to_model`, `aggregate_rankings`) is **NOT persisted** to JSON storage - it's only returned via API and stored in UI state for the current session.

## Data Flow

```
User Query → Stage 1 (parallel queries) → Stage 2 (anonymize + rank) 
→ Aggregate Rankings → Stage 3 (chairman synthesis) → SSE Stream to Frontend
```

## Adding New Models

Edit `backend/config.py`:
```python
COUNCIL_MODELS = ["openai/gpt-5.1", "anthropic/claude-sonnet-4.5", ...]
CHAIRMAN_MODEL = "google/gemini-3-pro-preview"
```

Models use OpenRouter identifiers. Test connectivity with `test_openrouter.py` before adding new models.

## Environment Setup

Requires `.env` file in project root:
```
OPENROUTER_API_KEY=sk-or-v1-...
```
