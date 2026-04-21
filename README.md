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
- `FRONTEND_URL` (optional; leave empty to allow any browser origin)

### 3. Build, push, and deploy

```bash
chmod +x deploy/eks-deploy.sh
./deploy/eks-deploy.sh <aws-region> <aws-account-id> <cluster-name>
```

### 4. Get public endpoint

```bash
kubectl -n inkwell get svc inkwell-frontend
```

Use the `EXTERNAL-IP` or AWS load balancer hostname to open the app.

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
```

---

Built with ✦ by the Inkwell team. Write clearly. Think deeply.
