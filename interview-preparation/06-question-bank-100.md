# Part 12: Project-Specific Interview Question Bank (1–50)

Answers are written in first person for interview practice. Adjust ownership statements to match your actual contributions. Questions are grounded in the checked-in implementation; improvements are labeled as future work.

## A. Basic Project Understanding (1–15)

### 1. What is Inkwell?
**Ideal Answer:** “It’s a knowledge-sharing app where writers publish structured posts and readers choose a full, summary, or exam-style view. It also supports quizzes, polls, comments, follows, bookmarks, and optional AI assistance.”
**Technical Explanation:** Product value combines block-based content, read projections, and community interactions.
**Follow-up:** Which feature is the technical center?
**Follow-up Answer:** “The post model and its block types connect authoring, persistence, reading modes, and interactive elements.”
**Code Reference:** `backend/src/models/Post.js`, `frontend/src/pages/WritePage.jsx`.
**Common Mistake:** Claiming the repository proves users or learning outcomes improved.

### 2. Who are the users and what problem is addressed?
**Ideal Answer:** “The feature set targets writers and readers of explanatory content. Writers can structure posts; readers can trade depth for speed and interact with quizzes or polls.”
**Technical Explanation:** This is a product hypothesis inferred from interfaces, not validated research.
**Follow-up:** How did you validate demand?
**Follow-up Answer:** “I’d need user interviews, usage analytics, and task-completion studies; those results aren’t in the repository.”
**Code Reference:** `frontend/src/pages/WritePage.jsx`, `frontend/src/pages/PostPage.jsx`.
**Common Mistake:** Inventing customer counts or retention.

### 3. Give the short tech stack overview.
**Ideal Answer:** “React 18/Vite frontend, Node/Express API, MongoDB through Mongoose, JWT/bcrypt auth, Socket.IO poll notifications, optional Groq through the OpenAI SDK, and Docker/Kubernetes/AWS deployment configuration.”
**Technical Explanation:** The stack separates browser UI, API/business logic, persistence, and external inference.
**Follow-up:** Is Redis used?
**Follow-up Answer:** “No Redis dependency or integration is evident; it’s a proposed option for distributed limits/cache/socket adapter.”
**Code Reference:** `frontend/package.json`, `backend/package.json`, `backend/src/index.js`.
**Common Mistake:** Describing proposed components as deployed.

### 4. What is the most important user flow?
**Ideal Answer:** “Publishing a post: the editor submits typed blocks to an authenticated API, MongoDB persists it, the API returns, then metadata generation runs asynchronously.”
**Technical Explanation:** User-facing latency is isolated from the optional provider call, but the task is not durable.
**Follow-up:** What can be lost?
**Follow-up Answer:** “An in-flight generation can disappear if that API process stops; a durable job queue is the next step.”
**Code Reference:** `frontend/src/pages/WritePage.jsx`, `backend/src/routes/posts.js`, `backend/src/services/aiService.js`.
**Common Mistake:** Saying publish waits for an AI summary.

### 5. What makes a post different from a plain article string?
**Ideal Answer:** “It stores an ordered array of typed blocks, each with fields appropriate to paragraphs, quizzes, polls, code, callouts, and other content.”
**Technical Explanation:** A tagged union makes rendering extensible while preserving one post aggregate.
**Follow-up:** How do you protect against malformed blocks?
**Follow-up Answer:** “The Mongoose schema constrains some fields, but I’d add request-level schema validation and per-type invariants before persistence.”
**Code Reference:** `backend/src/models/Post.js`.
**Common Mistake:** Assuming the schema guarantees every semantic rule.

### 6. What are the three reading modes?
**Ideal Answer:** “Quick returns summary/takeaway, exam returns revision bullets and detailed summary, and deep returns content blocks while removing quiz answers.”
**Technical Explanation:** Server response projections adapt one source entity to reader needs.
**Follow-up:** What if metadata is pending?
**Follow-up Answer:** “Quick mode has a placeholder; exam fields can be empty. A better UX would expose pending status or a deterministic fallback.”
**Code Reference:** `backend/src/routes/posts.js` GET `/:slug`.
**Common Mistake:** Claiming each mode has a separate content store.

### 7. What does “AI-powered” mean in this repository?
**Ideal Answer:** “The service can call Groq through an OpenAI-compatible SDK for suggestions and metadata, and uses heuristic fallbacks for some features when the provider is unavailable.”
**Technical Explanation:** Provider calls are optional enrichments rather than the persistence source of truth.
**Follow-up:** Is the default GPT-4o?
**Follow-up Answer:** “No. Code uses `GROQ_MODEL`, defaulting to `openai/gpt-oss-20b`; README model wording is stale.”
**Code Reference:** `backend/src/services/aiService.js`, `backend/.env.example`.
**Common Mistake:** Repeating README model claims without checking code.

### 8. What does Socket.IO do?
**Ideal Answer:** “A user votes through REST; after saving, the API emits poll counts to a room named for the post. Comments remain REST-based.”
**Technical Explanation:** Durable command and ephemeral fanout are separate responsibilities.
**Follow-up:** Does it work across backend replicas?
**Follow-up Answer:** “Not reliably as configured; a shared adapter is not present.”
**Code Reference:** `backend/src/index.js`, `backend/src/routes/posts.js`, `frontend/src/pages/PostPage.jsx`.
**Common Mistake:** Saying comments are realtime.

### 9. How does authentication work?
**Ideal Answer:** “Registration hashes the password with bcrypt, then the backend signs a seven-day JWT containing the user ID and sets it as an HttpOnly cookie. Protected routes read that cookie, verify it, and load the user.”
**Technical Explanation:** JWT signature protects integrity; it does not encrypt claims. Password hashes are one-way verifiers.
**Follow-up:** Can browser JavaScript read the browser token?
**Follow-up Answer:** “No, it is an HttpOnly cookie. Since the browser sends it automatically, unsafe requests are checked against allowed Origin and SameSite policy.”
**Code Reference:** `backend/src/models/User.js`, `backend/src/middleware/auth.js`, `frontend/src/store/authStore.js`.
**Common Mistake:** Calling JWT encrypted or claiming HttpOnly cookies prevent injected scripts from acting as the user.

### 10. What database entities exist?
**Ideal Answer:** “Users, posts, comments, topics, and quiz responses. Post blocks are embedded; other relationships use ObjectId references or ID arrays.”
**Technical Explanation:** It mixes embedding for aggregate reads with references for cross-document entities.
**Follow-up:** Are references foreign keys?
**Follow-up Answer:** “No. Mongoose populate resolves IDs, but MongoDB does not enforce relational foreign keys.”
**Code Reference:** `backend/src/models/User.js`, `Post.js`, `Other.js`.
**Common Mistake:** Describing Mongoose references as database-enforced cascades.

### 11. What does the repository provide for deployment?
**Ideal Answer:** “Dockerfiles and Compose for local containers, Kubernetes/EKS manifests, Terraform for VPC/EKS/ECR, and a separate EC2 setup script using NGINX/PM2.”
**Technical Explanation:** These are multiple deployment paths, not proof all are actively deployed together.
**Follow-up:** Does Terraform create MongoDB?
**Follow-up Answer:** “No. The combined Kubernetes manifest includes a single MongoDB pod/PVC, while Terraform provisions AWS infrastructure.”
**Code Reference:** `docker-compose.yml`, `k8s/`, `terraform/`, `deploy/setup.sh`.
**Common Mistake:** Claiming managed database HA exists.

