# Parts 4–6: Codebase, Backend, And Database

## Part 4: Folder And File Walkthrough

### Repository Layout

| Path | Purpose and evidence |
|---|---|
| `frontend/src/App.jsx` | Client routes, guards, auth bootstrap, toaster. |
| `frontend/src/pages/` | Auth, home/feed, explore, post, profile, topic, bookmarks, writing screens. |
| `frontend/src/components/reader/` | Block rendering, reader mode toggle, ELI5 popover. `BlockRenderer.jsx` is a trust boundary because it renders HTML and runs code. |
| `frontend/src/components/community/` | Comment section, REST-oriented interactions. |
| `frontend/src/components/ui/` | Layout and post cards. |
| `frontend/src/store/authStore.js` | Zustand auth, guest state, login/register/logout, `/me` revalidation. |
| `frontend/src/utils/api.js` | Axios base URL, auth interceptor, route helpers. |
| `frontend/src/styles/` | Global styles. |
| `backend/src/index.js` | Middleware ordering, route mounts, socket server, DB startup and health route. |
| `backend/src/bootstrap.js` | Insert-if-absent default topics when topic collection is empty. |
| `backend/src/routes/` | REST route groups for auth, posts, comments, topics, users/feed, search, and AI. |
| `backend/src/middleware/auth.js` | JWT creation/verification and optional auth. |
| `backend/src/models/` | Mongoose User, Post, Comment, Topic, QuizResponse schemas and hooks. |
| `backend/src/services/aiService.js` | Groq-compatible calls, prompt/response normalization, deterministic fallbacks, background metadata. |
| `deploy/`, `k8s/`, `terraform/` | Alternative EC2/EKS/AWS infrastructure and deployment definitions. |

### API Route Inventory

All routes are under `/api/v1` (except Socket.IO transport):

| Route group | Endpoints and purpose |
|---|---|
| `/auth` | `POST /register`, `POST /login`, `GET /me`, `PUT /profile`. |
| `/posts` | `GET /`, `GET /:slug`, `POST /`, `PUT /:id`, `DELETE /:id` (archives), `POST /:id/like`, poll vote, quiz answer, `GET /:id/responses`. |
| `/comments` | List/create by post, like, delete. Creation validates non-empty content; parent/post relationship checks are incomplete. |
| `/topics` | List, create (authenticated), follow/unfollow. |
| `/users` | Toggle bookmark/list bookmarks, follow/unfollow author, get profile. |
| `/feed` | Authenticated personalized/latest published feed. |
| `/search` | Query users/topics/posts. Post visibility filter currently conflicts with Post schema. |
| `/ai` | Status, title/tag suggestions, ELI5, summary generation, comment ranking, writing assist, rewrite. Some operations are not exposed in the visible UI. |
| `/health` | Static `{status:'ok', platform:'Inkwell'}` response; not a DB readiness check. |
| Socket.IO | `join-post`, `leave-post`; server emits `poll-update`. |

Environment variable names evidenced by templates/code: `PORT`, `NODE_ENV`, `MONGO_URI`, `JWT_SECRET`, `FRONTEND_URL`, `GROQ_API_KEY`, `GROQ_MODEL`, and frontend build-time `VITE_API_URL`. No frontend environment template was found. Do not copy secret values into this guide.

### Important Modules And Data Structures

**Post blocks.** `Post.js` defines a subdocument shape with `id`, enumerated `type`, shared `content`, and optional nested `quiz`, `poll`, `code`, and `callout` objects. This flexible tagged union lets reader/editor code branch on `type`. The API does not demonstrate a complete schema validator for incoming blocks; Mongoose casts known fields but should not be treated as a complete business validation policy.

**AI text processing.** `aiService.js` implements `normalizeText`, `splitSentences`, `keywordCandidates`, `topKeywords`, `blocksToText`, `buildDraftSnapshot`, `summarizeText`, fallback title/tag generation, and output normalization. The fallback algorithm is deterministic and lightweight: sentence splitting, stopword filtering, frequency counting, and selecting initial sentences/keywords. It is not semantic summarization and may fail on abbreviations, multilingual text, or content whose key conclusion is not in the opening sentences.

**Authentication.** `auth.js` signs a user ID for seven days and loads the corresponding user on protected requests. The frontend's local token presence only gates routes; server middleware does the actual identity check. Ownership checks exist in some route paths, but are not uniformly enforced across every domain operation.

