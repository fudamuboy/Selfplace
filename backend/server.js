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

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/check-ins', checkInRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/reflections', reflectionRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Selfplace API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Bir şeyler ters gitti!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
