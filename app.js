const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes');
const dnsRoutes = require('./src/routes/dnsRoutes');
const { verifyToken } = require('./src/middlewares/authMiddleware');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware


const corsOptions ={
  origin: 'https://dns-manager-aws-route-53.netlify.app',
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}
app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "React app URL"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// MongoDB Connection

mongoose.connect(process.env.DB_URL, {
  
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Routes
app.get('/', (req, res) => {
  res.send('Welcome to DNS Manager Backend');
});

// Authentication routes
app.use('/api/auth', authRoutes);

// DNS routes (protected)
app.use('/api/dns', verifyToken, dnsRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
