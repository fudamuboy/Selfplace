const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

// Global error handlers (AT THE TOP) to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('[CRITICAL] Uncaught Exception:', err.message);
  console.error(err.stack);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
});



const authRoutes = require('./src/routes/authRoutes');
const checkInRoutes = require('./src/routes/checkInRoutes');
const advancedCheckInRoutes = require('./src/routes/advancedCheckInRoutes');
const journalRoutes = require('./src/routes/journalRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const insightRoutes = require('./src/routes/insightRoutes');
const reflectionRoutes = require('./src/routes/reflectionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const emotionalRoutes = require('./src/routes/emotionalRoutes');
const astrologyRoutes = require('./src/routes/astrologyRoutes');
const personalityRoutes = require('./src/routes/personalityRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Critical Env Check
const requiredEnvs = ['JWT_SECRET'];
if (process.env.DATABASE_URL) {
  requiredEnvs.push('DATABASE_URL');
} else {
  requiredEnvs.push('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');
}

requiredEnvs.forEach(env => {
  if (!process.env[env]) {
    console.error(`[CRITICAL-ENV] Missing environment variable: ${env}`);
  }
});



const { runMigrations } = require('./src/config/migrations');

// Database and Migrations initialization
(async () => {
  try {
    // Run migrations (db.query handles connections automatically)
    await runMigrations();
    console.log('[DATABASE] Migrations completed and verified');
  } catch (err) {
    console.error('[DATABASE] Initialization error:', err.message);
    // We don't exit here, allowing the server to potentially recover or be debugged
  }
})();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Performance Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.log(`[PERF-SLOW] ${req.method} ${req.originalUrl} -> ${duration}ms`);
    }
  });
  next();
});


// Root route for Render health monitoring
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Selfplace backend is running',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy'
  });
});

// Routes
app.use('/api/astrology', astrologyRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/check-ins', checkInRoutes);

app.use('/api/journal', journalRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/user', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/emotional', emotionalRoutes); // Unified Emotional Architecture
app.use('/api/personality', personalityRoutes);




// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Bir şeyler ters gitti!' });
});


app.listen(PORT, () => {
  console.log(`[SERVER] Selfplace API active on port ${PORT}`);
  
  // Keep alive interval to prevent Event Loop from emptying if something closes the handles
  setInterval(() => {
    // This just keeps the process alive
  }, 60000);
});

