const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./src/routes/authRoutes');
const checkInRoutes = require('./src/routes/checkInRoutes');
const cardRoutes = require('./src/routes/cardRoutes');
const insightRoutes = require('./src/routes/insightRoutes');
const reflectionRoutes = require('./src/routes/reflectionRoutes');
const userRoutes = require('./src/routes/userRoutes');

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
  const value = process.env[env];
  if (!value) {
    console.error(`[CRITICAL-ENV] Missing environment variable: ${env}`);
  } else {
    // Log presence and masked value for debugging
    const masked = value.length > 8 
      ? `${value.substring(0, 4)}...${value.substring(value.length - 4)}` 
      : '****';
    console.log(`[ENV-AUDIT] Found ${env}: ${masked}`);
  }
});

console.log(`[ENV-AUDIT] NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`[ENV-AUDIT] PORT: ${PORT}`);

// Database connection test
const db = require('./src/config/db');
const { runMigrations } = require('./src/config/migrations');

db.pool.connect(async (err, client, release) => {
  if (err) {
    console.error('[DATABASE] Connection failed:', err.message);
  } else {
    console.log('[DATABASE] Successfully connected to PostgreSQL');
    release();
    
    // Run migrations after successful connection
    try {
      await runMigrations();
      console.log('[DATABASE] Migrations completed');
    } catch (migErr) {
      console.error('[DATABASE] Migrations failed:', migErr.message);
    }
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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
app.use('/api/auth', authRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/user', userRoutes);



// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Bir şeyler ters gitti!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
