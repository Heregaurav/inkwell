# ✦ Inkwell

> An AI-powered knowledge-sharing platform that transforms how writers publish ideas and readers consume content through intelligent reading modes and community engagement.
---

## Table of Contents

- [Overview](#-overview)
- [Why Inkwell](#-why-inkwell)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Deployment](#-deployment)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

##  Overview

**Inkwell** is more than just a blog platform — it's an intelligent knowledge ecosystem designed to bridge the gap between content creation and consumption.

### For Writers
Publish ideas, articles, and insights with AI-powered assistance that helps you craft better content, generate relevant tags, and suggest compelling titles.

### For Readers
Consume content the way you want — whether you're looking for a quick overview, a deep dive, or exam-ready revision notes. Inkwell adapts to your learning style.

### For Communities
Engage in meaningful discussions through threaded comments, response blogs, and interactive elements like quizzes and polls that transform passive reading into active learning.

---

##  Why Inkwell

### The Problem
In today's information age, readers are overwhelmed with content. Writers struggle to make their work discoverable and engaging. Traditional blog platforms offer a one-size-fits-all reading experience that doesn't respect different learning preferences or time constraints.

### The Solution
Inkwell reimagines knowledge sharing by giving readers **control** over how they consume content and empowering writers with **AI tools** to create more valuable, interactive content.

| Traditional Blog Platforms | Inkwell |
|---------------------------|---------|
| One reading mode | Three intelligent reading modes |
| Static content | Interactive quizzes & polls |
| Manual tagging | AI-powered tag generation |
| Linear reading | Adaptive learning experience |
| Basic comments | Threaded discussions + response blogs |
| No learning optimization | Exam Mode for quick revision |

---

##  Key Features

###  Intelligent Reading Modes

Inkwell adapts to how you learn best:

| Mode | Best For | What You Get |
|------|----------|--------------|
| **Full Read** | Deep understanding | Complete content with all interactive elements |
| **Summary Mode** | Quick overview | AI-generated 2-3 sentence summary of key ideas |
| **Exam Mode** | Revision & learning | Bullet points, key concepts, and revision notes |

###  AI-Powered Tools

| Feature | Purpose | How It Helps |
|---------|---------|--------------|
| **Title Suggestions** | Overcome writer's block | AI generates compelling titles from your content |
| **Auto-Tagging** | Improve discoverability | Smart topic tags based on content analysis |
| **Content Summaries** | Enhance readability | Automatic summaries power Quick Read & Exam modes |
| **ELI5 Explanations** | Simplify complexity | Select any text for a simplified explanation |

###  Smart Block Editor

Create engaging content with 7 interactive block types:
- **Paragraph** — Rich text formatting
- **Heading** — H1, H2, H3 hierarchy
- **Code** — Syntax-highlighted with run capability
- **Quiz** — Multiple choice with answer tracking
- **Poll** — Real-time community voting
- **Callout** — Info, Tip, Warning, Danger styles
- **Divider** — Visual content separation

###  Community Engagement

- **Threaded Comments** — Two-level deep conversations
- **Comment Likes** — Surface quality discussions
- **AI-Ranked Insights** — Top comments elevated by AI
- **Response Blogs** — Write full posts in response to others
- **Topic Following** — Curated feeds based on interests
- **Author Following** — Never miss content from your favorite writers

---

##  Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI library with hooks and context |
| **Vite** | Fast build tool and dev server |
| **CSS Modules** | Scoped, maintainable styling |
| **Socket.io Client** | Real-time updates for polls and comments |
| **Axios** | HTTP client for API calls |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js 20** | JavaScript runtime |
| **Express.js** | REST API framework |
| **MongoDB** | NoSQL database with Mongoose ODM |
| **Socket.io** | WebSocket server for real-time features |
| **JWT** | Secure authentication |
| **OpenAI GPT-4o** | AI features (summaries, titles, tags, ELI5) |

### DevOps & Infrastructure
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Kubernetes** | Container orchestration |
| **AWS EKS** | Managed Kubernetes cluster |
| **AWS EC2** | VM-based deployment |
| **Terraform** | Infrastructure as Code |
| **NGINX** | Reverse proxy and static serving |
| **PM2** | Node.js process management |

---

##  Architecture

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

##  Local Development

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


