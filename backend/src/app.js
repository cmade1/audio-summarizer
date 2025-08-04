const express = require('express');
const cors = require('cors');
const audioRoutes = require('./routes/audioRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', audioRoutes);

module.exports = app;