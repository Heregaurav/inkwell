# Inkwell Project Architecture

## 1. Overview

Inkwell is an AI-powered knowledge-sharing platform for publishing, reading, and discussing articles. The implemented project contains:

- React 18 frontend built with Vite;
- Express backend running on Node.js 20;
- MongoDB accessed through Mongoose;
- Socket.io for post-specific real-time updates;
- optional Groq integration through its OpenAI-compatible API;
- Docker images for frontend and backend;
- Docker Compose for local deployment;
- Kubernetes manifests for AWS EKS;
- Terraform for the AWS VPC, EKS cluster, and ECR repositories;
- an alternative single-EC2 deployment using NGINX and PM2.

## 2. High-Level Architecture

```text
User Browser
    |
    v
AWS Application Load Balancer
    |
    +-- /api and /socket.io --> Backend Service :5000
    |                              |
    |                              +--> MongoDB
    |                              |
    |                              +--> Groq API (optional)
    |
    +-- / -----------------------> Frontend Service :80
                                       |
                                       v
                                  NGINX :8080
                                  React SPA
```

The EKS deployment runs frontend and backend as separate Kubernetes Deployments. Both are exposed internally through `ClusterIP` Services. The Ingress routes public traffic through an internet-facing ALB.

## 3. Project Structure

```text
inkwell/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js
│       ├── bootstrap.js
│       ├── middleware/auth.js
│       ├── models/
│       ├── routes/
│       └── services/aiService.js
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── vercel.json
│   └── src/
│       ├── App.jsx
│       ├── pages/
│       ├── components/
│       ├── store/authStore.js
│       ├── utils/api.js
│       └── styles/
├── k8s/
│   ├── namespace.yaml
│   ├── secret.example.yaml
│   ├── backend.deployment.yaml
│   ├── backend.service.yaml
│   ├── frontend.deployment.yaml
│   ├── frontend.service.yaml
│   ├── ingress.yaml
│   ├── ingressclass-alb.yaml
│   └── inkwell.yaml
├── terraform/
│   ├── provider.tf
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars
├── deploy/
│   ├── eks-deploy.sh
│   └── setup.sh
├── docker-compose.yml
└── fix-toleration.yaml
```

## 4. Frontend Architecture

The frontend uses React 18, Vite, React Router, Zustand, Axios, TipTap, Socket.io Client, Lucide React, and CSS Modules.

Implemented frontend features include:

- authentication pages and client authentication state;
- home, explore, profile, bookmarks, topic, post, and writing pages;
- block-based article editing;
- full read, summary, and exam reading modes;
- posts, comments, likes, bookmarks, follows, topics, feeds, and search;
- paragraphs, headings, images, code blocks, quizzes, polls, callouts, and dividers;
- AI writing and reading tools;
- real-time post poll updates through Socket.io.

### Frontend API client

`frontend/src/utils/api.js` creates the Axios client. It reads `VITE_API_URL` during the Vite build and appends `/api/v1`.

With an empty `VITE_API_URL`, requests use same-origin paths such as:

```text
/api/v1/posts
/api/v1/auth/login
```

The request interceptor reads `inkwell_token` from browser local storage and sends it as a Bearer token. A `401` response removes the token and redirects to `/auth`.

### Frontend production container

The frontend Dockerfile uses two stages:

1. Node.js 20 Alpine installs dependencies and runs `npm run build`.
2. NGINX 1.27 Alpine serves the generated files.

The final container serves files from `/usr/share/nginx/html`, listens on port `8080`, runs NGINX as the `nginx` user, and provides SPA fallback routing through `index.html`.

The frontend NGINX configuration proxies `/api/` and `/socket.io/` to `inkwell-backend:5000` and sets WebSocket upgrade headers for Socket.io.

## 5. Backend Architecture

The backend uses Node.js 20, Express, Mongoose, Socket.io, JWT, bcryptjs, the OpenAI-compatible SDK configured for Groq, Morgan, CORS, express-rate-limit, Multer, and Slugify.

`backend/src/index.js`:

1. loads environment variables with `dotenv`;
2. creates the Express application and HTTP server;
3. attaches Socket.io to the HTTP server;
4. configures CORS;
5. enables JSON request bodies up to `10mb`;
6. enables Morgan request logging;
7. applies a rate limit of 500 requests per 15 minutes;
8. attaches Socket.io to each request as `req.io`;
9. registers the API routes;
10. exposes the health endpoint;
11. connects to MongoDB;
12. creates default topics when required;
13. starts the server on port `5000`.

