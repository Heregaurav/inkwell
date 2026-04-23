# ✦ Inkwell — The Thinking Blog Platform

A complete full-stack blog platform with AI writing assistance, interactive reader modes, embedded quizzes/polls, threaded discussions, and real-time engagement.

![Stack](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Stack](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js)
![Stack](https://img.shields.io/badge/MongoDB-7-47A248?style=flat-square&logo=mongodb)
![Stack](https://img.shields.io/badge/Socket.io-4-010101?style=flat-square&logo=socket.io)

---

## ✨ What Makes Inkwell Different

| Feature | Medium | Substack | Inkwell |
|---------|--------|----------|---------|
| Reader Modes (3 modes) | ✗ | ✗ | **✓** |
| Embedded Quizzes | ✗ | ✗ | **✓** |
| Real-time Polls | ✗ | ✗ | **✓** |
| ELI5 Simplification | ✗ | ✗ | **✓** |
| AI Title + Tag Suggest | Basic | ✗ | **✓** |
| Response Blogs | ✗ | ✗ | **✓** |
| Runnable Code Blocks | ✗ | ✗ | **✓** |
| Topic Following | Tags only | ✗ | **✓** |

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React Frontend  │────▶│  Express API     │────▶│  MongoDB    │
│  (Vite + CSS    │◀────│  + Socket.io     │◀────│  (Atlas or  │
│   Modules)      │     │  + AI Service    │     │   local)    │
│   Port 3000     │     │   Port 5000      │     │  Port 27017 │
└─────────────────┘     └──────────────────┘     └─────────────┘
                                  │
                           ┌──────▼──────┐
                           │  OpenAI     │
                           │  GPT-4o API │
                           └─────────────┘
```

## 📁 Project Structure

```
inkwell/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/           # Layout, PostCard
│   │   │   ├── reader/       # BlockRenderer, ReaderModeToggle, ELI5Popover
│   │   │   └── community/    # CommentSection (threaded)
│   │   ├── pages/
│   │   │   ├── HomePage      # Feed with For You / Latest tabs
│   │   │   ├── PostPage      # Reading with 3 modes + interactions
│   │   │   ├── WritePage     # Block editor with AI assist
│   │   │   ├── AuthPage      # Login / Register
│   │   │   ├── ProfilePage   # Author profile + follow
│   │   │   ├── TopicPage     # Topic feed + follow
│   │   │   ├── ExplorePage   # Browse all topics
│   │   │   └── BookmarksPage # Saved posts
│   │   ├── store/            # Zustand auth store
│   │   └── utils/api.js      # Axios + all API calls
├── backend/
│   ├── src/
│   │   ├── models/           # User, Post, Comment, Topic, QuizResponse
│   │   ├── routes/           # auth, posts, comments, topics, users, feed, ai
│   │   ├── middleware/       # JWT auth
│   │   ├── services/
│   │   │   └── aiService.js  # GPT-4o calls (summaries, titles, tags, ELI5)
│   │   ├── index.js          # Express + Socket.io server
│   │   └── seed.js           # Demo data seeder
└── deploy/
    └── setup.sh              # EC2 one-click deploy
```

---

## 🚀 Local Development

### Prerequisites
- Node.js 20+
- MongoDB (local or Atlas URI)
- OpenAI API key (optional — platform works without it, AI features use fallbacks)

### 1. Clone & install

```bash
git clone <your-repo>
cd inkwell

# Install backend deps
cd backend && npm install

# Install frontend deps
cd ../frontend && npm install
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
# Edit .env — at minimum set MONGO_URI if not using local MongoDB
# Add OPENAI_API_KEY for real AI features
```

### 3. Seed demo data (optional)

```bash
cd backend
node src/seed.js
# Creates demo user: demo@inkwell.io / demo1234
# Creates topics and a sample post
```

### 4. Start backend

```bash
cd backend
npm run dev     # nodemon, auto-restarts
# or
npm start
```

### 5. Start frontend

```bash
cd frontend
npm run dev
# Opens at http://localhost:3000
# API proxied to http://localhost:5000
```

---

## 🐳 Local Container Pipeline

For a containerised local run, the repo includes [`docker-compose.yml`](/home/gaurav/Desktop/projects/DEVSECOPS/inkwell/docker-compose.yml).

### What it starts
- `mongodb` on `27017` with a persistent Docker volume
- `inkwell-backend` on `5000`
- `inkwell-frontend` on `3000` mapped to Nginx inside the container on `8080`

### Health checks
- MongoDB: `db.adminCommand('ping').ok`
- Backend: `http://localhost:5000/api/v1/health`
- Frontend waits for the backend container to become healthy before starting

### Run it

```bash
docker compose up --build
```

### Runtime notes
- Backend container defaults to `MONGO_URI=mongodb://mongodb:27017/inkwell_db`
- Production-sensitive values such as `JWT_SECRET`, `FRONTEND_URL`, and `OPENAI_API_KEY` are read from environment variables
- The backend exposes `/api/v1/health`, which is also reused by Kubernetes probes and ALB health checks

---

## 🚀 Deploy on AWS EC2

### Prerequisites
- EC2 instance: Ubuntu 22.04+, t3.small or larger
- Security Group: inbound 22 (SSH), 80 (HTTP)

```bash
# From your local machine
scp -r -i your-key.pem ./inkwell ubuntu@<EC2_IP>:~/inkwell

# SSH in
ssh -i your-key.pem ubuntu@<EC2_IP>

# Run setup
cd ~/inkwell
chmod +x deploy/setup.sh
./deploy/setup.sh
```

**After deploy:** Edit `backend/.env` to add your `OPENAI_API_KEY`, then `pm2 restart inkwell-api`.

---

## 🚀 Deploy on AWS EKS

### What is included
- `terraform/` provisions VPC + EKS cluster (Auto Mode)
- `backend/Dockerfile` and `frontend/Dockerfile` build production images
- `k8s/` contains app manifests for namespace, deployments, services, and secrets
- `k8s/ingressclass-alb.yaml` + `k8s/ingress.yaml` expose the app via AWS ALB Ingress
- `deploy/eks-deploy.sh` builds/pushes images to ECR and deploys to EKS

### Prerequisites
- AWS CLI authenticated to your account
- Docker installed and running
- `kubectl` installed
- Existing EKS cluster (for this repo, defaults are in `terraform/terraform.tfvars`)

### 1. Provision the cluster (if not already created)

```bash
cd terraform
terraform init
terraform apply
```

### 2. Create app secret

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.example.yaml
kubectl edit secret inkwell-secrets -n inkwell
```

Set at least:
- `MONGO_URI` (recommended: MongoDB Atlas URI)
- `JWT_SECRET` (long random value)
- `OPENAI_API_KEY` (optional)
- `FRONTEND_URL` (recommended for production):
  - Example: `http://app.example.com,https://app.example.com`
  - Leave empty only for temporary open CORS during setup/testing

### 3. Build, push, and deploy

```bash
chmod +x deploy/eks-deploy.sh
./deploy/eks-deploy.sh <aws-region> <aws-account-id> <cluster-name>
```

### 4. Get ingress domain (ALB)

```bash
kubectl -n inkwell get pods,svc,ingress
kubectl -n inkwell get ingress inkwell-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'; echo
```

Open: `http://<ingress-hostname>`

Notes:
- Frontend and backend services remain `ClusterIP` (internal).
- Public access is through ALB Ingress (`/` -> frontend, `/api` + `/socket.io` -> backend).
- For local-only testing, you can still use:
  `kubectl -n inkwell port-forward svc/inkwell-frontend 8080:80`

---

## 🔁 Pipeline Details

This repository currently implements the build-and-deploy path, but it does **not** include a committed GitHub Actions, GitLab CI, or Jenkins pipeline file yet. In other words, the delivery pipeline exists as infrastructure code, Dockerfiles, Kubernetes manifests, and deploy scripts, while orchestration is still manual.

### Current pipeline flow

| Stage | Implementation in repo | Details |
|-------|-------------------------|---------|
| Source | `frontend/`, `backend/`, `k8s/`, `terraform/`, `deploy/` | Full-stack app plus infra and deploy assets are version-controlled together |
| Build | `frontend/Dockerfile`, `backend/Dockerfile` | Backend builds a Node 20 Alpine runtime image; frontend builds with Vite and serves from Nginx 1.27 Alpine |
| Local validation | `npm run dev`, `npm run build`, `docker compose up --build` | The repo supports local app testing and container smoke testing |
| Image registry | ECR via `deploy/eks-deploy.sh` and Terraform ECR resources | Backend and frontend images are tagged and pushed as `latest` |
| Infrastructure provisioning | `terraform/` | Creates VPC, subnets, NAT gateway, EKS Auto Mode cluster, and ECR repositories |
| Release/deploy | `deploy/eks-deploy.sh` | Applies namespace, validates secrets, deploys services, deployments, ingress class, and ingress |
| Runtime routing | `k8s/ingress.yaml` | AWS ALB exposes `/`, `/api`, and `/socket.io` |
| Health monitoring | App route + probes | Backend health endpoint is `/api/v1/health`; both deployments define readiness and liveness probes |

### Deployment pipeline for EKS

1. `terraform apply` provisions the AWS network, EKS cluster, and ECR repositories.
2. `kubectl apply -f k8s/namespace.yaml` prepares the `inkwell` namespace.
3. `kubectl apply -f k8s/secret.example.yaml` creates the application secret, then values are replaced with real production secrets.
4. `deploy/eks-deploy.sh` logs into ECR, builds the backend and frontend images, and pushes them to ECR.
5. The same script updates kubeconfig, applies deployments and services, then provisions ALB ingress exposure.
6. The script waits for the ingress hostname and prints the public endpoint when the ALB is ready.

### Deployment pipeline for EC2

1. Code is copied to the EC2 instance.
2. [`deploy/setup.sh`](/home/gaurav/Desktop/projects/DEVSECOPS/inkwell/deploy/setup.sh) installs Node.js 20, MongoDB 7, Nginx, and PM2.
3. The backend production dependencies are installed and a default `.env` is generated if missing.
4. The frontend is built with Vite into `frontend/dist`.
5. Nginx serves the frontend and reverse-proxies `/api` and `/socket.io` to the Node backend on port `5000`.
6. PM2 starts the backend as `inkwell-api` and persists startup configuration.

### Security and operations controls already present

- Non-root container execution in both production Docker images
- ECR `scan_on_push = true` configured through Terraform
- Kubernetes secrets separated from deployment manifests
- ALB ingress with explicit health check path
- Backend rate limiting and configurable CORS allowlist
- EKS control plane logging enabled for `api`, `audit`, `authenticator`, `controllerManager`, and `scheduler`
- Kubernetes secret encryption at rest enabled in the cluster configuration

### Current gaps in automation

- No committed CI workflow file for automatic linting, testing, image publishing, or deployment on push
- No automated test scripts are defined in `backend/package.json` or `frontend/package.json`
- Container images are pushed with the mutable `latest` tag only
- Secrets are created manually before EKS deployment
- No rollback script, promotion workflow, or separate staging/production environments are defined in the repo

---

## 📋 Deployment Report

### Summary

The project is deployment-ready in two forms:
- A VM-style deployment on AWS EC2 using Nginx, PM2, and local MongoDB
- A containerised Kubernetes deployment on AWS EKS using Terraform, ECR, Kubernetes manifests, and ALB ingress

### Deployment status based on repository contents

| Area | Status | Evidence |
|------|--------|----------|
| Application containerisation | Implemented | `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` |
| Local multi-container deployment | Implemented | `docker-compose.yml` with MongoDB, backend, frontend |
| EC2 deployment automation | Implemented | `deploy/setup.sh` |
| EKS infrastructure provisioning | Implemented | `terraform/main.tf` plus variables and outputs |
| Kubernetes workloads and services | Implemented | `k8s/backend.deployment.yaml`, `k8s/frontend.deployment.yaml`, services, ingress |
| Public ingress | Implemented | `k8s/ingressclass-alb.yaml`, `k8s/ingress.yaml` |
| Secret management pattern | Partially implemented | `k8s/secret.example.yaml` exists, but real secret injection is manual |
| Automated CI/CD orchestration | Not yet implemented in repo | No `.github/workflows/`, `.gitlab-ci.yml`, or `Jenkinsfile` present |
| Automated testing gate | Not yet implemented in repo | No `test` scripts in the app packages |

### Deployment architecture report

- Frontend runs as a static Vite build served by Nginx.
- Backend runs as a Node.js 20 Express service with Socket.IO.
- For Kubernetes, both frontend and backend run with `2` replicas and internal `ClusterIP` services.
- External traffic is routed through an AWS ALB ingress:
  `/` -> frontend, `/api` -> backend, `/socket.io` -> backend.
- Health checking is consistent across environments through `/api/v1/health`.
- Data persistence differs by target:
  EC2 uses local MongoDB installed on the instance, while EKS is designed to use a secret-provided MongoDB connection string and also includes a single-file manifest with an in-cluster MongoDB option.

### Recommended next improvements

1. Add a real CI workflow that runs install, build, container build, and smoke checks on every pull request.
2. Add automated tests and wire them into the CI gate before image publication.
3. Tag images with commit SHA or semantic versions instead of only `latest`.
4. Move secret creation to a managed workflow such as AWS Secrets Manager, External Secrets, or sealed secrets.
5. Add separate staging and production environments with controlled promotion.

---

## 🎯 Core Features

### 📝 Block Editor
The write page uses a custom block editor with 7 block types:
- **Paragraph** — rich text
- **Heading** — H1, H2, H3
- **Code** — with language select and optional "Run" button (JS only in browser)
- **Quiz** — MCQ with correct answer tracking and aggregate stats
- **Poll** — real-time voting via Socket.io
- **Callout** — info/tip/warning/danger
- **Divider**

### 🤖 AI Features (requires OpenAI API key)
- **Title suggestions** — click "AI Titles" in the write toolbar
- **Auto-tagging** — click "AI Tags" to generate relevant tags from content
- **Summaries** — generated on publish, powers Quick Read and Exam Mode
- **ELI5** — select any text in a post, get a simplified explanation in a popover

### 📖 Reader Modes
Toggle via the sticky pill on any post:
- **Quick Read** — AI-generated 2-3 sentence summary
- **Deep Dive** — full content with all interactive blocks
- **Exam Mode** — bullet points, revision notes, key concepts

### 💬 Community
- Threaded comments (2 levels deep)
- Comment likes
- AI-ranked "Top Insights" shown at the top
- Response blogs — write a full post in response to another
- Author follow + topic follow

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register user |
| POST | `/api/v1/auth/login` | Login, get JWT |
| GET | `/api/v1/posts?topic=&author=&page=` | List posts |
| GET | `/api/v1/posts/:slug?readerMode=quick\|exam` | Get post (mode-aware) |
| POST | `/api/v1/posts` | Create post |
| PUT | `/api/v1/posts/:id` | Update post |
| POST | `/api/v1/posts/:id/like` | Toggle like |
| POST | `/api/v1/posts/:id/blocks/:blockId/poll-vote` | Vote on poll |
| POST | `/api/v1/posts/:id/blocks/:blockId/quiz-answer` | Submit quiz answer |
| GET | `/api/v1/comments/post/:postId` | Get comments (threaded) |
| POST | `/api/v1/comments/post/:postId` | Post comment |
| GET | `/api/v1/feed` | Personalised feed (auth) |
| POST | `/api/v1/ai/suggest-titles` | AI title suggestions |
| POST | `/api/v1/ai/generate-tags` | AI tag generation |
| POST | `/api/v1/ai/eli5` | Simplify text selection |

---

## 🧑‍💻 Useful Commands

```bash
pm2 status                          # Check backend status
pm2 logs inkwell-api                # View backend logs
pm2 restart inkwell-api             # Restart backend

cd backend && node src/seed.js      # Re-seed demo data
sudo systemctl reload nginx         # Reload nginx config
docker compose up --build           # Local container deployment
kubectl -n inkwell get pods,svc     # EKS workload status
kubectl -n inkwell get ingress      # EKS public endpoint
```

---

Built with ✦ by the Inkwell team. Write clearly. Think deeply.