### 12. Is there automated test coverage?
**Ideal Answer:** “I found no test/spec files or test scripts in the package manifests. That means automated tests aren’t evidenced in the repository, not that no manual testing occurred.”
**Technical Explanation:** Test inventory is a repo observation, not runtime proof.
**Follow-up:** What would you test first?
**Follow-up Answer:** “Auth ownership, publish/read modes, quiz/poll validation and concurrency, plus the known ELI5 context branch and search filters.”
**Code Reference:** `backend/package.json`, `frontend/package.json`, `backend/src/routes/`.
**Common Mistake:** Claiming test results without running tests.

### 13. What does the editor support?
**Ideal Answer:** “The current `WritePage` implements textareas and block editors for paragraph, heading, code, quiz, poll, callout, and divider. Model/reader support image blocks, but the visible add-block list omits image.”
**Technical Explanation:** Backend schema capability and editor affordances are not identical.
**Follow-up:** Is TipTap used?
**Follow-up Answer:** “It is a declared dependency, but the inspected writer uses textareas, not TipTap components.”
**Code Reference:** `frontend/src/pages/WritePage.jsx`, `backend/src/models/Post.js`.
**Common Mistake:** Parroting unsupported rich-text claims from docs.

### 14. What is the status of code execution in posts?
**Ideal Answer:** “Runnable JavaScript blocks execute in the reader page with `new Function`. That is not a secure sandbox, and I would disable it or isolate it before public use.”
**Technical Explanation:** Same-origin JavaScript inherits page capabilities; a label/checkbox is not isolation.
**Follow-up:** Is it a Python/Go runner?
**Follow-up Answer:** “No. The source runs as JavaScript regardless of the language label.”
**Code Reference:** `frontend/src/components/reader/BlockRenderer.jsx`.
**Common Mistake:** Calling it a sandboxed multi-language runner.

### 15. What project metrics can you claim?
**Ideal Answer:** “I can discuss product counters such as views and likes, but I found no verified latency, throughput, uptime, load-test, or user metrics.”
**Technical Explanation:** Business counters are not operational performance measurements.
**Follow-up:** How would you establish a baseline?
**Follow-up Answer:** “Instrument endpoint p50/p95/p99, error rates, DB query timings, queue/provider latency, resource saturation, and use a representative load test.”
**Code Reference:** `backend/src/models/Post.js`, `backend/src/index.js`.
**Common Mistake:** Inventing performance wins.

## B. Architecture And Backend (16–35)

### 16. Draw the high-level architecture.
**Ideal Answer:** “React SPA calls Express REST through Axios; Socket.IO shares the backend server for poll events; Express uses Mongoose/MongoDB and optionally Groq for AI.”
**Technical Explanation:** UI, API, datastore, realtime channel, and provider have distinct roles.
**Follow-up:** Where is Redis?
**Follow-up Answer:** “Not implemented; it is a candidate for shared adapter, cache, or distributed limiter.”
**Code Reference:** `frontend/src/utils/api.js`, `backend/src/index.js`.
**Common Mistake:** Drawing an unimplemented queue/cache as current.

### 17. Why keep REST and Socket.IO together?
**Ideal Answer:** “REST authenticates and persists commands; Socket.IO efficiently informs connected readers. The database remains canonical.”
**Technical Explanation:** State mutation and fanout have different reliability semantics.
**Follow-up:** What if the emit fails after saving?
**Follow-up Answer:** “The vote remains valid; clients refetch. For guaranteed publication, I’d use an outbox or durable event mechanism.”
**Code Reference:** `backend/src/routes/posts.js`, `backend/src/index.js`.
**Common Mistake:** Treating a socket message as durable storage.

### 18. How does Express middleware order matter?
**Ideal Answer:** “CORS, JSON parsing, logging, rate limiting, and `req.io` attachment run before route handlers, so they affect all mounted APIs.”
**Technical Explanation:** Middleware is an ordered pipeline; missing or late middleware changes behavior.
**Follow-up:** Where add centralized error handling?
**Follow-up Answer:** “After route registration, with a four-argument error middleware and async rejection propagation.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Assuming middleware order is irrelevant.

### 19. What does `/api/v1` accomplish?
**Ideal Answer:** “It provides an explicit API version namespace. The code only shows v1, not a migration/deprecation policy.”
**Technical Explanation:** Versioning supports incompatible contract evolution.
**Follow-up:** Should every additive field require v2?
**Follow-up Answer:** “No; additive backward-compatible changes can stay in v1 if clients tolerate unknown fields.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Calling route prefix alone a complete versioning strategy.

### 20. How is published post creation authorized?
**Ideal Answer:** “The route applies `auth`, which verifies the HttpOnly session cookie, loads the user into `req.user`, then assigns that ID as author.”
**Technical Explanation:** Identity is server-derived; never trust a client author ID.
**Follow-up:** How is edit ownership enforced?
**Follow-up Answer:** “Update query includes both post ID and `authorId: req.user._id`; archive uses the same ownership constraint.”
**Code Reference:** `backend/src/middleware/auth.js`, `backend/src/routes/posts.js`.
**Common Mistake:** Relying only on hidden UI routes.

### 21. How do public and optional-auth reads work?
**Ideal Answer:** “`optionalAuth` attempts token verification, then continues even if missing or invalid. Routes can use `req.user` for personalized fields.”
**Technical Explanation:** Optional identity must not weaken visibility filters.
**Follow-up:** What must be audited?
**Follow-up Answer:** “Every query that returns drafts/private data must use explicit server-side visibility and ownership constraints.”
**Code Reference:** `backend/src/middleware/auth.js`, `routes/posts.js`, `routes/search.js`.
**Common Mistake:** Treating optional auth as authorization.

### 22. What does the Axios 401 interceptor do?
**Ideal Answer:** “Axios sends the HttpOnly cookie with requests; a 401 dispatches an event so the app clears in-memory auth and the route guard redirects to `/auth`.”
**Technical Explanation:** Client handles session UX, while server decides access.
**Follow-up:** Should it redirect on 403?
**Follow-up Answer:** “No; that’s an authorization denial, not necessarily an invalid session.”
**Code Reference:** `frontend/src/utils/api.js`.
**Common Mistake:** Clearing valid session on every error.

### 23. How does post creation handle slugs?
**Ideal Answer:** “`makeSlug` slugifies title and appends a base-36 timestamp, and schema marks slug unique.”
**Technical Explanation:** Timestamp reduces collisions but is not a formal retry policy.
**Follow-up:** What if slug collision occurs?
**Follow-up Answer:** “Catch duplicate-key and retry with random/monotonic suffix or return a clear conflict.”
**Code Reference:** `backend/src/routes/posts.js`, `backend/src/models/Post.js`.
**Common Mistake:** Assuming timestamp guarantees uniqueness across all concurrent processes.

### 24. How are errors handled?
**Ideal Answer:** “Most routes wrap work in try/catch and return status 500 with `err.message`; auth maps verification failures to 401.”
**Technical Explanation:** It is simple but leaks internals and lacks stable typed error contracts.
**Follow-up:** How improve safely?
**Follow-up Answer:** “Centralize known validation/auth/conflict errors, log details with request ID, and return generic 500 responses.”
**Code Reference:** `backend/src/routes/*.js`, `backend/src/index.js`.
**Common Mistake:** Assuming catch means good error handling.

