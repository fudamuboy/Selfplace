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
const journalRoutes = require('./src/routes/journalRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const insightRoutes = require('./src/routes/insightRoutes');
const reflectionRoutes = require('./src/routes/reflectionRoutes');
const userRoutes = require('./src/routes/userRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const emotionalRoutes = require('./src/routes/emotionalRoutes');
const astrologyRoutes = require('./src/routes/astrologyRoutes');
const personalityRoutes = require('./src/routes/personalityRoutes');
const relationshipRoutes = require('./src/routes/relationshipRoutes');
const subscriptionRoutes = require('./src/routes/subscriptionRoutes');

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
const { validateSchema } = require('./src/config/schemaValidator');
const db = require('./src/config/db');

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

// Health check with database connectivity diagnostics
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.status(200).json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[HEALTH-CHECK] Database connection failed:', err.message);
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
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
app.use('/api/relationships', relationshipRoutes);
app.use('/api/subscriptions', subscriptionRoutes);




// Detailed Error handling middleware with request diagnostics
app.use((err, req, res, next) => {
  const isProd = process.env.NODE_ENV === 'production';
  
  // Redact sensitive inputs from logs
  const safeBody = { ...req.body };
  if (safeBody.password) safeBody.password = '[REDACTED]';
  if (safeBody.newPassword) safeBody.newPassword = '[REDACTED]';
  if (safeBody.token) safeBody.token = '[REDACTED]';

  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error(`[ROUTE-ERROR] ${req.method} ${req.originalUrl}`);
  console.error('Headers:', JSON.stringify(req.headers));
  console.error('Payload:', JSON.stringify(safeBody));
  console.error('Error Message:', err.message);
  console.error('Stack Trace:\n', err.stack);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

  res.status(500).json({ 
    message: 'Sunucu tarafında bir hata oluştu.', 
    error: isProd ? null : err.message,
    stack: isProd ? null : err.stack
  });
});

// Sequential Startup wrapper
async function startServer() {
  try {
    console.log('[SERVER] Starting sequential boot sequence...');
    // 1. Run migrations
    await runMigrations();
    console.log('[DATABASE] Migrations completed and verified');

    // 2. Perform database schema validation
    await validateSchema();
    
    // 3. Bind server to port
    app.listen(PORT, () => {
      console.log(`[SERVER] Selfplace API active on port ${PORT}`);
      
      // Keep alive interval to prevent Event Loop from emptying if something closes the handles
      setInterval(() => {
        // Keep process alive
      }, 60000);
    });
  } catch (err) {
    console.error('[SERVER] Critical boot sequence failure:', err.message);
    process.exit(1);
  }
}

startServer();