The backend starts listening after MongoDB connection and base-data initialization complete.

### API routes

All API routes are under `/api/v1`.

| Route group | Implemented functionality |
|---|---|
| `/auth` | Register, login, current user, profile update |
| `/posts` | List, read, create, update, delete, like, responses, polls, quizzes |
| `/comments` | List, create, like, delete comments |
| `/topics` | List, search, follow, and unfollow topics |
| `/users` | Profiles, author follow, bookmarks, bookmark listing |
| `/feed` | Personalized feed and published-post feed |
| `/search` | Search posts, users, topics, titles, and tags |
| `/ai` | Titles, tags, summaries, ELI5, writing assistance, rewriting, ranking |
| `/health` | Backend health status |

### Authentication

Authentication is implemented with JWT:

- passwords are hashed with bcrypt;
- JWT payloads contain `userId`;
- tokens expire after seven days;
- protected requests use `Authorization: Bearer <token>`;
- authenticated middleware loads the user into `req.user`;
- optional authentication allows public requests to continue without a user;
- frontend logout removes the stored token.

The JWT signing key is read from `JWT_SECRET`.

### MongoDB models

The Mongoose models represent:

- users, including profiles, follows, bookmarks, and reader preferences;
- posts, including block content, topics, tags, status, responses, statistics, and AI metadata;
- comments, including parent comments and likes;
- topics, including follower and post counts;
- quiz responses.

The Post model calculates reading time before saving. Database indexes support authors, topics, tags, publication dates, titles, and tag searches. Quiz responses use a unique `(postId, blockId, userId)` index.

### Base data

`backend/src/bootstrap.js` creates these default topics when the topic collection is empty:

- Technology;
- Programming;
- Design;
- Science;
- Writing;
- AI & Machine Learning.

## 6. AI Architecture

`backend/src/services/aiService.js` uses Groq's OpenAI-compatible chat completions endpoint when `GROQ_API_KEY` is available. `GROQ_MODEL` defaults to `openai/gpt-oss-20b`. Implemented AI functions provide:

- title suggestions;
- automatic tag generation;
- post summaries;
- ELI5 explanations;
- comment ranking;
- writing assistance;
- text rewriting.

The service includes fallback behavior when the key is absent or a Groq request fails. Post AI metadata generation can run after the main post operation returns. `GROQ_API_KEY` is the only provider credential consumed; `GROQ_MODEL` is optional.

## 7. Socket.io Architecture

Socket.io uses the same backend HTTP server and port as Express.

```text
Client -> Server: join-post(postId)
Client -> Server: leave-post(postId)
Server -> Clients in post room: poll-update
```

Rooms use the format `post:<postId>`. Poll votes are sent through the REST API, saved to MongoDB, and emitted to the relevant Socket.io room. The frontend post page joins the room and listens for poll updates. Comments are handled through the REST API.

## 8. Docker Architecture

### Backend image

The backend image uses Node.js 20 Alpine, installs production dependencies with `npm ci`, copies the backend source, creates and uses a non-root `appuser`, includes `dumb-init`, exposes port `5000`, and starts `node src/index.js`.

### Frontend image

The frontend image uses Node.js 20 Alpine for the build stage, runs the Vite production build, uses NGINX 1.27 Alpine for the final stage, exposes port `8080`, and serves the compiled React application.

## 9. Local Docker Compose Architecture

`docker-compose.yml` defines MongoDB, backend, and frontend services:

```text
Host :3000 -> inkwell-frontend :8080
                 |
                 v
            inkwell-backend :5000 -> mongodb :27017
Host :5000 -> inkwell-backend :5000
Host :27017 -> mongodb :27017
```

### MongoDB service

- image: `mongo:7`;
- container name: `inkwell-mongodb`;
- port: `27017`;
- persistent volume: `mongo_data`;
- health check uses `mongosh` and `db.adminCommand('ping')`.

### Backend service

- built from `backend/Dockerfile`;
- port `5000`;
- waits for the MongoDB health check;
- uses `mongodb://mongodb:27017/inkwell_db`;
- exposes `/api/v1/health` for its health check.

