require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const topicRoutes = require('./routes/topics');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const feedRoutes = require('./routes/feed');
const { ensureBaseData } = require('./bootstrap');

const configuredOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function corsOriginValidator(origin, callback) {
  // Allow non-browser clients and same-cluster calls without an Origin header.
  if (!origin) return callback(null, true);

  // If FRONTEND_URL is not configured, allow all browser origins.
  if (configuredOrigins.length === 0) return callback(null, true);

  if (configuredOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Not allowed by CORS'));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: corsOriginValidator, methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors({ origin: corsOriginValidator, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Attach io to req
app.use((req, res, next) => { req.io = io; next(); });

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/posts', postRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/topics', topicRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/feed', feedRoutes);

app.get('/api/v1/health', (req, res) => res.json({ status: 'ok', platform: 'Inkwell' }));

// Socket.io rooms per post
io.on('connection', (socket) => {
  socket.on('join-post', (postId) => socket.join(`post:${postId}`));
  socket.on('leave-post', (postId) => socket.leave(`post:${postId}`));
});

// MongoDB connect
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inkwell_db';
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    return ensureBaseData();
  })
  .then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Inkwell API running on port ${PORT}`));
  })
  .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });
