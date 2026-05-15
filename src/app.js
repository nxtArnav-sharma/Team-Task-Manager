const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const memberRoutes = require('./routes/members');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve landing page on root
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/pages/landing.html')));

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);

app.use(express.static(path.join(__dirname, '../public')));

// Serve HTML pages
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/pages/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../public/pages/signup.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/pages/dashboard.html')));
app.get('/project/:id', (req, res) => res.sendFile(path.join(__dirname, '../public/pages/dashboard.html')));

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

module.exports = app;
