const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./src/routes/authRoutes');
const dnsRoutes = require('./src/routes/dnsRoutes');
const { verifyToken } = require('./src/middlewares/authMiddleware');
require('dotenv').config();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware

 const cors = require('cors');
// const corsOptions ={
//   origin: 'https://dns-manager-aws-route-53.netlify.app',
//     credentials:true,            //access-control-allow-credentials:true
//     optionSuccessStatus:200
// }
// app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.header(
    "Access-Control-Allow-Origin",
    "https://dns-manager-aws-route-53.netlify.app"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// const corsOptions ={
//   origin: 'https://dns-manager-aws-route-53.netlify.app',
//   credentials: true, // allow cookies to be sent with the request
//   optionSuccessStatus: 200
// };

// app.use(cors(corsOptions));


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
