# IELTS Couple App (Free Model First)

Personal-use IELTS learning system with:
- Web dashboard and progress tracking
- Core API with IELTS metrics + rubric workflow
- AI gateway for local Ollama + optional faster-whisper
- Worker queue (BullMQ + Redis) for async AI jobs

## Architecture

- `apps/web`: Next.js dashboard (Web + mobile-friendly)
- `apps/api`: NestJS API (`/dashboard`, `/plan`, `/attempts`, `/ai`, `/vocab`, `/coach`, `/content`)
- `apps/ai-gateway`: NestJS internal AI service (`/internal/ai/*`)
- `apps/worker`: BullMQ worker processing AI jobs
- `packages/shared`: Shared types + IELTS scoring + heuristic fallback
- `infra/docker-compose.yml`: Redis/Postgres/MinIO/Ollama local infra

## Implemented AI APIs

- `POST /ai/writing/evaluate`
- `POST /ai/speaking/transcribe`
- `POST /ai/speaking/evaluate`
- `GET /ai/jobs/:id`

These APIs enqueue jobs in Redis. Worker consumes jobs and calls `ai-gateway`.

## Free-model strategy

- Default provider: `local_ollama`
- Writing model auto-select:
- `>=8GB VRAM`: `qwen2.5 7B q4`
- `<8GB VRAM` or CPU: `qwen2.5 3B q4`
- Speaking transcription:
- Primary: `faster-whisper` (`small`, low-resource fallback to `base`)
- Fallback: lightweight transcript placeholder if model/runtime unavailable
- Speaking scoring:
- Rule-based baseline + LLM explanation

## Quick Start

1. Install dependencies at repo root.

```bash
pnpm install
```

2. Copy environment files.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/ai-gateway/.env.example apps/ai-gateway/.env
cp apps/worker/.env.example apps/worker/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Start infrastructure services.

```bash
docker compose -f infra/docker-compose.yml up -d
```

4. Pull local models in Ollama (optional but recommended).

```bash
ollama pull qwen2.5:3b-instruct-q4_K_M
ollama pull qwen2.5:7b-instruct-q4_K_M
```

5. Start app services (recommended local mode, no Redis worker required).

```bash
pnpm dev
```

Web: `http://127.0.0.1:3000`  
API docs: `http://127.0.0.1:3001/docs`

6. If you want the full queue mode (Redis + worker), use:

```bash
pnpm dev:queue
```

## Testing

```bash
pnpm test
pnpm typecheck
```

## Notes

- Current persistence for study progress is in-memory (fast MVP).  
- Queue jobs persist in Redis job state.  
- This repo is configured for private/personal use workflow first.
