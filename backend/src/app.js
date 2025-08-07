require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const audioRoutes = require('./routes/audioRoutes');

const allowedOrigins = [
    'https://audio-summarizer-phi.vercel.app',
    'http://localhost:5173' // Geliştirme için
  ];
  
  app.use(cors({
    origin: function (origin, callback) {
      // Postman veya curl gibi tools için origin undefined olabilir, onları da kabul et
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('CORS hatası: Bu origin izinli değil!'));
      }
    }
  }));
app.use(express.json());
app.use('/api', audioRoutes);

module.exports = app;