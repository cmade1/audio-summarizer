require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const audioRoutes = require('./routes/audioRoutes');

const allowedOrigins = ['audio-summarizer-phi.vercel.app'];

const app = express();
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use('/api', audioRoutes);

module.exports = app;