### Frontend service

- built from `frontend/Dockerfile`;
- maps host port `3000` to container port `8080`;
- waits for the backend health check.

The stack is started with:

```bash
docker compose up --build -d
```

## 10. AWS Terraform Architecture

Terraform is located in the root `terraform/` directory. It provisions the AWS infrastructure used by the EKS deployment.

### Terraform-managed resources

- AWS provider configuration;
- VPC;
- public and private subnets;
- NAT gateway;
- EKS cluster;
- ECR backend repository;
- ECR frontend repository.

Terraform does not apply the Kubernetes application manifests. Those are applied by `deploy/eks-deploy.sh`.

### Configured values

```text
AWS region: us-east-1
Environment: dev
Cluster name: jerney-eks
Kubernetes version: 1.32
VPC CIDR: 10.0.0.0/16
Backend ECR repository: inkwell-backend
Frontend ECR repository: inkwell-frontend
```

### VPC

Terraform selects three Availability Zones and creates one public subnet and one private subnet in each Availability Zone. NAT gateway access is enabled for private subnets through `single_nat_gateway = true`.

Public subnets have the tag:

```text
kubernetes.io/role/elb = 1
```

Private subnets have the tag:

```text
kubernetes.io/role/internal-elb = 1
```

### EKS cluster

The EKS module configures:

- EKS Auto Mode;
- `general-purpose` and `system` node pools;
- private subnet placement;
- public and private cluster API endpoint access;
- API authentication mode;
- Kubernetes Secret envelope encryption;
- API, audit, authenticator, controller manager, and scheduler logs;
- administrator permissions for the Terraform cluster creator.

### ECR repositories

Terraform creates:

```text
inkwell-backend
inkwell-frontend
```

Both repositories have image scanning enabled on push and use mutable image tags.

### Terraform commands

```bash
cd terraform
terraform init
terraform validate
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
terraform output
```

The S3 backend configuration exists as commented configuration in `terraform/provider.tf`; the active Terraform configuration uses local state.

## 11. Kubernetes Architecture

### Namespace

The application resources are deployed into the `inkwell` namespace.

### Backend Deployment

The backend Deployment runs two replicas of the backend ECR image.

Configured values:

- container port: `5000`;
- CPU request/limit: `100m`/`500m`;
- memory request/limit: `256Mi`/`512Mi`;
- readiness path: `/api/v1/health`;
- liveness path: `/api/v1/health`.

The backend receives `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY`, and `FRONTEND_URL` from the Secret named `inkwell-secrets`.

### Backend Service

The backend Service is named `inkwell-backend`, is type `ClusterIP`, exposes port `5000`, and forwards traffic to backend pods on port `5000`.

### Frontend Deployment

The frontend Deployment runs two replicas of the frontend ECR image.

Configured values:

- container port: `8080`;
- CPU request/limit: `50m`/`250m`;
- memory request/limit: `128Mi`/`256Mi`;
- readiness path: `/`;
- liveness path: `/`.

### Frontend Service

The frontend Service is named `inkwell-frontend`, is type `ClusterIP`, exposes port `80`, and forwards traffic to frontend pods on port `8080`.

### Kubernetes Secret

The `inkwell-secrets` Secret contains:

```text
MONGO_URI
JWT_SECRET
GROQ_API_KEY
FRONTEND_URL
```

The example Secret supports an external MongoDB URI or the internal MongoDB service address used by the combined manifest.

## 12. Kubernetes Ingress and ALB

The Ingress is named `inkwell-ingress` and uses the `alb` IngressClass.

Configured ALB behavior:

- internet-facing scheme;
- IP target type;
- HTTP listener on port `80`;
- health check path `/api/v1/health`.

Routing rules:

| Path | Kubernetes Service | Service port |
|---|---|---:|
| `/api` | `inkwell-backend` | 5000 |
| `/socket.io` | `inkwell-backend` | 5000 |
| `/` | `inkwell-frontend` | 80 |

`k8s/ingressclass-alb.yaml` defines the `alb` IngressClass with controller `eks.amazonaws.com/alb`.

## 13. Combined Kubernetes Manifest

`k8s/inkwell.yaml` contains the Namespace, Secret, MongoDB PersistentVolumeClaim, MongoDB Deployment, MongoDB Service, backend Deployment, backend Service, frontend Deployment, and frontend Service.

