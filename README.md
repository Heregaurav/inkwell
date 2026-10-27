# Inkwell

Inkwell is a publishing and knowledge-sharing application for writing, reading, and discussing structured posts. It combines a React client with an Express API backed by MongoDB, plus optional Groq-powered writing and reading assistance. Posts support interactive blocks and multiple reading modes; the AI layer uses direct prompts and local fallbacks, not a retrieval or agent framework.

## Architecture Overview

```mermaid
flowchart LR
  User[Reader or author]
  Browser[React SPA: Vite, Zustand, Axios]
  Proxy[Vercel API function in production]
  API[Express API and Socket.IO]
  Auth[JWT cookie authentication]
  DB[(MongoDB via Mongoose)]
  Groq[Groq chat completions, optional]

  User --> Browser
  Browser -->|/api/v1, HTTP-only cookie| Proxy
  Proxy -->|BACKEND_ORIGIN, forwards request/cookie| API
  API --> Auth
  Auth <--> DB
  API <--> DB
  API --> Groq
  Browser -.->|/socket.io| API
```

Locally, Vite proxies API and Socket.IO requests. In the hosted setup, Vercel rewrites `/api/*` to a Node function using the server-side `BACKEND_ORIGIN` environment variable. Its current rewrite does not proxy WebSocket upgrades, so production Socket.IO needs a separate route or host.

## Cloud Deployed Architecture

The project is designed for a cloud deployment pattern where the browser talks to a Vercel-hosted frontend, the frontend uses a server-side proxy for API requests, and the backend runs as a separate Render web service with MongoDB persistence.

```mermaid
flowchart LR
  User[User browser]
  Frontend[Frontend on Vercel\nReact + Vite SPA]
  Proxy[Vercel API proxy\nfrontend/api/proxy.js]
  Backend[Render backend\nExpress API + Socket.IO]
  Auth[JWT auth + CORS validation]
  Cookie[HTTP-only cookie\ninkwell_session]
  Mongo[(MongoDB\nmanaged or self-hosted)]
  Groq[Groq API\noptional AI provider]
  State[Browser state\nZustand + Axios]

  User -->|HTTPS page load| Frontend
  Frontend -->|reads app state| State
  Frontend -->|login / register / protected calls| Proxy
  Proxy -->|BACKEND_ORIGIN\nforwards method, headers, body, cookies| Backend
  Backend --> Auth
  Auth -->|validates session and origin| Cookie
  Backend -->|reads/writes posts, users, comments| Mongo
  Backend -->|generates titles, tags, summaries| Groq
  Backend -->|Set-Cookie: inkwell_session| Cookie
  Cookie -->|included on later API requests| User
  Proxy -->|JSON response + Set-Cookie| Frontend
  Frontend -->|renders protected UI| User
```

This is the currently intended hosted topology for the repository: the frontend is public and stateless, the backend owns authentication and persistence, and the backend origin is configured server-side in the hosting provider.

### Deployment Notes

- `frontend/api/proxy.js` receives `/api/*` traffic on Vercel and forwards it to the server-side `BACKEND_ORIGIN` environment variable.
- `Render` hosts the Express API and the authenticated business logic.
- `FRONTEND_URL` on Render must match the live frontend origin exactly for cookie and CORS checks to pass.
- `BACKEND_ORIGIN` on Vercel should be the HTTPS backend origin, for example `https://your-service.onrender.com`. The proxy also normalizes trailing slashes, surrounding quotes, default HTTPS ports, and an optional `/api` or `/api/v1` suffix. Set it for the deployment's Production or Preview environment and redeploy after changes.
- The diagram above reflects the verified production pattern in this repo; the Kubernetes/AWS section below is an alternative deployment option, not the default hosting model.

### AWS EKS Deployment (Alternative)

AWS EKS is an alternative to Vercel/Render, provisioned with Terraform and `deploy/eks-deploy.sh`.