**Request/error behavior.** `index.js` installs CORS, JSON parser (10 MB), Morgan `dev`, global rate limiter (500/15 minutes, in-memory), and socket attachment before mounting routes. Route handlers often catch errors and return `500` with `err.message`; no centralized validation/error mapping is evidenced. The health endpoint does not check current MongoDB readiness after startup.

### End-To-End Operation Traces

#### 1. Register/login and load session

1. `AuthPage` calls `authStore.register` or `login`.
2. `authStore.js` calls the Axios helper; registration posts username/email/password/display name to `/api/v1/auth/register`, login posts email/password to `/login`.
3. `routes/auth.js` checks required fields and password length at least six for registration, normalizes email/username, checks for an existing user, and creates the user.
4. `User.js` hashes the supplied `passwordHash` field with bcrypt cost 12 in a `pre('save')` hook; `toPublic()` removes hash and email.
5. The route sets an HttpOnly cookie and returns `{ user }`; the store retains only the profile in memory.
6. On reload, `App.jsx` invokes `fetchMe`; `/auth/me` verifies the cookie and loads the user. On 401 the app clears in-memory auth.

**Edge cases:** duplicate check races can become generic 500 despite unique DB indexes; no login-specific rate limiter is evident; no token revocation endpoint exists.

#### 2. Publish or update a post

1. `WritePage` stores title, blocks, topic IDs, tags, status, response-to, and cover image in React state.
2. `save(status)` builds a payload; new posts call `postsAPI.create`, existing posts call `postsAPI.update`.
3. Axios sends the HttpOnly cookie with credentials. `auth` middleware verifies its JWT, fetches user, and attaches `req.user`.
4. `POST /posts` requires title, creates slug from title plus timestamp, and calls `Post.create`. `PUT /posts/:id` fetches by both ID and author ID, changes supplied fields, and saves.
5. Published posts launch `generatePostMeta` and return without awaiting it. Response posts additionally update the parent post's `responses` list, without a transaction.
6. The writer navigates to `/post/:slug`; metadata may still be pending.

**Edge cases:** title is required but request body schema is otherwise loose; publish metadata jobs can duplicate or be lost on restart; response-link updates may partially succeed; draft reload in `WritePage` queries public listing, which filters `status: 'published'`, so editing an unpublished draft after reload is broken through that load path.

#### 3. Read a post in a selected mode

1. `PostPage` calls `postsAPI.get(slug, { readerMode })`.
2. Optional auth populates `req.user` if a valid session cookie is present; invalid cookies silently continue as anonymous.
3. `GET /posts/:slug` finds only published posts and populates author/topics/responses.
4. It increments `stats.views` with a separate `$inc` update.
5. Quick mode omits blocks and returns summary/takeaway; exam mode omits blocks and returns exam bullets/detail; deep mode removes `quiz.correctIndex` from blocks.
6. Authenticated responses include `isLiked` and `isBookmarked`; frontend renders blocks/comments and can join the post socket room.

**Edge cases:** every detail read writes the database; summary content can be absent while metadata is pending; only deep-mode quiz redaction is explicit in this route, so all serialization paths should be audited for answer leakage.

#### 4. Vote in a poll

1. `PollBlock` sends the chosen index through `onPollVote`; `PostPage` calls `postsAPI.pollVote`.
2. `POST /posts/:id/blocks/:blockId/poll-vote` authenticates the request, loads the whole post, finds the poll block, checks `votedUsers`, updates Map counts/total and appends user ID.
3. It saves the post, emits `poll-update` to room `post:<id>`, and returns counts.
4. Connected clients update local counts from the event.

**Edge cases:** `optionIndex` range/type is not checked; concurrent read-modify-save votes can double-vote or lose counts; embedded voter arrays grow; cross-replica socket events are not shared.

#### 5. Submit a quiz answer

1. `QuizBlock` posts `selectedIndex` through `postsAPI.quizAnswer`.
2. Route loads post and quiz block, checks for existing `(post, block, user)` response, compares answer with `correctIndex`, and inserts `QuizResponse`.
3. It initializes/updates embedded option counts and total responses on Post, saves, and returns result/correct index/explanation.

**Edge cases:** selected index is not validated; unique index handles duplicate answer races but duplicate-key errors may become 500; response insert and post aggregate write are two separate operations and can diverge.

Other traced operations worth knowing:

