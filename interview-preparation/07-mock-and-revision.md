# Parts 13–15: Mock Interview And Final Revision

## Part 13: Resume Claim Verification

No resume was supplied, so individual resume bullets cannot be classified. Use this evidence matrix before claiming each feature:

| Claim | Repository evidence | Safe wording / caveat |
|---|---|---|
| “Built an AI-powered publishing platform” | AI service and API routes exist; provider optional; heuristics fallback; UI wires some but not all AI functions. | Say “implemented optional AI-backed suggestions/metadata with fallbacks” and name which flow you personally built. |
| “Used GPT-4o” | Not supported by current code configuration. Service uses Groq-compatible base URL and defaults to `openai/gpt-oss-20b`. | Do not claim GPT-4o unless a separate deployed configuration and evidence establishes it. |
| “Real-time comments” | Not supported; comments use REST. Socket emits poll updates. | Say “real-time poll update notifications.” |
| “Sandboxed code execution” | Not supported; `new Function` runs code in the reader page. | Do not call it sandboxed; acknowledge it should be disabled/isolated. |
| “Multi-language code runner” | Not supported; language is a label and JS `new Function` executes source. | Say “client-side runnable JavaScript prototype” only if accurate, and flag security limitations. |
| “Rich text editor / TipTap editor” | TipTap packages are declared, but inspected WritePage uses textareas and block-specific controls. | Describe typed block editor; do not say TipTap is integrated without separate code evidence. |
| “Search across posts/users/topics” | Search route exists; posts predicate uses `visibility` absent from schema, so post search likely fails. | State implemented search endpoints with known post-filter defect until fixed and tested. |
| “High availability on EKS” | Multiple frontend/backend replicas exist; bundled Mongo is one replica; no HPA/socket adapter/HA database evidenced. | Say “EKS deployment manifests with two frontend/backend replicas,” not end-to-end HA. |
| “Scales to X users / X requests per second” | No benchmark or load-test evidence found. | Remove or label as a target unless measured reproducibly. |
| “Automated tests” | No test/spec files or test scripts found in package manifests. | Do not claim automated coverage unless tests exist elsewhere and can be shown. |
| “Deletes posts permanently” | Route archives by changing status. | Say “soft-archives posts.” |
| “Uses Redis caching/queues” | No Redis integration or durable queue found. | Present Redis/queue only as proposed architecture. |

Classify each personal contribution separately from repository capability. The code proves what exists in the checked-in project, not who authored it.

## Part 14: Mock Technical Interview

### Round 1 — Project Fundamentals (30 minutes)

**Suggested pacing:** 3 minutes intro; 7 minutes architecture; 8 minutes feature flow; 6 minutes data model; 6 minutes decisions and questions.

