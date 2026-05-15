require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth');
const accountRoutes = require('./routes/accounts');
const messageRoutes = require('./routes/messages');
const automationRoutes = require('./routes/automation');
const { authMiddleware } = require('./middleware/auth');

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.set('io', io);
app.set('prisma', prisma);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);
app.use('/api/messages', authMiddleware, messageRoutes);
app.use('/api/automation', authMiddleware, automationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('authenticate', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io, prisma };