- **Comment:** `CommentSection` → `commentsAPI` → `POST /comments/post/:postId`; verifies non-empty content but code path does not verify post existence, parent ownership, or reply depth. Comments are REST only.
- **Follow author:** `POST /users/:id/follow` mutates both current user's `followedAuthors` and target's `followers`, using two saves concurrently without a transaction.
- **Search:** `searchAPI.query` → `GET /search`, regex-escapes input, queries topics/users/posts. Post visibility predicate references a field not in `Post` schema, so ordinary search results may be empty.

## Part 5: Backend Engineering Deep Dive

| Topic | Existing implementation | Production-grade improvement (proposed) |
|---|---|---|
| API design | REST route groups under `/api/v1`; resource routes and action endpoints for like/vote/answer. | Document request/response schemas, pagination contracts, stable error format, OpenAPI spec. |
| HTTP status | 201 for creation; 400 for missing required fields; 401 auth; 404 missing resources; 409 some duplicates; broad 500 catch. | Map validation to 400/422, auth to 401, permission to 403/404 by policy, duplicate conflicts to 409; never surface internals. |
| Validation | Select route-level checks and Mongoose schema constraints. Poll/quiz indexes not validated; nested block schema lacks full domain rules. | Zod/Joi/express-validator boundary schemas, string/array length bounds, allow-listed block types, option indexes, IDs, URLs. |
| Middleware | CORS, JSON parser, Morgan, global rate limiter, attach `io`; route auth middleware. | Security headers, request IDs, central error handler, proxy trust config, dedicated auth/AI limiters. |
| Authentication | JWT in HttpOnly cookie; bcrypt 12; optional auth continues if invalid. | Require secret on boot, rotate keys, define revocation/session policy, and add login throttling. |
| Authorization | Post update/archive owner check; comment deletion owner check; protected APIs. | Audit every referenced resource and child relation (post/comment/block), establish consistent visibility policy, add authorization tests. |
| Business logic | Route files combine persistence and behavior; `aiService` isolates provider/prompt logic. | Extract domain service functions where transactions and validation need unit tests; avoid premature microservices. |
| Async | Await database calls; AI generation is launched as promise in API process. | Durable queue, idempotency key/version, bounded retries, timeouts, cancellation, status visibility. |
| Concurrency | Some `$inc` use for views; several toggles and counters use read-modify-save. | Conditional atomic updates, unique action records, transactions/outbox for multi-doc operations. |
| Error handling | Local try/catch and `err.message` returned on 500. | Centralized typed errors, safe public messages, structured logs, correlation ID, client error contract. |
| Logging | Morgan `dev`, console logs and errors in AI service. | Structured JSON logs, redaction, request/job IDs, central aggregation, severity and retention policy. |
| Rate limiting | Global express-rate-limit 500/15 minutes; in-memory default. | Distributed store (Redis), route-specific quotas, account/IP dimensions, proxy trust tested, abuse metrics. |
| Pagination | Posts use skip/limit capped at 50; personalized feed uses skip/limit without same cap. | Validate/cap all query params; cursor pagination on `(publishedAt, _id)`; avoid expensive exact counts if unnecessary. |
| Caching | No application cache found. | Cache stable public projections with versioned invalidation; never mix personalized `isLiked`/bookmark state in shared cache. |
| DB connections | `mongoose.connect` once before server listens; default local URI fallback. | Configure pool/timeouts, graceful shutdown, reconnect/readiness behavior, managed DB and backups. |
| Transactions | No explicit transaction usage found. | Use replica-set transactions for multi-document invariants where justified, or redesign around one source of truth/outbox. |
| Idempotency | Quiz unique key helps; toggle routes are not idempotent; publish has no idempotency key. | Define retry-safe semantics, command IDs, unique constraints, idempotent job writes. |
| Versioning | URL prefix `/api/v1`. | Compatibility policy, schema contract tests, deprecation process; don't create versions for additive changes. |

**Difficult interviewer prompts**

- **“What is the difference between authentication and authorization here?”** Authentication in `auth` verifies JWT and loads `req.user`; authorization decides whether that user may edit a particular post or delete a comment. Both must happen server-side.
- **“Why not return `err.message`?”** It may expose internal details and creates unstable client contracts. Log detailed errors privately; return safe message/code plus correlation ID.
- **“Would a transaction fix every race?”** No. Transactions offer atomicity for coordinated DB writes but may increase contention and don't make external AI calls transactional. Use the simplest invariant-enforcing design.
- **“How would you make a toggle endpoint retry safe?”** Replace ambiguous toggle semantics with explicit `PUT /resource/like` and `DELETE /resource/like`, or accept idempotency keys; store a unique user-action record and derive count.