### 25. Why cap JSON at 10 MB?
**Ideal Answer:** “It bounds parser memory per request, but does not enforce semantic limits on blocks, arrays, or strings.”
**Technical Explanation:** Request-size caps mitigate one resource exhaustion vector, not all amplification.
**Follow-up:** What other limits?
**Follow-up Answer:** “Max block count, block content, poll options, title/tags, and per-user request/concurrency quotas.”
**Code Reference:** `backend/src/index.js`, `backend/src/models/Post.js`.
**Common Mistake:** Treating body limit as complete validation.

### 26. Is the rate limiter production-ready across replicas?
**Ideal Answer:** “The app has a global 500-per-15-minute limiter, but default memory is per process. Two replicas can each enforce their own counter.”
**Technical Explanation:** Distributed quota requires shared atomic state and correct client-IP trust.
**Follow-up:** Where to store counters?
**Follow-up Answer:** “A Redis-backed rate-limit store, keyed by user/IP and route class, with stricter limits for login and AI.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Saying the one middleware provides global abuse protection.

### 27. Does AI generation block publishing?
**Ideal Answer:** “The route calls `generatePostMeta(...).catch(...)` without awaiting it, so response returns after the post save and other route work.”
**Technical Explanation:** It reduces response dependency but not process resource coupling or task-loss risk.
**Follow-up:** How make it reliable?
**Follow-up Answer:** “Persist a job in a durable broker, use post/version idempotency, controlled workers, retries, and observable states.”
**Code Reference:** `backend/src/routes/posts.js`, `backend/src/services/aiService.js`.
**Common Mistake:** Equating fire-and-forget promise with a job queue.

### 28. What are REST semantics for archive?
**Ideal Answer:** “The route is DELETE but sets `status: 'archived'`; it is a soft delete. Public post queries filter published status.”
**Technical Explanation:** Soft deletion preserves data but requires consistent filtering and retention policy.
**Follow-up:** Does UI copy match?
**Follow-up Answer:** “The confirmation says it cannot be undone, which is not demonstrated by the API; wording or restore policy should be clarified.”
**Code Reference:** `backend/src/routes/posts.js` DELETE, `frontend/src/pages/WritePage.jsx`/post UI.
**Common Mistake:** Claiming documents are physically deleted.

### 29. What are the largest backend correctness risks?
**Ideal Answer:** “Read-modify-save engagement updates, missing request validation, multi-document follow/response writes without transactions, and process-local background jobs are the clearest risks.”
**Technical Explanation:** Concurrency, integrity, and failure durability are separate concerns.
**Follow-up:** Which one first?
**Follow-up Answer:** “Security-sensitive validation and unsafe code execution first, then atomic action semantics and durable AI jobs, prioritized by exposure.”
**Code Reference:** `routes/posts.js`, `routes/usersFeed.js`, `services/aiService.js`.
**Common Mistake:** Saying “add microservices” without identifying an invariant.

### 30. How do you trace a request in production?
**Ideal Answer:** “I’d correlate browser network request, route and DB operation with a request ID and structured logs. Current Morgan `dev` output lacks that broader observability.”
**Technical Explanation:** Correlation is needed across asynchronous boundaries.
**Follow-up:** How trace AI work after response?
**Follow-up Answer:** “Persist a job ID and propagate it into worker logs, provider call metadata, and post metadata state.”
**Code Reference:** `backend/src/index.js`, `backend/src/services/aiService.js`.
**Common Mistake:** Searching uncorrelated console logs only.

### 31. What happens if backend receives invalid JSON?
**Ideal Answer:** “The Express JSON parser rejects malformed bodies before route logic; there is no custom parser error mapping visible.”
**Technical Explanation:** Parser errors should be translated to clear 400 responses, not generic 500.
**Follow-up:** How test it?
**Follow-up Answer:** “Send malformed JSON to a route and assert safe status/body and no unhandled rejection.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Assuming route-level try/catch handles parser errors.

### 32. How does the app handle absent AI credentials?
**Ideal Answer:** “The client is null when no key; `callAI` returns null, and several service functions use fallback output.”
**Technical Explanation:** Optional dependency isolation preserves basic utility.
**Follow-up:** Is every AI endpoint fully useful without the key?
**Follow-up Answer:** “Behavior varies by function; verify each return shape and frontend UI rather than assuming uniform fallback.”
**Code Reference:** `backend/src/services/aiService.js`.
**Common Mistake:** Claiming AI always operates offline identically.

### 33. Why use Morgan?
**Ideal Answer:** “Morgan emits HTTP request logs; current config uses `dev` format.”
**Technical Explanation:** Access logs help local debugging but aren't full structured observability.
**Follow-up:** What should production logs include?
**Follow-up Answer:** “Structured timestamp, method/path, status, duration, request ID, and redacted identity fields—never passwords/tokens.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Logging credentials to diagnose auth.

### 34. What is the role of `ensureBaseData`?
**Ideal Answer:** “At startup, if topic collection is empty, it bulk-upserts default topics using `$setOnInsert`.”
**Technical Explanation:** Idempotent bootstrap reduces manual setup, though the empty-collection check and concurrent startup should be considered.
**Follow-up:** Could two pods race during startup?
**Follow-up Answer:** “Unique slug plus upsert helps, but duplicate-key behavior should be tested; bootstrap must remain safe under parallel starts.”
**Code Reference:** `backend/src/bootstrap.js`.
**Common Mistake:** Calling it a full migration/seed system.

### 35. What would you test at the API boundary first?
**Ideal Answer:** “Malformed block shapes, title limits, authorization on update/archive, poll/quiz option bounds, cross-post comment parents, duplicate quiz races, and stable error mapping.”
**Technical Explanation:** Boundary tests protect invariants before persistence.
**Follow-up:** Unit or integration tests?
**Follow-up Answer:** “Unit-test pure validators/services, then integration-test routes with a disposable database for indexes and concurrency behavior.”
**Code Reference:** `backend/src/routes/`, `backend/src/models/`.
**Common Mistake:** Testing only happy-path status 200.

## C. Database Questions (36–50)

### 36. Why MongoDB rather than PostgreSQL?
**Ideal Answer:** “Posts have heterogeneous embedded blocks and common reads fetch the full post, which fits a document aggregate. PostgreSQL may be better if relational constraints, joins, or multi-row transactions become dominant.”
**Technical Explanation:** Database choice follows access patterns and integrity requirements, not generic scalability slogans.
**Follow-up:** What evidence would drive migration?
**Follow-up Answer:** “Measured query/write contention, integrity failures, and feature needs that indexes or model changes cannot address.”
**Code Reference:** `backend/src/models/Post.js`, `Other.js`.
**Common Mistake:** “Mongo scales better” without workload details.

### 37. What is embedded and what is referenced?
**Ideal Answer:** “Blocks and poll/quiz aggregates are embedded in Post. Authors/topics/responses and quiz answers are referenced; user follows/bookmarks are ObjectId arrays.”
**Technical Explanation:** Embedding optimizes aggregate reads; references avoid duplicating separate entities.
**Follow-up:** Where is consistency harder?
**Follow-up Answer:** “Across multiple documents, such as reciprocal follows or response links, because no transaction is used.”
**Code Reference:** `Post.js`, `User.js`, `Other.js`.
**Common Mistake:** Calling every ObjectId reference a foreign key.

### 38. Why is the quiz response unique index important?
**Ideal Answer:** “It enforces one answer per user/post/block even if two requests race after the route’s pre-check.”
**Technical Explanation:** Database uniqueness is stronger than application-level check-then-insert.
**Follow-up:** What should route do on duplicate key?
**Follow-up Answer:** “Return 409 or the existing result, not generic 500.”
**Code Reference:** `backend/src/models/Other.js`.
**Common Mistake:** Assuming a preceding `findOne` prevents races.

### 39. What indexes does the Post model define?
**Ideal Answer:** “Slug, author, topics, status, publication date, topic/date and author/date compounds, tags, and text index on title/tags.”
**Technical Explanation:** Indexes speed matching/sorting at the cost of storage and write work.
**Follow-up:** Does search use the text index?
**Follow-up Answer:** “The route uses escaped regex, so the declared text index may not serve that query.”
**Code Reference:** `backend/src/models/Post.js`, `backend/src/routes/search.js`.
**Common Mistake:** Assuming an index is used because it exists.

### 40. How should you optimize feed pagination?
**Ideal Answer:** “The feed currently uses skip/limit. I’d move to a cursor on publication time plus a unique tie-breaker like `_id`, after validating indexes.”
**Technical Explanation:** Deep skips require traversing earlier matches; cursor seeks near the last seen record.
**Follow-up:** What about new posts while paging?
**Follow-up Answer:** “A stable cursor reduces duplication but the client should define snapshot/freshness semantics and handle deleted/updated records.”
**Code Reference:** `backend/src/routes/posts.js`, `backend/src/routes/usersFeed.js`.
**Common Mistake:** Claiming cursor pagination is already implemented.

### 41. Why is `countDocuments` a potential cost?
**Ideal Answer:** “The public list separately counts all matches for each page. Exact counts can cost extra work and add latency for large filters.”
**Technical Explanation:** Count and page query are separate operations and can observe slightly different data states.
**Follow-up:** What alternatives?
**Follow-up Answer:** “Return `hasMore` using `limit+1`, cache/approximate totals, or count asynchronously if exact totals are not essential.”
**Code Reference:** `backend/src/routes/posts.js` GET `/`.
**Common Mistake:** Returning exact totals without considering query cost.

### 42. What does `populate` cost?
**Ideal Answer:** “It resolves author/topic references into response objects; it is convenient but can add database work and payload.”
**Technical Explanation:** Joins are performed by Mongoose query behavior, not native relational foreign keys.
**Follow-up:** How reduce cost?
**Follow-up Answer:** “Project only required fields, measure query count, batch appropriately, and consider aggregation for carefully selected endpoints.”
**Code Reference:** `backend/src/routes/posts.js`.
**Common Mistake:** Populating entire user documents.

### 43. What does Mongo atomicity guarantee here?
**Ideal Answer:** “A single-document update is atomic, but multi-document sequences like follow updates are not atomic without a transaction.”
**Technical Explanation:** Document-level atomicity doesn't encompass later writes to separate documents.
**Follow-up:** Are transactions available in all Mongo setups?
**Follow-up Answer:** “They require replica set or sharded-cluster support; local standalone configuration may need adjustment.”
**Code Reference:** `backend/src/routes/usersFeed.js`.
**Common Mistake:** Saying MongoDB never supports transactions.

### 44. How would you make likes concurrency-safe?
**Ideal Answer:** “Replace array read-modify-save with an explicit unique like record or atomic add-to-set/remove flow and derive or atomically maintain a count.”
**Technical Explanation:** Idempotent state-setting is safer than toggling based on stale reads.
**Follow-up:** What about count consistency?
**Follow-up Answer:** “Use a single atomic operation when feasible or treat count as a rebuildable aggregate updated transactionally/asynchronously.”
**Code Reference:** `backend/src/routes/posts.js`, `backend/src/models/Post.js`.
**Common Mistake:** Incrementing count independently from membership.

### 45. Why can the view counter hurt performance?
**Ideal Answer:** “A detail GET performs a write `$inc`, so read-heavy traffic generates database writes and can concentrate on popular posts.”
**Technical Explanation:** Read path write amplification increases contention and storage overhead.
**Follow-up:** Should count be removed?
**Follow-up Answer:** “Not necessarily; batch or asynchronously aggregate view events if exact real-time counts aren’t required.”
**Code Reference:** `backend/src/routes/posts.js` GET `/:slug`.
**Common Mistake:** Assuming GET means no database write.

### 46. How do Mongoose hooks affect writes?
**Ideal Answer:** “`pre('save')` hashes a modified password field and Post `pre('save')` computes reading time. Update methods may bypass save hooks.”
**Technical Explanation:** Middleware execution depends on operation type.
**Follow-up:** Could `findByIdAndUpdate` hash a password?
**Follow-up Answer:** “Not through that document save hook; profile update excludes password, but any password update API must explicitly hash or use appropriate query middleware.”
**Code Reference:** `User.js`, `Post.js`, `routes/auth.js`.
**Common Mistake:** Assuming all Mongoose writes run document hooks.

### 47. How is read time estimated?
**Ideal Answer:** “The pre-save hook counts whitespace-delimited words extracted from selected block fields, divides by 200, rounds up, and floors at one minute.”
**Technical Explanation:** It is an approximate derived field; language/tokenization and field coverage affect accuracy.
**Follow-up:** How ensure it updates on every content change?
**Follow-up Answer:** “Centralize writes through save/service logic or recompute explicitly in validated update operations; test all mutation paths.”
**Code Reference:** `backend/src/models/Post.js`.
**Common Mistake:** Calling it measured reading behavior.

### 48. What problem does a text index solve, and is it used?
**Ideal Answer:** “Text indexes support token-based search; the post schema defines one for title/tags. The search route instead builds escaped regex, so current use is not demonstrated.”
**Technical Explanation:** Index semantics differ; regex, case sensitivity, stemming, and token search are not interchangeable.
**Follow-up:** How fix search properly?
**Follow-up Answer:** “First define matching behavior and visibility; then use `$text` or a dedicated search engine and verify plans/quality.”
**Code Reference:** `Post.js`, `routes/search.js`.
**Common Mistake:** Assuming text index fixes every substring query.

### 49. How prevent response-post links from becoming inconsistent?
**Ideal Answer:** “Current create writes response then updates parent’s response array as separate operations. I’d transactionally update or eliminate duplicated reverse storage and query children by `responseTo`.”
**Technical Explanation:** Maintaining both forward and reverse references creates dual-write consistency work.
**Follow-up:** Which model is simpler?
**Follow-up Answer:** “Store one authoritative `responseTo` and query by it unless measured read performance justifies a maintained reverse list.”
**Code Reference:** `backend/src/routes/posts.js`, `Post.js`.
**Common Mistake:** Duplicating relationship state without a repair strategy.

### 50. What backup/recovery controls exist?
**Ideal Answer:** “The repository shows a Mongo PVC in combined Kubernetes manifest and Compose volume, but no documented backup/restore policy or tested recovery procedure.”
**Technical Explanation:** Persistence volume is not backup; recovery requires independent copies and restore validation.
**Follow-up:** What would you establish?
**Follow-up Answer:** “Automated encrypted backups, retention, point-in-time recovery where available, and restore drills with explicit RPO/RTO.”
**Code Reference:** `docker-compose.yml`, `k8s/inkwell.yaml`.
**Common Mistake:** Calling a PVC a backup.

## D. System Design And Scalability (51–65)

### 51. What breaks first at 100x traffic?
**Ideal Answer:** “I’d measure, but likely hot post documents, view-write amplification, deep skip pagination, and unbounded AI calls. The current code has no telemetry to rank them definitively.”
**Technical Explanation:** Bottlenecks depend on read/write mix and content distribution.
**Follow-up:** What instrument first?
**Follow-up Answer:** “Endpoint percentiles, DB execution stats, write conflicts, provider latency/cost, and resource utilization.”
**Code Reference:** `routes/posts.js`, `aiService.js`.
**Common Mistake:** Immediately proposing sharding.

### 52. How would you scale the backend horizontally?
**Ideal Answer:** “Run stateless API replicas behind ingress, but first externalize rate-limit, socket, and job coordination state. Mongo and provider quotas must also sustain added load.”
**Technical Explanation:** Horizontal replicas multiply request capacity only when shared dependencies and state scale.
**Follow-up:** Is the existing API stateless?
**Follow-up Answer:** “Partly; JWT and DB state are external, but sockets, default limiter, and local async tasks are per process.”
**Code Reference:** `backend/src/index.js`, `k8s/backend.deployment.yaml`.
**Common Mistake:** Adding replicas without shared state.

### 53. How does the EKS deployment scale now?
**Ideal Answer:** “Backend and frontend deployments specify two replicas. I found no HPA or shared Socket.IO adapter; Mongo is a single pod in the combined manifest.”
**Technical Explanation:** Fixed replicas are not autoscaling or database HA.
**Follow-up:** What should HPA use?
**Follow-up Answer:** “CPU/memory plus request concurrency/latency or queue lag where available, with resource requests and safe max bounds.”
**Code Reference:** `k8s/backend.deployment.yaml`, `k8s/inkwell.yaml`.
**Common Mistake:** Saying EKS automatically scales pods by default.

### 54. What should be cached?
**Ideal Answer:** “Stable public post projections and topic lists are candidates. Personalized liked/bookmarked flags must not leak across users in a shared response cache.”
**Technical Explanation:** Cache keys must include all data-affecting dimensions; invalidation is a correctness problem.
**Follow-up:** How invalidate a changed post?
**Follow-up Answer:** “Use content version/update timestamp in the key or explicit invalidation on edit/archive/metadata completion.”
**Code Reference:** `routes/posts.js`, `models/Post.js`.
**Common Mistake:** Caching personalized response by slug alone.

### 55. Why cursor pagination?
**Ideal Answer:** “It avoids skipping an ever-growing offset by seeking after a stable `(publishedAt, _id)` cursor. It suits chronological feeds better at depth.”
**Technical Explanation:** Cursor pagination trades random page jumps/exact totals for scalable sequential traversal.
**Follow-up:** What index is needed?
**Follow-up Answer:** “A compound index aligned with filters and sort, likely status plus publishedAt and `_id`, verified with explain.”
**Code Reference:** `routes/posts.js`, `routes/usersFeed.js`.
**Common Mistake:** Claiming cursor is currently used.

### 56. How would you scale AI processing?
**Ideal Answer:** “A durable queue plus workers, per-user/global limits, idempotent post-version jobs, retries and dead-letter handling. Current fire-and-forget tasks are local to the API process.”
**Technical Explanation:** Queue decouples request latency from workload scheduling and failure recovery.
**Follow-up:** How prevent old result overwriting newer content?
**Follow-up Answer:** “Include content version/hash in job and apply only if current post still matches.”
**Code Reference:** `routes/posts.js`, `services/aiService.js`.
**Common Mistake:** Calling an unawaited promise durable background processing.

### 57. When would you shard MongoDB?
**Ideal Answer:** “Only after query and capacity measurements show a single replica set is insufficient and data distribution can support a shard key. Sharding adds routing, balancing, and operational complexity.”
**Technical Explanation:** Shard key cardinality and query targeting determine distribution and scatter-gather.
**Follow-up:** What makes `authorId` a risky key?
**Follow-up Answer:** “A few prolific authors may hotspot and global feeds still scatter; test workload distribution rather than guessing.”
**Code Reference:** `backend/src/models/Post.js`.
**Common Mistake:** Treating sharding as a general performance switch.

### 58. How would you scale poll votes?
**Ideal Answer:** “Use unique vote documents keyed by post/block/user, validate option, then atomically maintain or asynchronously aggregate counts. This avoids a growing voter array in a hot Post document.”
**Technical Explanation:** Separate write-heavy events from read-optimized aggregates.
**Follow-up:** How quickly do counts update?
**Follow-up Answer:** “Choose strict transactional update or eventual aggregation based on product freshness needs and expose the semantics.”
**Code Reference:** `Post.js`, `routes/posts.js`.
**Common Mistake:** Keeping unbounded IDs embedded indefinitely.

### 59. How would Socket.IO work across pods?
**Ideal Answer:** “Add a shared Socket.IO adapter backed by pub/sub, authenticate connections and room joins, and refetch canonical state after reconnect.”
**Technical Explanation:** Local rooms only know sockets attached to that process.
**Follow-up:** Does Redis provide durable event replay?
**Follow-up Answer:** “A pub/sub adapter generally fans out live events, not durable replay. Use persisted events/outbox if replay guarantees matter.”
**Code Reference:** `backend/src/index.js`, `frontend/src/pages/PostPage.jsx`.
**Common Mistake:** Confusing shared pub/sub with durable queue.

### 60. How would you scale personalized feeds?
**Ideal Answer:** “Current feed queries latest published posts filtered by followed topics/authors. At larger scale, I’d compare read-time fanout against write-time fanout using follow degree and freshness requirements.”
**Technical Explanation:** Fanout-on-read reduces write amplification; fanout-on-write reduces read cost but creates per-follower work.
**Follow-up:** Which first?
**Follow-up Answer:** “Keep current read-time approach until measured latency requires change; hybridize celebrity authors if their fanout dominates.”
**Code Reference:** `backend/src/routes/usersFeed.js`.
**Common Mistake:** Choosing push/pull without audience distribution data.

### 61. When use a CDN?
**Ideal Answer:** “For built static assets and public cover media, reducing origin load and geography latency. The repository serves frontend with NGINX and image URLs but has no media storage pipeline shown.”
**Technical Explanation:** CDN caches immutable public objects near clients.
**Follow-up:** What should not be cached publicly?
**Follow-up Answer:** “Authenticated or personalized API responses and private media without signed access controls.”
**Code Reference:** `frontend/Dockerfile`, `frontend/nginx.conf`, `Post.js`.
**Common Mistake:** Assuming CDN solves API/database bottlenecks.

### 62. Monolith or microservices?
**Ideal Answer:** “Keep the current modular API while traffic/team size justify it. AI workers are a likely extraction candidate because their latency/cost profile differs, but a separate service adds deployment and consistency overhead.”
**Technical Explanation:** Service boundaries should follow scaling, ownership, and failure isolation needs.
**Follow-up:** What first boundary would you extract?
**Follow-up Answer:** “A worker service consuming durable AI jobs, not a network hop for every CRUD module.”
**Code Reference:** `backend/src/services/aiService.js`.
**Common Mistake:** Assuming microservices automatically improve scaling.

### 63. What does fault tolerance mean for this AI call?
**Ideal Answer:** “Bounded timeout, retry only retryable errors, circuit break sustained failures, fallback where quality permits, and maintain observable job states.”
**Technical Explanation:** Retries without limits can amplify provider outage and cost.
**Follow-up:** Which errors should not retry?
**Follow-up Answer:** “Invalid request/auth errors; retry transient timeout/5xx with bounded exponential backoff and jitter.”
**Code Reference:** `backend/src/services/aiService.js`.
**Common Mistake:** Retrying every failure indefinitely.

### 64. How would you improve availability?
**Ideal Answer:** “Use managed replicated database with tested failover, multiple API pods across failure domains, readiness/liveness probes, durable jobs, and tested backups. Current manifests alone don’t prove end-to-end HA.”
**Technical Explanation:** Availability is a system property across dependencies and operations.
**Follow-up:** What is the RTO/RPO?
**Follow-up Answer:** “Not specified; define business targets and validate via failover/restore drills.”
**Code Reference:** `k8s/`, `terraform/`, `backend/src/index.js`.
**Common Mistake:** Equating replicas with high availability.

