# Inkwell: SDE Intern Interview Preparation

This guide is grounded in the repository as inspected on 2026-10-22. It distinguishes **implemented facts**, **repository inconsistencies/bugs**, and **proposed improvements**. The codebase contains no verified throughput, latency, uptime, or load-test results; do not claim them in an interview. No resume was supplied, so resume claims cannot be verified.

The requested material is split into focused files so the 100-question bank and technology drills remain navigable:

See the [preparation folder index](interview-preparation/README.md) for the section map.

1. [Project overview and architecture](interview-preparation/01-overview-architecture.md)
2. [Technology stack and interview drills](interview-preparation/02-technology-deep-dive.md)
3. [Codebase walkthrough, backend, and database](interview-preparation/03-code-backend-database.md)
4. [Scalability, security, and performance](interview-preparation/04-scale-security-performance.md)
5. [Failure scenarios and design decisions](interview-preparation/05-failures-and-decisions.md)
6. [100-question project-specific interview bank](interview-preparation/06-question-bank-100.md)
7. [Mock interviews, final revision, demo, and claim verification](interview-preparation/07-mock-and-revision.md)
8. [Per-technology replacement and scale crosswalk](interview-preparation/08-technology-crosswalk.md)

The repository includes React 18/Vite frontend code; Node.js/Express/Mongoose backend code; MongoDB; JWT/bcrypt authentication; Socket.IO poll events; optional Groq chat completions through the OpenAI SDK; Docker/Compose; Kubernetes/EKS manifests; Terraform; and an EC2/NGINX/PM2 deployment script. Exact package evidence is in `frontend/package.json` and `backend/package.json`.

## Fast Facts To Defend

- Core value: structured authoring and flexible reading modes for knowledge-sharing posts, with quizzes, polls, comments, follows, bookmarks, and optional AI writing/summary tools.
- Main persistence model: a `Post` document with embedded typed blocks and selected references to `User`, `Topic`, and response posts. Quiz responses are separate documents with a unique `(postId, blockId, userId)` index.
- Key publish flow: `WritePage.save` → Axios `postsAPI.create/update` → authenticated Express route → Mongoose save → response; published posts trigger `aiService.generatePostMeta` without waiting for it.
- Key read flow: `GET /api/v1/posts/:slug` loads a published post, increments `stats.views`, shapes quick/exam/deep content, and removes quiz `correctIndex` from deep-mode blocks.
- AI provider reality: `aiService.js` initializes the OpenAI SDK with `baseURL` for Groq, using `GROQ_API_KEY` and `GROQ_MODEL` (default `openai/gpt-oss-20b`). README wording naming GPT-4o is stale.
- Realtime reality: REST persists poll votes; Socket.IO broadcasts `poll-update` to `post:<id>` rooms. Comments use REST, not realtime broadcasts.
- Known significant risk: `BlockRenderer.jsx` inserts author-controlled HTML with `dangerouslySetInnerHTML` and executes runnable code with `new Function` in the reader page context. These require remediation before a public deployment.
- Other verified defects include missing imports/definitions in the `/ai/eli5` `postId` branch, a search query on a `visibility` field absent from the Post schema, and a Vite dev setup with no configured API proxy.
- There are no test/spec files or package test scripts in the repository audit. This is not proof that no manual testing occurred; it means automated test coverage is not evidenced in the repo.

## Use This In An Interview

Lead with what is implemented. Be candid about what is not production-grade. Phrase architectural intent as “I chose this because…” only when you personally made the decision; otherwise say, “The implementation uses X; a reasonable rationale is Y, and the trade-off is Z.” Never present the proposed queue, Redis, sanitization, cursor pagination, monitoring, or database changes in this guide as already shipped.