```mermaid
flowchart TB
  subgraph Top[Runtime and deployment]
    direction LR

    subgraph Runtime[Runtime Deployment]
      direction TB

      subgraph Edge[Ingress + User Traffic]
        direction TB
        Browser[Browser\nUser traffic]
        ALB[Application Load Balancer\nHTTP entry point]
        Ingress[Ingress Controller\nroutes / to frontend, /api and /socket.io to backend]
        Browser -->|HTTP| ALB --> Ingress
      end

      subgraph Kube[Amazon EKS Cluster]
        direction TB
        subgraph L1[Layer 1: Services]
          direction LR
          FrontendService[Frontend Service\n80 -> 8080]
          BackendService[Backend Service\n5000]
        end

        subgraph L2[Layer 2: Deployments]
          direction LR
          FrontendDeploy[Frontend Deployment\n2 replicas\nNGINX + static app]
          BackendDeploy[Backend Deployment\n2 replicas\nExpress + Socket.IO]
        end

        subgraph L3[Layer 3: Runtime Pods]
          direction LR
          FrontendPod[Frontend Pod\nNGINX container\nport 8080]
          BackendPod[Backend Pod\nNode.js app\nport 5000]
        end
      end

      subgraph Data[Runtime Dependencies]
        direction LR
        Mongo[(External MongoDB\nmanaged database)]
        DemoMongo[(Optional in-cluster demo MongoDB\nPVC-backed)]
        Groq[External Groq API\noptional AI provider]
        Secret[Kubernetes Secrets\nMONGO_URI / JWT_SECRET / FRONTEND_URL]
      end
    end

    subgraph Dev[Developer + Build Flow]
      direction TB
      Developer[Developer]
      Terraform[Terraform]
      Script[deploy/eks-deploy.sh]
      AWS[AWS VPC + EKS + ECR]
      Build[Build frontend and backend images]
      Registry[(Amazon ECR repositories)]
    end
  end

  Developer -->|provisions infra| Terraform
  Terraform --> AWS
  Developer -->|deploys stack| Script
  Script --> Build --> Registry
  Registry -. image pulls .-> FrontendDeploy
  Registry -. image pulls .-> BackendDeploy
  AWS -->|provisions EKS| Ingress
  Script -->|kubectl apply manifests| Ingress

  Ingress -->|/| FrontendService
  Ingress -->|/api and /socket.io| BackendService

  FrontendService --> FrontendDeploy --> FrontendPod
  BackendService --> BackendDeploy --> BackendPod
  FrontendPod -->|/api proxy| BackendService
  BackendPod -->|reads/writes app data| Mongo
  BackendPod -. optional AI generation .-> Groq
  BackendPod -. alternative demo database .-> DemoMongo
  Secret -. injected into .-> FrontendPod
  Secret -. injected into .-> BackendPod
```

Terraform provisions the VPC, EKS Auto Mode cluster, and ECR. The deployment script builds and pushes images, then applies Kubernetes resources. Backend credentials, including `MONGO_URI`, come from a Kubernetes Secret. MongoDB is external; Terraform does not create it. `k8s/inkwell.yaml` has a single-replica MongoDB/PVC demo, not a production database. The ALB is HTTP-only; configure TLS before production.

## Core System Design

**Frontend layer**

- `frontend/src/main.jsx` initializes React; `frontend/src/App.jsx` defines user and guest routes. Pages cover authoring, reading, discovery, profiles, community, and bookmarks.
- TipTap supports authoring; Zustand stores auth state; Axios calls APIs through `frontend/src/utils/api.js`.
- `frontend/api/proxy.js` forwards production API requests. `frontend/vite.config.js` configures local API and Socket.IO proxies.

**API and domain layer**

- `backend/src/index.js` configures Express, Socket.IO, logging, limits, routes, and health; it listens after MongoDB/topic initialization. `backend/src/routes/` covers auth, content, discovery, and AI; protected mutations use auth middleware.

**Identity and persistence layer**

- `backend/src/middleware/auth.js` verifies the HTTP-only `inkwell_session` JWT. Passwords use bcryptjs; the frontend checks `/api/v1/auth/me` on startup.
- `backend/src/models/` defines users, posts, topics, comments, and quiz responses. `backend/src/bootstrap.js` inserts default topics when needed.

**AI and realtime layer**

- `backend/src/services/aiService.js` calls Groq through the OpenAI SDK and normalizes responses with local fallbacks. Published-post metadata runs asynchronously through BullMQ/Redis in a separate worker; other user-requested AI endpoints remain synchronous.
- Socket.IO shares the backend server. REST persists poll votes and post rooms receive `poll-update` events.

## Key Features

- **Publishing and reading:** Posts contain rich blocks and support full, quick-summary, and exam-note modes. Mongoose computes estimated reading time.
- **Community:** Comments, replies, likes, bookmarks, follows, and response posts use protected API mutations.
- **Interactive blocks:** Poll votes persist and broadcast through Socket.IO; a compound index prevents duplicate quiz answers.
- **AI assistance:** Groq optionally powers title/tag suggestions, writing help, rewriting, ELI5, summaries, and comment ranking; local fallbacks cover several operations.
- **Discovery:** Feed, topic, profile, and lexical search use MongoDB; vector retrieval is not implemented.

## Core Application Flow

This sequence shows login followed by protected post publishing; a separate worker generates metadata asynchronously after the API response.