### 65. How would you monitor performance?
**Ideal Answer:** “Track request latency percentiles, error rates, Mongo query/connection metrics, process resource use, socket counts, AI latency/cost, and queue lag once introduced.”
**Technical Explanation:** Golden signals expose saturation and user impact; traces correlate dependencies.
**Follow-up:** What currently exists?
**Follow-up Answer:** “Morgan dev logs and health JSON; no metrics/tracing/load-test config was found.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Calling view counts performance telemetry.

## E. Security Questions (66–75)

### 66. What is the highest-impact security issue?
**Ideal Answer:** “Runnable post code executes via `new Function` in the reader’s page, so content authors can run same-origin script. I’d remove it or isolate it in a strict sandbox.”
**Technical Explanation:** Same-origin execution can access application capabilities/storage; UI consent doesn’t create isolation.
**Follow-up:** Does iframe alone guarantee safety?
**Follow-up Answer:** “No. Use separate origin, restrictive sandbox flags, no same-origin privilege, CSP, and narrowly scoped messaging; remote execution needs resource limits.”
**Code Reference:** `frontend/src/components/reader/BlockRenderer.jsx`.
**Common Mistake:** Calling it sandboxed because it runs after a click.

### 67. Is there stored XSS risk?
**Ideal Answer:** “Yes, the reader uses `dangerouslySetInnerHTML` for post-controlled paragraph, heading, and callout strings. I’d render escaped text or sanitize with a strict allowlist.”
**Technical Explanation:** Stored content crosses from database to same-origin DOM as markup.
**Follow-up:** Does React escape normal children?
**Follow-up Answer:** “Yes, ordinary text children are escaped; raw HTML bypasses that default.”
**Code Reference:** `BlockRenderer.jsx`, `backend/src/routes/posts.js`.
**Common Mistake:** Assuming data from own database is trusted.

### 68. How secure is JWT secret configuration?
**Ideal Answer:** “There is a hard-coded fallback, so production must fail without an injected secret. Rotate it and invalidate tokens signed using the fallback.”
**Technical Explanation:** HMAC JWT security depends on secret entropy and secrecy.
**Follow-up:** Should secret be sent to the browser?
**Follow-up Answer:** “Never; only signed tokens are sent. Keep signing key in server-side secret management.”
**Code Reference:** `backend/src/middleware/auth.js`, `docker-compose.yml`.
**Common Mistake:** Treating `.env.example` placeholder as secure runtime config.

### 69. Is CORS a security boundary?
**Ideal Answer:** “It controls browser cross-origin access, not authentication. The API allows only explicitly configured frontend origins; an empty list rejects browser-origin requests. Non-browser clients can omit Origin, so endpoint authentication and authorization still matter.”
**Technical Explanation:** Non-browser clients ignore CORS; it should complement, not replace, auth.
**Follow-up:** What fix?
**Follow-up Answer:** “Keep an exact origin allowlist and test credentialed browser requests; CORS itself does not authenticate callers.”
**Code Reference:** `backend/src/index.js`.
**Common Mistake:** Saying CORS prevents attackers from calling the API.

### 70. How does the HttpOnly cookie change CSRF and XSS risk?
**Ideal Answer:** “JavaScript cannot read the JWT, reducing direct token exfiltration. Because the browser automatically sends cookies, unsafe requests need CSRF defenses; this API checks Origin and sets SameSite policy.”
**Technical Explanation:** HttpOnly protects cookie confidentiality from script, not actions performed by injected script. SameSite and Origin checks mitigate cross-site request forgery.
**Follow-up:** What changes for a cross-site frontend/API deployment?
**Follow-up Answer:** “Set `AUTH_COOKIE_SAME_SITE=none`, which requires Secure/HTTPS cookies, configure exact credentialed CORS origins, and test browser behavior.”
**Code Reference:** `frontend/src/utils/api.js`, `authStore.js`.
**Common Mistake:** Claiming HttpOnly cookies eliminate XSS or CSRF by themselves.

### 71. Is SQL or NoSQL injection confirmed?
**Ideal Answer:** “No SQL exists in the inspected app, and search escapes regex metacharacters before building a server-controlled query. I’d still validate types and never accept raw Mongo filters.”
**Technical Explanation:** Injection depends on untrusted input becoming query syntax, not just database brand.
**Follow-up:** What about object-shaped JSON values?
**Follow-up Answer:** “Reject them where a primitive is expected and use explicit allowlisted query construction.”
**Code Reference:** `backend/src/routes/search.js`.
**Common Mistake:** Claiming SQL injection in a Mongo app without evidence.

### 72. How should poll/quiz input be validated?
**Ideal Answer:** “Load the block, confirm its type, then require an integer option index within the options array before changing state.”
**Technical Explanation:** Validation should use authoritative server-side schema, not client controls.
**Follow-up:** What if options changed after page render?
**Follow-up Answer:** “Validate against current stored block and return a conflict if client state is stale.”
**Code Reference:** `backend/src/routes/posts.js` poll/quiz routes.
**Common Mistake:** Trusting the UI’s displayed button index.

### 73. What authorization gap exists in comments?
**Ideal Answer:** “The route creates a comment from `postId` and `parentId` but does not verify the parent is in that post or enforce reply depth.”
**Technical Explanation:** Relationship integrity must be checked across referenced IDs, not inferred from request path.
**Follow-up:** What is a robust rule?
**Follow-up Answer:** “Require visible target post; parent must exist and share post ID; enforce the intended maximum depth.”
**Code Reference:** `backend/src/routes/comments.js`.
**Common Mistake:** Assuming authentication alone authorizes a relationship.

### 74. How should the AI endpoint be protected?
**Ideal Answer:** “Add a dedicated per-user/IP quota, max input size, timeout/concurrency control, and usage tracking. The current global limit is not enough for provider cost control.”
**Technical Explanation:** Expensive operations need resource budgets separate from inexpensive reads.
**Follow-up:** Does `/ai/eli5` require auth?
**Follow-up Answer:** “No, current route is unauthenticated; product policy should decide, but it still needs abuse controls.”
**Code Reference:** `backend/src/routes/ai.js`, `backend/src/index.js`.
**Common Mistake:** Assuming global rate limit is a cost budget.

### 75. How would you assess dependency vulnerabilities?
**Ideal Answer:** “I would run the approved package and container scanners against lockfiles and images. The repository review alone did not establish a particular CVE.”
**Technical Explanation:** Dependency risk is time-sensitive and requires current advisory data.
**Follow-up:** How reduce supply-chain risk?
**Follow-up Answer:** “Lock dependencies, pin base-image digests, generate SBOM, scan CI artifacts, and update with test coverage.”
**Code Reference:** `backend/package.json`, `frontend/package.json`, Dockerfiles.
**Common Mistake:** Claiming a vulnerability without scanner/version evidence.

## F. Debugging And Performance (76–85)

### 76. Search gives empty post results. What do you inspect?
**Ideal Answer:** “I’d compare query predicates with stored schema. `search.js` filters `visibility`, but Post schema/creation don’t define it, which likely excludes normal records.”
**Technical Explanation:** A query can be syntactically valid but semantically incompatible with the model.
**Follow-up:** What fix is safest?
**Follow-up Answer:** “Define visibility and migration semantics, or remove the condition and consistently filter published/owned records; add integration coverage.”
**Code Reference:** `backend/src/routes/search.js`, `models/Post.js`.
**Common Mistake:** Tuning indexes before checking predicates.