1. **Interviewer:** Give me a two-minute project overview. **Strong answer:** Use the five-minute explanation in [Part 1](01-overview-architecture.md#five-minute-explanation), condensed to product, stack, publish/read flow, and one honest limitation. **Follow-up:** What did you personally implement? **Evaluation:** Ownership and clarity. **Weak answer:** Listing every library without the problem or your contribution.
2. **Interviewer:** Walk through publishing. **Strong answer:** Editor state → Axios → auth → `Post.create` → response → non-awaited AI metadata. **Follow-up:** What if the provider is down? **Evaluation:** Data flow and failure boundary. **Weak answer:** “The AI endpoint always returns a summary.”
3. **Interviewer:** Why MongoDB? **Strong answer:** Post-centric embedded blocks and reads, with a clear caveat around hot aggregates and cross-document integrity. **Follow-up:** What would make PostgreSQL better? **Evaluation:** Workload-driven trade-offs. **Weak answer:** “NoSQL is more scalable.”
4. **Interviewer:** How does authentication work? **Strong answer:** bcrypt hash at save, JWT user ID claim, token verification, user lookup, route ownership checks. **Follow-up:** Where is the token stored and what risk does that create? **Evaluation:** Identity/security understanding. **Weak answer:** “The frontend route protects the API.”
5. **Interviewer:** What are the modes? **Strong answer:** One post, response shaping; deep quiz answer redaction; quick/exam metadata dependency. **Follow-up:** What if metadata is pending? **Evaluation:** Product/data consistency. **Weak answer:** Claiming three separate databases or generated views.

**What the interviewer evaluates:** precise explanations, clear boundary between shipped and proposed, and honest handling of unknowns.

### Round 2 — Deep Technical Discussion (45 minutes)

**Suggested pacing:** 10 minutes code paths; 10 database/concurrency; 10 security; 8 debugging; 7 scaling.

1. **Interviewer:** A poll gets incorrect totals under concurrency. Diagnose it. **Strong answer:** The route checks `votedUsers` then mutates/saves a whole document; concurrent requests can both pass. Validate option index and use atomic uniqueness or vote records. **Follow-up:** How test? Run parallel requests against Mongo and assert invariant. **Evaluation:** Race reasoning. **Weak answer:** “Add a lock in React.”
2. **Interviewer:** Explain the quiz write consistency problem. **Strong answer:** `QuizResponse.create` and post aggregate save are separate writes; failure between them drifts counts. Use transaction or rebuildable aggregate. **Follow-up:** Why keep count embedded? **Evaluation:** source of truth/materialized view distinction. **Weak answer:** “Mongo guarantees the whole route is atomic.”
3. **Interviewer:** Would you deploy runnable code? **Strong answer:** Not in same-origin `new Function`; it is not sandboxed and can access the page context. Remove it or isolate on a separate origin with strict sandbox and resource limits. **Follow-up:** Does CSP alone fix it? **Evaluation:** Security-first judgment. **Weak answer:** “Only trusted authors can post.”
4. **Interviewer:** Why is raw HTML dangerous? **Strong answer:** Paragraph/heading/callout use `dangerouslySetInnerHTML`; author-controlled markup crosses into the reader DOM. Prefer React text rendering or strict sanitization and CSP. **Follow-up:** Is AI output trusted? **Evaluation:** Trust-boundary awareness. **Weak answer:** “React protects all JSX.”
5. **Interviewer:** Search is broken for posts. Find the cause. **Strong answer:** Route filters `visibility`, absent from Post schema/create path; query semantics mismatch. Also regex may scan and text index isn't used. **Follow-up:** How fix access control? **Evaluation:** code/schema tracing. **Weak answer:** “Add an index to visibility” without defining policy.
6. **Interviewer:** API works in containers but not local Vite. **Strong answer:** NGINX container config proxies API; Vite config has no dev proxy, and Axios uses same origin if `VITE_API_URL` empty. **Follow-up:** Which fix? **Evaluation:** environment distinction. **Weak answer:** Change backend CORS without checking target URL.
7. **Interviewer:** You need to support 100x writes. **Strong answer:** Measure first; isolate view writes and engagement hot documents; use atomic actions/separate event records, queue AI, and observe DB. **Follow-up:** When shard? **Evaluation:** staged scaling. **Weak answer:** “Sharding and microservices immediately.”

**What the interviewer evaluates:** ability to identify invariants, defend trade-offs, and prioritize risk rather than reflexively adding infrastructure.

### Round 3 — Advanced SDE Interview (60 minutes)

**Suggested pacing:** 10 minutes scale assumptions; 15 redesign; 15 incident simulation; 10 security review; 10 trade-offs/communication.

1. **Interviewer:** Design a durable AI metadata pipeline. **Strong answer:** Store post version/hash, enqueue unique job, worker claims with lease, bounded concurrency/retries, validates model output, conditionally saves if version still current, exposes status. **Follow-up:** How prevent duplicate billing? **Answer:** Idempotency key plus job dedupe; provider calls may still be ambiguous after timeout, so record attempts and avoid automatic unbounded retries. **Evaluation:** delivery semantics and cost.
2. **Interviewer:** Design poll voting for millions of users. **Strong answer:** Separate vote records with unique `(postId, blockId, userId)`, validate option, use atomic count or stream aggregation, cache read projection, publish notifications after durable write. **Follow-up:** Strong or eventual count consistency? **Answer:** Choose based on product requirements; exact read may aggregate, while displayed counts can be slightly stale if documented. **Evaluation:** contention and consistency.
3. **Interviewer:** How would you preserve updates across DB and socket publish? **Strong answer:** Transactional outbox: save vote and outbox event atomically, publisher retries delivery, clients dedupe by event/version and refetch on reconnect. **Follow-up:** Does Socket.IO adapter replace outbox? **Answer:** No, adapter shares live events across nodes but doesn't make event publication durable. **Evaluation:** distributed transactions.
4. **Interviewer:** A production pod returns green health but errors on all writes. **Strong answer:** `/health` is static, so investigate DB connectivity, credentials, pool exhaustion, and logs; add readiness that checks dependency and liveness that remains process-focused. **Follow-up:** What if Mongo is transiently down? **Answer:** Stop sending traffic/readiness false, bound retries/timeouts, avoid restart storms, and recover when dependency returns. **Evaluation:** health semantics.
5. **Interviewer:** Two replicas emit different poll state. **Strong answer:** Local rooms and local limiter state are not shared. Add shared adapter; fetch canonical DB snapshot after reconnect; version events to detect stale order. **Follow-up:** Do sticky sessions solve it? **Answer:** Not cross-node event fanout. **Evaluation:** distributed state.
6. **Interviewer:** Propose safe auth storage. **Strong answer:** The implementation now uses an HttpOnly cookie with SameSite policy and Origin checks for unsafe requests; I would still fix XSS, require a strong signing secret, and define rotation/revocation. **Follow-up:** Is a cookie enough? **Answer:** No; authorization checks, secure secret management, rate limits, and output safety remain. **Evaluation:** layered defense.
7. **Interviewer:** How migrate embedded follows without downtime? **Strong answer:** Create unique edge collection, backfill, dual-write or capture changes, reconcile counts, switch reads, then stop old writes and remove arrays after verified rollback window. **Follow-up:** What invariant? **Answer:** One active edge per source-target pair and consistent counters. **Evaluation:** migration strategy.
8. **Interviewer:** Which database do you choose at 10 million users? **Strong answer:** “I can’t choose from user count alone. I need write/read mix, graph degree, hot-key distribution, consistency needs, and latency targets. I’d first optimize indexes/model/replication, then shard or use another store if measured.” **Follow-up:** How choose shard key? **Answer:** Model cardinality and query routing; avoid monotonic/hot keys and test distribution. **Evaluation:** avoiding scale theater.
9. **Interviewer:** What would you do if a public post contains malicious HTML? **Strong answer:** Treat as incident: disable unsafe rendering/runner, preserve logs/data, assess exposure, revoke affected tokens if indicated, deploy safe renderer, notify per policy, and add regression/security tests. **Follow-up:** Is deleting the post enough? **Answer:** Not if token/data compromise may have occurred; investigate impact and sessions. **Evaluation:** incident response.
10. **Interviewer:** How can you prove performance improved? **Strong answer:** Define same workload/environment and baseline; compare p95/p99, error rates, DB docs examined, writes, CPU/memory, and cost. Include confidence/repeat runs. **Follow-up:** What if median improves but p99 worsens? **Answer:** Investigate tail causes and user SLO; don’t report only median. **Evaluation:** measurement discipline.

**Common weak answers across rounds:** “Mongo is scalable”; “JWT is encrypted”; “Kubernetes gives HA”; “CORS blocks attackers”; “async means reliable”; “add Redis”; “we support X million users” without workload/measurement.

## Part 15: Final Revision Notes

### One-Page Cheat Sheet

- **Product:** structured post publishing, adaptive reading modes, interactive community.
- **Frontend:** React 18/Vite, Router, Zustand, Axios, CSS Modules, Socket.IO Client.
- **Backend:** Node 20/Express 4, Mongoose 8, MongoDB, JWT, bcryptjs, Socket.IO, Groq through OpenAI SDK.
- **Publish:** `WritePage.save` → `POST /api/v1/posts` → auth → `Post.create` → return → `generatePostMeta` process-local task.
- **Read:** `GET /posts/:slug` → published Post query/populates → `$inc` views → response shaping by reader mode.
- **Schema:** embedded blocks; users/posts/topics/comments/quiz responses; unique quiz response compound index.
- **Realtime:** REST poll vote, DB save, Socket.IO `poll-update` to `post:<id>`; no shared adapter.
- **Honest limitations:** no measured performance, no test suite discovered, no Redis/cache/durable queue, no DB HA demonstrated.
- **Top risks:** same-origin `new Function`, raw HTML insertion, hard-coded JWT fallback, validation gaps, race-prone counters, weak multi-replica shared state.
- **Top bugs:** ELI5 `postId` undefined symbols; search `visibility` absent from Post schema; Vite dev proxy missing; draft editor fetch only sees published list.
- **First improvements:** remove/isolate code execution and sanitize HTML; fail closed secrets/CORS; validate write DTOs/ownership; atomic actions; durable AI jobs; regression tests/monitoring.

### Thirty Most Important Technical Facts

1. Routes mount below `/api/v1`.
2. React app uses Vite on port 3000 in dev config.
3. Vite config contains no API proxy.
4. Axios appends `/api/v1` to `VITE_API_URL` or same origin.
5. JWT is set in an HttpOnly `inkwell_session` cookie; the legacy localStorage entry is cleared at auth-store initialization.
6. JWT contains user ID and expires in seven days.
7. Auth middleware loads user from Mongo per protected request.
8. Password bcrypt work factor is 12.
9. Post blocks are embedded and discriminated by type.
10. Supported block schema includes image though editor add menu omits image.
11. Quick/exam modes omit blocks and use AI metadata fields.
12. Deep mode removes quiz `correctIndex` in post detail route.
13. Every post detail read increments view count.
14. Public post list caps limit at 50, but page validation is limited.
15. Feed uses offset pagination.
16. Post query also runs `countDocuments`.
17. AI provider config is Groq-compatible through OpenAI SDK.
18. Model default is `openai/gpt-oss-20b`.
19. AI helpers normalize and sometimes use heuristic fallback.
20. AI post metadata task runs in API process after response.
21. No durable worker/queue dependency is present.
22. Poll write uses read-modify-save and checks voter array.
23. Poll option index is not validated.
24. Quiz response has unique post/block/user index.
25. Quiz aggregate update is a second write after response insert.
26. Follow action writes two User documents without transaction.
27. Comments use REST; poll is the socket feature.
28. Socket rooms are local with no shared adapter shown.
29. Rate limit is global 500/15 minutes and in-memory default.
30. Code runner/raw HTML, secret fallback, and deployment gaps need candid discussion.

### Twenty Most Likely Questions

1. What does Inkwell solve?
2. Walk through publish flow.
3. Why MongoDB for blocks?
4. How do reading modes work?
5. Which AI provider/model is used?
6. How does password/JWT auth work?
7. Why are quiz responses separate?
8. How does poll realtime update work?
9. What breaks under concurrent poll votes?
10. Why isn't the in-process AI task durable?
11. What does the deep-mode redaction protect?
12. What is the most severe security issue?
13. Why does draft load after refresh fail?
14. Why might post search be empty?
15. Why might local Vite calls fail?
16. How scale feeds beyond offset pagination?
17. How would multi-pod Socket.IO work?
18. Which indexes matter and how verify?
19. What would you test first?
20. Which claims/metrics can you defend?

### Ten Hardest Questions

1. How do you preserve AI metadata correctness when jobs finish out of order?
2. How do you make poll uniqueness and aggregate counts race-safe?
3. How do you guarantee durable event publication after database commit?
4. How do you isolate untrusted code execution from the reader origin and resources?
5. How do you migrate embedded follower/bookmark arrays online?
6. How do you design feeds under high follow-degree skew?
7. What shard key would you choose and why, based on measured workload?
8. What is your recovery plan if Mongo fails after acknowledged write?
9. How do you distinguish readiness, liveness, and dependency health?
10. How do you demonstrate an optimization improved p99 without introducing stale data?

### Ten Architectural Decisions To Remember

1. SPA + API separation.
2. Mongo document aggregate for posts.
3. Embedded typed blocks.
4. Embedded poll/quiz aggregates.
5. User arrays for follows/bookmarks.
6. REST commands with Socket.IO notifications.
7. JWT in an HttpOnly cookie with Origin/SameSite CSRF controls.
8. Optional Groq through compatible SDK.
9. In-process AI generation with fallback.
10. Docker/Compose plus EKS/Terraform and EC2 alternatives.

### Concise End-To-End Explanation

“A writer authors a typed-block post in React and submits it through Axios to an authenticated Express route. The route persists a Mongoose document in MongoDB and returns. If published, it starts optional metadata generation, which calls Groq and falls back to heuristics but is not durable queue work. Readers fetch a published post by slug; Express increments views and shapes the response for quick, exam, or deep reading. Poll votes are persisted through REST and broadcast to a Socket.IO room. The main improvements I’d prioritize are secure content/code isolation, validation and concurrency invariants, durable AI jobs, and observability.”

### Technical Weaknesses To Acknowledge

- Code execution is not sandboxed; raw HTML rendering is unsafe for untrusted content.
- JWT has a predictable fallback; HttpOnly cookie storage reduces script-readable token exposure but does not fix the weak signing secret.
- CORS can allow any origin when configuration is empty.
- Request validation is inconsistent; comment relationship and poll/quiz option checks are incomplete.
- Toggle/counter flows are vulnerable to races; multi-document writes lack transaction strategy.
- AI work is process-local and not durable; provider cost limits are weak.
- In-memory rate limiter and socket rooms are not shared across replicas.
- Feed pagination uses skip; post reads write view counter; list counts every query.
- Search visibility predicate conflicts with schema; development API proxy missing; draft load path is incompatible with published-only list.
- No automated tests, benchmark suite, operational metrics, or backup/restore procedure was found.

### Last-Minute 30-Minute Revision Plan

1. **Minutes 0–5:** Practice 60-second and 5-minute pitches; know the stack and actual Groq model configuration.
2. **Minutes 5–10:** Draw the request flow and database relationships from memory.
3. **Minutes 10–15:** Explain publish, post read, poll vote, and quiz answer with failure points.
4. **Minutes 15–20:** Review the top security concerns and exact remediation priorities.
5. **Minutes 20–25:** Practice concurrency, pagination, queue, and multi-replica follow-ups.
6. **Minutes 25–30:** Rehearse honest limitations, demo sequence, and questions to ask the interviewer.

### Project Demo Walkthrough

1. Start at the home feed and explain Latest versus personalized feed behavior.
2. Open a published post and switch full/quick/exam mode; explain that summary fields depend on metadata generation.
3. Show a poll, but do not execute user-authored runnable code in a real browser session; explain the implementation risk instead.
4. Demonstrate comments and distinguish REST comments from Socket.IO poll notifications.
5. Open the editor, create a short post with multiple block types, save as draft, then publish if environment is safe.
6. Explain AI title/tag/metadata behavior and what happens when Groq is unavailable.
7. Close with database model, one known concurrency gap, and one security fix you would prioritize.

### Readiness Checklist

- [ ] I can explain every step of auth, publish, read, poll, quiz, comment, and follow flows.
- [ ] I can distinguish an implemented feature from README wording or a proposed improvement.
- [ ] I understand JWT signature vs encryption and bcrypt hashing vs encryption.
- [ ] I can explain Mongo single-document atomicity and multi-document transaction limits.
- [ ] I can describe check-then-write races and unique-index protection.
- [ ] I can explain why CORS is not authentication, why HttpOnly prevents script reads but not XSS actions, and how cookie SameSite/Origin checks mitigate CSRF.
- [ ] I can explain why `new Function` is not a sandbox.
- [ ] I can explain why async promise work is not durable queue processing.
- [ ] I can identify the current indexes and verify them with query plans.
- [ ] I can discuss cache invalidation, cursor pagination, and feed fanout trade-offs.
- [ ] I can draw a multi-replica socket/queue/database architecture and label it proposed.
- [ ] I avoid unverified metrics, test results, ownership claims, and user counts.
- [ ] I can describe how I would test the top five bugs and security boundaries.

### Deployment And Demo Walkthrough

Deployment options in the repo are alternatives:

- **Local:** create `backend/.env` based on `.env.example`, start Compose, and access frontend on host port 3000. Keep Mongo port local; do not use development secret defaults for public exposure.
- **EKS:** Terraform provisions VPC/EKS/ECR; deploy scripts and Kubernetes manifests deploy apps. Check that secret names, cluster names, image tags, ingress/TLS, Mongo endpoint, and probes align. The combined manifest's placeholder secret values are not production-ready.
- **EC2:** `deploy/setup.sh` configures Node, Mongo, NGINX, and PM2; HTTPS/TLS handling is not evidenced by the inspected script/config.

Do not claim all deployments are live. The repository contains configuration; it does not prove a currently running production environment.