## Part 6: Database Design And Internals

### Models And Relationships

- **User (`backend/src/models/User.js`):** unique lowercase username/email, password hash, profile fields, follows, follower IDs, bookmarks, reader-mode prefs. Arrays are convenient but can grow without bound.
- **Post (`backend/src/models/Post.js`):** required author/title, unique slug, embedded typed blocks, topic references, tags, AI metadata/status, response links, status/publish time, counters/likedBy. Pre-save calculates read time.
- **Comment (`backend/src/models/Other.js`):** references post/author/optional parent; content max 2000; likes, likedBy, top-comment fields.
- **Topic:** unique slug, parent reference, counts.
- **QuizResponse:** post/block/user/selected index/correctness/time; unique compound key on post/block/user.

### Queries And Indexes

Likely frequent query shapes shown by source:

1. Published post feed sorted by `publishedAt`, with optional topic/author/tag filters and limit/skip.
2. Post lookup by unique slug, plus author/topic/response population.
3. User lookup by unique username/email and author post list.
4. Comments by `postId`, `parentId`, newest-first.
5. Quiz response by `(postId, blockId, userId)`.
6. Text/regex search over post titles/tags and user/topic fields.

Declared indexes include post slug, author, topics, status, publishedAt; compounds `{topics:1,publishedAt:-1}` and `{authorId:1,publishedAt:-1}`; tags and text `{title:'text',tags:'text'}`. Comment compound `{postId:1,parentId:1,createdAt:-1}`; user email/username and topic slug are unique; quiz responses unique on `{postId:1,blockId:1,userId:1}`.

**Index caveat:** indexes are hypotheses from query shapes; confirm with explain plans and production cardinality. Search currently uses escaped case-insensitive regular expressions in `search.js`, not the declared text index. Regex search can scan many documents, and the query also filters on absent `visibility` field. A text index is not automatically used by regex.

### Interview Answers To Core Database Questions

- **Why MongoDB instead of PostgreSQL?** “Post-centric block content maps naturally to documents and the read path often needs the whole post. That’s a fit, not proof MongoDB is universally better. PostgreSQL would be attractive if cross-entity constraints, joins, reporting, or transactional relationship updates dominate.”
- **Which queries are hottest?** “The code suggests published feed, post detail, profile lists, comments, auth user lookup, and engagement writes. Actual frequency is unverified; I’d instrument before tuning.”
- **Which indexes would you add?** “Validate the compound index for status plus publishedAt sort, perhaps `{status:1,publishedAt:-1,_id:-1}` for cursor feed; query-specific combinations for topic filters; verify current indexes with explain and workload data first.”
- **How handle concurrent updates?** “Avoid read-modify-save for counts/toggles. Use conditional atomic updates or unique vote records; transactions only when multiple document invariants must be committed together.”
- **How avoid duplicates?** “Unique indexes enforce slug, user identity, and quiz response identity. Route pre-checks improve UX but aren't concurrency guarantees; catch duplicate-key errors.”
- **How optimize slow queries?** “Capture representative query and `explain('executionStats')`, inspect docs examined vs returned, add/adjust indexes, project fewer fields, eliminate deep skip/populate overhead, then benchmark with realistic cardinality.”
- **When normalize or denormalize?** “Normalize growing many-to-many/event data and strong transactional relationships; denormalize small, read-hot summaries when update policy and staleness are understood.”
- **When redesign/migrate?** “When measured access patterns and integrity requirements show persistent query or write contention that indexing/cursor/atomic redesign can't solve, and the migration cost is justified.”

### Database Internals And Operational Gaps

MongoDB provides atomicity at the single-document level; multi-document transactions are available under replica-set/sharded-cluster conditions, but none are explicitly used here. Unique indexes are key data-integrity constraints. Mongoose references are not SQL foreign keys and don't cascade automatically. The code connects through `mongoose.connect` without visible pool tuning or graceful close handler. No backup/recovery policy, replication configuration, migration process, or database restore procedure is evidenced. Local Compose publishes MongoDB externally and does not configure database auth in its Mongo service, so it is a development convenience, not a hardened deployment.