### 77. Why does the frontend dev API call fail?
**Ideal Answer:** “Vite config has port 3000 but no `/api` proxy; Axios defaults to same-origin when `VITE_API_URL` is empty.”
**Technical Explanation:** Dev server origin and backend origin are distinct without proxy/config.
**Follow-up:** Why can Docker work?
**Follow-up Answer:** “Frontend NGINX proxies `/api/` to backend in the container network; that doesn’t configure Vite dev mode.”
**Code Reference:** `frontend/vite.config.js`, `frontend/src/utils/api.js`, `frontend/nginx.conf`.
**Common Mistake:** Assuming NGINX config applies to Vite.

### 78. Editing a draft by ID fails after refresh. Why?
**Ideal Answer:** “The editor loads via `postsAPI.list({author})`, but list route filters published posts; drafts aren’t returned. Add an owner-authorized draft fetch endpoint.”
**Technical Explanation:** Public collection queries and private edit workflows need different authorization scopes.
**Follow-up:** Should public `GET /posts/:slug` return drafts?
**Follow-up Answer:** “No; keep public slug read published-only and add a separately protected owner route.”
**Code Reference:** `frontend/src/pages/WritePage.jsx`, `backend/src/routes/posts.js`.
**Common Mistake:** Removing the published filter globally.

### 79. Why does ELI5 fail with a post context?
**Ideal Answer:** “The route branch references `Post`, `blocksToText`, and `summarizeText` that are not imported or defined in that module.”
**Technical Explanation:** Branch-specific dependencies can remain hidden until optional inputs exercise the path.
**Follow-up:** How test without Groq?
**Follow-up Answer:** “Mock route dependencies and `aiService.eli5`; test post found, absent, and no `postId` branches.”
**Code Reference:** `backend/src/routes/ai.js`.
**Common Mistake:** Testing only the current UI request, which omits `postId`.

### 80. Poll totals drift. What is the likely race?
**Ideal Answer:** “Two requests can both read `votedUsers` before either save, then each writes a stale post copy. Option index is also unchecked.”
**Technical Explanation:** Check-then-write is not an atomic uniqueness constraint.
**Follow-up:** What test catches it?
**Follow-up Answer:** “Parallel same-user and different-user vote requests against a real Mongo test instance; assert one user vote and exact totals.”
**Code Reference:** `backend/src/routes/posts.js` poll route.
**Common Mistake:** Testing only sequential requests.

### 81. Why can comments look stale across clients?
**Ideal Answer:** “Comments use REST and no comment broadcast is present. A client may need refetch or optimistic local update; README’s realtime comment claim is unsupported.”
**Technical Explanation:** Durable API state is distinct from push synchronization.
**Follow-up:** Add sockets?
**Follow-up Answer:** “Only if real-time comments are required; authenticate joins, share adapter across pods, and preserve REST as source of truth.”
**Code Reference:** `backend/src/routes/comments.js`, `backend/src/index.js`.
**Common Mistake:** Confusing poll socket updates with all community features.

### 82. A post read is slow. What is your investigation sequence?
**Ideal Answer:** “Measure endpoint timing, inspect Mongo explain execution stats, count populated references and payload size, and isolate the view increment write from read query time.”
**Technical Explanation:** Decompose latency by network, query, population, serialization, and browser rendering.
**Follow-up:** What if docsExamined is high?
**Follow-up Answer:** “Align compound index with filter/sort, project fields, and retest under representative cardinality.”
**Code Reference:** `backend/src/routes/posts.js`, `models/Post.js`.
**Common Mistake:** Adding arbitrary indexes without query plans.

### 83. Frontend editor becomes sluggish with many blocks. What would you do?
**Ideal Answer:** “Profile render and state updates first. `updateBlock` maps the full block array and the page renders each block; split state or memoize stable children only if profiling shows benefit.”
**Technical Explanation:** Rendering cost depends on component tree and changed props, not just list size.
**Follow-up:** When virtualize?
**Follow-up Answer:** “When the block list is sufficiently large and viewport rendering dominates; virtualization complicates focus, keyboard navigation, and editing.”
**Code Reference:** `frontend/src/pages/WritePage.jsx`.
**Common Mistake:** Adding memoization without measuring.

### 84. AI metadata is stuck after pod restart. Why?
**Ideal Answer:** “The task is an unawaited promise in the API process, not persisted in a queue; process termination can lose it.”
**Technical Explanation:** In-memory work has no durable delivery guarantee.
**Follow-up:** How recover old pending posts?
**Follow-up Answer:** “A reconciliation worker can scan pending/old metadata by version and enqueue idempotently, with bounded batch rate.”
**Code Reference:** `backend/src/routes/posts.js`, `services/aiService.js`.
**Common Mistake:** Restarting repeatedly and expecting a lost promise to resume.

### 85. How do you avoid a misleading performance claim?
**Ideal Answer:** “State that no benchmark is checked in, define a workload, collect baseline percentiles and resource metrics, then compare under the same environment.”
**Technical Explanation:** Reproducible measurement requires workload, environment, and statistical comparison.
**Follow-up:** Which percentile matters most?
**Follow-up Answer:** “Usually p95/p99 for user-facing latency plus error/saturation; choose SLO based on product needs rather than one universal percentile.”
**Code Reference:** No benchmark/test config found; relevant API is `backend/src/index.js`.
**Common Mistake:** Turning anecdotal local speed into production throughput.

## G. Advanced And Challenging Follow-Ups (86–100)

### 86. What happens if AI output returns malformed JSON?
**Ideal Answer:** “`callAI` catches parse failure and returns null, allowing caller fallback. I’d add explicit JSON schema validation and record fallback status.”
**Technical Explanation:** Syntax validity does not ensure semantic validity or safe lengths.
**Follow-up:** Would retry solve it?
**Follow-up Answer:** “Maybe one bounded repair/retry for transient formatting, but validate and fall back; endless retries amplify cost.”
**Code Reference:** `backend/src/services/aiService.js`.
**Common Mistake:** Trusting model output because JSON parsed.

### 87. How prevent stale AI metadata after editing a post?
**Ideal Answer:** “The current generation reads a post and later saves fields; an edit/job race could make metadata correspond to an older content version. Add a content hash/version and conditional result update.”
**Technical Explanation:** Optimistic concurrency prevents stale asynchronous writes.
**Follow-up:** What if a job is already running?
**Follow-up Answer:** “Allow it to finish but discard output if its version differs; enqueue the latest version.”
**Code Reference:** `backend/src/services/aiService.js`, `Post.js`.
**Common Mistake:** Assuming task order equals completion order.

### 88. How make response links consistent without transactions?
**Ideal Answer:** “Prefer one authoritative `responseTo` field and query child responses. If both directions are stored, use a transaction or a repairable reconciliation process.”
**Technical Explanation:** Denormalized reverse indexes create consistency obligations.
**Follow-up:** Why keep `responses` array at all?
**Follow-up Answer:** “Only if it measurably improves a key read and its growth is bounded; otherwise query indexed `responseTo`.”
**Code Reference:** `backend/src/routes/posts.js`, `Post.js`.
**Common Mistake:** Duplicating relationship state without an invariant owner.

