# Technology Crosswalk: Internals, Replacement, And Scale

The [technology deep dive](02-technology-deep-dive.md) gives ten interview drills per architectural layer. This crosswalk makes the implications explicit for each major dependency named in the repository. Traffic notes are expected pressure points, not measured results.

| Technology | Internal role and location | If removed/replaced | High-traffic pressure and interview concept |
|---|---|---|---|
| **React / React DOM** | Component tree and DOM updates; `frontend/src/App.jsx`, pages/components. | Replacing requires a new UI runtime/component model; API/data contracts can remain. | Large editor/block trees may render heavily; measure state locality and reconciliation. |
| **Vite** | Dev server/build-time bundler; `frontend/vite.config.js`, package scripts. | Another bundler changes dev/build configuration, not backend contracts. | Build-time environment and asset pipeline matter; cache immutable assets at CDN. |
| **React Router** | Client route matching and guards in `App.jsx`. | URL/navigation layer must be reimplemented; backend routes stay independent. | Route splitting affects client load; client guards never replace API authorization. |
| **Zustand** | Shared auth/guest/loading state in `authStore.js`. | Context or another store can replace it; migrate persistence and actions. | Broad subscriptions can rerender components; store state is not server authority. |
| **Axios** | HTTP client and interceptors in `utils/api.js`. | Fetch can replace it, but base URL/auth/error handling must be rewritten. | Network/payload and server limits dominate; interceptors centralize behavior. |
| **CSS Modules** | Build-time local class scoping across components/pages. | Plain CSS or another styling system needs class/token migration. | Styling isn't API throughput; profile bundle, layout, and paint. |
| **Node.js** | JavaScript runtime/event loop for Express and asynchronous I/O. | Another runtime requires route/service rewrite; HTTP/data contracts can remain. | I/O waits share the event loop; CPU-heavy work blocks it. Monitor event-loop lag. |
| **Express** | Middleware/router composition in `backend/src/index.js` and `routes/`. | Fastify/Nest/etc. requires middleware and handler migration. | Capacity is bounded by CPU, connections, DB/provider; framework choice adds no queue. |
| **MongoDB** | Document datastore and indexes for domain records. | PostgreSQL migration needs schema mapping, query rewrite, data migration, and consistency plan. | Hot documents, indexes, pool, query distribution, and shard key matter; user count alone is insufficient. |
| **Mongoose** | ODM schemas, casts, populate, hooks, model APIs. | Native driver removes ODM conveniences but adds explicit mapping/validation work. | Populate/hook overhead matters; document hooks differ from query updates. |
| **JWT** | Signed bearer identity in `backend/src/middleware/auth.js`. | Sessions/cookies change storage, CSRF, scaling, and revocation model. | Verification is cheap relative to DB user lookup; key distribution/rotation matters across replicas. |
| **bcryptjs** | Adaptive password hash/compare in `backend/src/models/User.js`. | Argon2/native bcrypt needs hash-version support and staged rehashing. | Login is intentionally CPU-expensive; protect it with dedicated rate limits. |
| **Socket.IO** | Room membership and poll event delivery. | SSE/native WebSocket/polling changes transport and client code. | Connection count/fanout and cross-pod adapter matter; current events are ephemeral. |
| **OpenAI SDK** | Chat completion client using compatible endpoint in `backend/src/services/aiService.js`. | Provider-native SDK changes request/response adapter; keep domain fallback logic isolated. | Provider quota, latency, prompt tokens, and concurrency dominate. |
| **Groq API** | Optional inference endpoint configured by `GROQ_*`. | Heuristic fallbacks remain for some functions but not equivalent semantic quality. | External quota, latency, cost, and availability; queue to isolate spikes. |
| **Docker** | Packages backend/frontend runtime images. | Host deployment changes reproducibility and isolation. | Image size/pull/startup and resource limits matter; containers do not themselves scale requests. |
| **NGINX** | Serves SPA and proxies API/socket paths in frontend container. | Ingress/cloud proxy/another server must preserve SPA fallback and WebSocket upgrade behavior. | Static caching and connection proxying; timeouts must match workload. |
| **Kubernetes / EKS** | Deployments, services, ingress, probes; AWS-managed cluster. | Compose/PaaS/VM changes scheduling, scaling, rollout, and ops. | Replicas need shared dependencies/state; cluster ops/cost may exceed app needs. |
| **Terraform / AWS** | Provisions VPC, EKS, and ECR. | Manual/IaC alternative changes reproducibility and drift control. | State locking, IAM, NAT/data transfer, and cluster costs; IaC isn't app observability. |
| **Redis (not used)** | No implementation exists in repo. | Nothing to remove; proposed for shared limiter/cache/socket adapter/queue backend. | Adds availability/eviction/cost concerns; use only for a defined shared-state need. |

## Replacement Boundaries

The browser talks to versioned HTTP endpoints, so the UI framework can change without changing Mongo models. The AI service is isolated behind functions, so a provider adapter can change while preserving route behavior. Mongoose centralizes schema access. Socket.IO is wired directly into server/client, JWT storage is coupled to Axios/Zustand, and block shape is shared across frontend/backend without a separately versioned schema package; those changes have higher migration cost.