```mermaid
sequenceDiagram
  actor Author
  participant UI as React client
  participant Proxy as Vercel proxy or local Vite proxy
  participant API as Express API
  participant Auth as JWT cookie middleware
  participant DB as MongoDB
  participant Queue as Redis + BullMQ
  participant Worker as Background worker
  participant AI as Groq, optional

  Author->>UI: Submit email and password
  UI->>Proxy: POST /api/v1/auth/login
  Proxy->>API: Forward JSON request
  API->>DB: Find user and compare password hash
  DB-->>API: User record
  API-->>Proxy: User JSON and Set-Cookie
  Proxy-->>UI: Forward response and HTTP-only cookie
  Author->>UI: Publish a post
  UI->>Proxy: POST /api/v1/posts with session cookie
  Proxy->>API: Forward request and cookie
  API->>Auth: Validate JWT and load user
  Auth->>DB: Find user from JWT subject
  DB-->>Auth: Authenticated user
  API->>DB: Create post
  DB-->>API: Saved post with pending metadata key
  API->>Queue: Enqueue metadata job
  API-->>UI: 201 { post }
  Worker->>Queue: Consume metadata job
  Worker->>DB: Load and claim published post
  Worker->>AI: Generate metadata
  AI-->>Worker: Metadata result
  Worker->>DB: Save metadata and mark job done
```

## Technology Stack

- **Frontend:** React 18, React Router, Vite, CSS Modules, Zustand, Axios, TipTap, Socket.IO Client, Lucide React.
- **Backend:** Node.js, Express, Socket.IO, Mongoose, BullMQ, ioredis, Morgan, CORS, express-rate-limit.
- **Database:** MongoDB; no SQL store or migration framework is configured.
- **Authentication:** bcryptjs password hashing, jsonwebtoken, cookie-parser, HTTP-only session cookie.
- **AI integration:** OpenAI JavaScript SDK pointed at Groq’s OpenAI-compatible API; `GROQ_MODEL` defaults in code to `openai/gpt-oss-20b`. AI is optional.
- **Deployment:** Vercel frontend with Render API, background worker, and Key Value Redis; Docker Compose and alternative AWS EKS/EC2 assets are separate deployment paths.

RAG, embeddings/vector databases, knowledge graphs, autonomous agents, and supervisor-worker orchestration are **not implemented**.

## Repository Structure

```text
inkwell/
├── backend/
│   ├── src/index.js          # API and process startup
│   ├── src/routes/           # REST endpoints
│   ├── src/models/           # MongoDB schemas
│   ├── src/services/         # AI helpers and fallbacks
│   └── Dockerfile
├── frontend/
│   ├── api/proxy.js          # Vercel server-side API proxy
│   ├── src/pages/             # Application views
│   ├── src/components/        # UI components
│   ├── src/store/             # Client state
│   ├── src/utils/api.js       # API client
│   ├── vercel.json            # Vercel rewrites
│   └── Dockerfile, nginx.conf
├── deploy/                   # EC2 and EKS deployment scripts
├── k8s/                      # Kubernetes manifests
├── terraform/                # AWS infrastructure definitions
├── docker-compose.yml        # Local container stack
└── ARCHITECTURE.md, *_DOCUMENTATION.md
```

## Getting Started

**Prerequisites:** Node.js 20+, npm, and MongoDB. Groq credentials are optional. Commands start from the repository root unless noted.

Install dependencies:

```bash
cd backend && npm ci
cd ../frontend && npm ci
```

Configure the backend:

```bash
cd ../backend
cp .env.example .env
```

Set `MONGO_URI` and a unique `JWT_SECRET` in `backend/.env`. Vite proxies to `localhost:5000`; `VITE_API_URL` can override it. `GROQ_API_KEY` is optional. Never commit populated `.env` files.

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

The API listens on `PORT` (default 5000) after MongoDB and topic setup. Verify `http://localhost:5000/api/v1/health` returns `{"status":"ok","platform":"Inkwell"}`.

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. Vite forwards `/api` and `/socket.io`. From `frontend/`, run `npm run test:proxy` and `npm run build`.

For Vercel/Render environment setup, Docker, Kubernetes, troubleshooting, and the complete API reference, see [DEPLOYMENT.md](DEPLOYMENT.md), [DOCKER_AND_INFRASTRUCTURE.md](DOCKER_AND_INFRASTRUCTURE.md), [TROUBLESHOOTING.md](TROUBLESHOOTING.md), and [API_DOCUMENTATION.md](API_DOCUMENTATION.md).

## Why This Architecture Matters

The SPA, API, persistence, and AI provider have separate responsibilities. Cookie sessions keep JWTs out of JavaScript. Trade-offs include non-durable AI work, no backend tests, and hosted Socket.IO routing requirements.