### 89. How make follow action idempotent?
**Ideal Answer:** “Expose explicit follow/unfollow semantics or desired-state PUT/DELETE rather than a blind toggle, and persist a unique user-target relationship.”
**Technical Explanation:** Retry-safe operations avoid double toggles and ambiguous state.
**Follow-up:** How update follower count?
**Follow-up Answer:** “Treat count as derived/atomic aggregate, with transaction or reconciliation strategy so it cannot diverge from relationship rows.”
**Code Reference:** `backend/src/routes/usersFeed.js`, `User.js`.
**Common Mistake:** Retrying a toggle after timeout, which may reverse success.

### 90. What is the outbox pattern and where might it help?
**Ideal Answer:** “Write domain change and an event record in one transaction, then publish the outbox asynchronously. It could ensure poll or job notifications are eventually emitted after DB commit.”
**Technical Explanation:** It bridges database transaction and non-transactional message broker without distributed transaction.
**Follow-up:** Does current code use it?
**Follow-up Answer:** “No; it saves then emits directly.”
**Code Reference:** `backend/src/routes/posts.js` poll route.
**Common Mistake:** Saying publish success guarantees socket delivery.

### 91. What is the risk in `new Function` beyond XSS?
**Ideal Answer:** “It also has no timeout, memory limit, or isolation, so runaway computation can freeze the UI thread. It executes same-origin code.”
**Technical Explanation:** Capability security and resource isolation are both missing.
**Follow-up:** Could Web Worker solve all of it?
**Follow-up Answer:** “A worker isolates UI thread but not necessarily origin privileges or resource exhaustion; use strict sandboxing and limits, preferably a separate origin/service.”
**Code Reference:** `frontend/src/components/reader/BlockRenderer.jsx`.
**Common Mistake:** Calling Web Worker a complete security sandbox.

### 92. How does the current search avoid regex injection, and what remains wrong?
**Ideal Answer:** “It escapes regex metacharacters before constructing case-insensitive regex, which reduces pattern injection. But regex scans may be expensive, and the post visibility predicate conflicts with schema.”
**Technical Explanation:** Syntax escaping and query cost/correctness are different issues.
**Follow-up:** What would you benchmark?
**Follow-up Answer:** “Execution stats and latency at realistic collection sizes; compare text index/search service semantics and visibility-correct results.”
**Code Reference:** `backend/src/routes/search.js`, `Post.js`.
**Common Mistake:** Treating escaping as sufficient performance/security policy.

### 93. How should status fields be treated in query policy?
**Ideal Answer:** “Public routes generally filter `status: 'published'`; owner-only profile can include drafts. Every endpoint needs explicit visibility rules, especially search and responses.”
**Technical Explanation:** Authorization is a query constraint, not only a route guard.
**Follow-up:** How test data leakage?
**Follow-up Answer:** “Create draft/archived records for users A/B and assert each public, owner, search, bookmark, response, and feed endpoint exposes only intended records.”
**Code Reference:** `routes/posts.js`, `routes/usersFeed.js`, `routes/search.js`.
**Common Mistake:** Testing only the direct post endpoint.

### 94. What is the effect of query `skip` with an unvalidated page number?
**Ideal Answer:** “Public post list caps limit at 50 but page is not strongly parsed/validated; feed uses raw page arithmetic and `+limit`. Negative, malformed, or huge values can create errors or expensive scans.”
**Technical Explanation:** Query parameters are untrusted strings and need bounds/type normalization.
**Follow-up:** What validation would you add?
**Follow-up Answer:** “Integer page >=1, limit within fixed maximum, reject NaN/negative; prefer cursor for deep paging.”
**Code Reference:** `backend/src/routes/posts.js`, `backend/src/routes/usersFeed.js`.
**Common Mistake:** Trusting query-string defaults as validation.

### 95. How would you design a migration from user arrays to relationship collections?
**Ideal Answer:** “Create indexed follow/bookmark edge collections with unique compound keys, dual-read or backfill safely, verify counts, switch writes, then remove old arrays after consistency checks.”
**Technical Explanation:** Online migrations need compatibility phases and observable reconciliation.
**Follow-up:** How prevent writes being missed during backfill?
**Follow-up Answer:** “Dual-write with idempotency or capture changes through a change stream/outbox, reconcile, then cut over.”
**Code Reference:** `backend/src/models/User.js`, `routes/usersFeed.js`.
**Common Mistake:** One-time copy while writes continue untracked.

### 96. How can exact quiz analytics be recovered if aggregates drift?
**Ideal Answer:** “Recompute option counts from `QuizResponse` grouped by post/block and compare to embedded totals; then repair or replace aggregates.”
**Technical Explanation:** Materialized views should be derivable from source-of-truth records.
**Follow-up:** How avoid repair racing new answers?
**Follow-up Answer:** “Use snapshot/versioning or transaction/controlled reconciliation window, then apply incremental events after the snapshot.”
**Code Reference:** `backend/src/models/Other.js`, `routes/posts.js`.
**Common Mistake:** Assuming cached counters are inherently authoritative.

### 97. Why is the EKS deployment not automatically production HA?
**Ideal Answer:** “It shows multiple API/frontend pods, but combined config has one Mongo pod/PVC, no autoscaler, local socket rooms, and unresolved secret/backup/monitoring concerns.”
**Technical Explanation:** Availability depends on dependencies, failure domains, and operational recovery—not replica count alone.
**Follow-up:** What would you move first?
**Follow-up Answer:** “Use managed replicated database with backup/restore; then externalize shared app state and validate ingress/TLS/monitoring.”
**Code Reference:** `k8s/inkwell.yaml`, `backend/src/index.js`, `terraform/`.
**Common Mistake:** Calling a Kubernetes manifest a production architecture by itself.

### 98. Which test would give the most confidence in auth ownership?
**Ideal Answer:** “Create two users and a post owned by A; assert A can edit/archive, B cannot, and anonymous requests receive 401. Also test optional-auth public reads.”
**Technical Explanation:** Security tests need negative cases and object-level authorization.
**Follow-up:** What about IDOR?
**Follow-up Answer:** “Use attacker-controlled valid IDs across every endpoint taking post/user/comment IDs and assert ownership/visibility constraints.”
**Code Reference:** `backend/src/routes/posts.js`, `comments.js`, `usersFeed.js`.
**Common Mistake:** Testing only that a logged-in user can write their own post.

### 99. How would you decide whether to extract AI into a microservice?
**Ideal Answer:** “Measure provider latency, queue backlog, independent scaling/cost, failure isolation, and team ownership. A worker process may be enough before a separately deployed service.”
**Technical Explanation:** Process boundary can isolate resources without requiring a full service API split.
**Follow-up:** What contract would you define?
**Follow-up Answer:** “Versioned job payload, idempotency key, status/result schema, retry policy, and correlation IDs.”
**Code Reference:** `backend/src/services/aiService.js`.
**Common Mistake:** Using service count as a proxy for architecture maturity.

### 100. If you had one week before public launch, what would you prioritize?
**Ideal Answer:** “Disable or isolate code execution; remove unsafe raw HTML or sanitize it; require strong secrets and restrict CORS; validate/authorize all write routes; add regression tests around known bugs and concurrency; verify TLS, DB auth/backups, and operational logs.”
**Technical Explanation:** Prioritize catastrophic trust-boundary risks and data integrity before premature capacity optimization.
**Follow-up:** How prove readiness?
**Follow-up Answer:** “Threat-model review, automated integration/security tests, dependency/image scans, load tests for critical endpoints, backup restore drill, and a monitored staging rollout.”
**Code Reference:** `BlockRenderer.jsx`, `auth.js`, `index.js`, route/model files, deployment configs.
**Common Mistake:** Spending the week adding caches while known code execution remains.