The MongoDB resources use:

- image `mongo:7`;
- one MongoDB replica;
- `Recreate` deployment strategy;
- `ReadWriteOnce` PVC;
- requested storage of `10Gi`;
- service DNS name `inkwell-mongodb`;
- port `27017`.

The backend in this combined manifest has an init container that waits for `inkwell-mongodb:27017` before starting.

## 14. EKS Deployment Flow

`deploy/eks-deploy.sh` accepts:

```text
./deploy/eks-deploy.sh <aws-region> <aws-account-id> <cluster-name> [ingress-hostname]
```

Example:

```bash
./deploy/eks-deploy.sh us-east-1 123456789012 jerney-eks app.example.com
```

The script:

1. creates the backend and frontend ECR repositories if they do not exist;
2. logs Docker into ECR;
3. builds the backend image from `./backend`;
4. builds the frontend image from `./frontend`;
5. pushes both images with the `latest` tag;
6. configures kubectl with `aws eks update-kubeconfig`;
7. applies the `inkwell` namespace;
8. checks that `inkwell-secrets` exists;
9. substitutes the AWS account ID and region in the backend Deployment;
10. applies the backend Deployment and Service;
11. substitutes the AWS account ID and region in the frontend Deployment;
12. applies the frontend Deployment and Service;
13. applies the ALB IngressClass;
14. applies the Ingress;
15. waits for and prints the ALB hostname.

The script also prints a port-forward command for local-only access:

```bash
kubectl -n inkwell port-forward svc/inkwell-frontend 8080:80
```

## 15. EKS Deployment Commands

Provision infrastructure:

```bash
cd terraform
terraform init
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

Configure kubectl:

```bash
aws eks update-kubeconfig --region us-east-1 --name jerney-eks
kubectl get nodes
```

Create the namespace and Secret:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secret.example.yaml
```

Run the image build and Kubernetes deployment:

```bash
./deploy/eks-deploy.sh us-east-1 <aws-account-id> jerney-eks
```

Check the deployment:

```bash
kubectl -n inkwell get pods
kubectl -n inkwell get svc
kubectl -n inkwell get ingress
kubectl -n inkwell rollout status deployment/inkwell-backend
kubectl -n inkwell rollout status deployment/inkwell-frontend
```

## 16. EC2 Deployment

`deploy/setup.sh` implements a separate single-instance deployment path on Ubuntu 22.04 or later.

The script installs Node.js 20, MongoDB 7, NGINX, and PM2. It then installs backend production dependencies, creates `backend/.env` when absent, builds the frontend, configures NGINX, serves `frontend/dist`, proxies `/api` and `/socket.io` to `localhost:5000`, starts the backend with PM2, and enables PM2 startup persistence.

The EC2 request flow is:

```text
Internet :80
    |
    v
NGINX
    +--> frontend/dist
    +--> backend localhost:5000
              |
              v
       MongoDB localhost:27017
```

## 17. Environment Variables

### Backend

```text
PORT
NODE_ENV
MONGO_URI
JWT_SECRET
FRONTEND_URL
GROQ_API_KEY
```

### Frontend

```text
VITE_API_URL
```

`VITE_API_URL` is compiled into the frontend during the Vite build. Backend environment variables are provided through `.env`, Docker Compose environment configuration, or Kubernetes Secret references.

## 18. Health and Verification

The backend health endpoint is:

```text
GET /api/v1/health
```

It returns:

```json
{
  "status": "ok",
  "platform": "Inkwell"
}
```

The Kubernetes backend readiness and liveness probes use this endpoint. The frontend Kubernetes probes request `/` from the NGINX container.

## 19. Deployment Resources Summary

```text
Terraform:
  VPC
  Public subnets
  Private subnets
  NAT gateway
  EKS Auto Mode cluster
  ECR backend repository
  ECR frontend repository

Kubernetes:
  inkwell Namespace
  inkwell-secrets Secret
  Backend Deployment, 2 replicas
  Backend ClusterIP Service
  Frontend Deployment, 2 replicas
  Frontend ClusterIP Service
  ALB IngressClass
  ALB Ingress

Combined Kubernetes option:
  MongoDB Deployment, 1 replica
  MongoDB Service
  MongoDB PVC, 10Gi
```
