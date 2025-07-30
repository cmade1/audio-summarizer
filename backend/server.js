const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Multer konfigürasyonu - ses dosyalarını geçici olarak saklamak için
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Benzersiz dosya adı oluştur
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Sadece ses dosyalarını kabul et
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece ses dosyaları kabul edilir!'), false);
    }
  }
});

// Uploads klasörünü oluştur (eğer yoksa)
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Test endpoint'i
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend çalışıyor!' });
});

// Ses dosyası yükleme endpoint'i
app.post('/api/upload-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }

    console.log('Yüklenen dosya:', req.file);
    
    // Dosya bilgilerini döndür (şimdilik sadece test için)
    res.json({ 
      message: 'Ses dosyası başarıyla yüklendi',
      filename: req.file.filename,
      size: req.file.size
    });

  } catch (error) {
    console.error('Dosya yükleme hatası:', error);
    res.status(500).json({ error: 'Dosya yükleme hatası' });
  }
});

// Whisper API endpoint'i (şimdilik placeholder)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Dosya adı gerekli' });
    }

    // TODO: OpenAI Whisper API entegrasyonu burada olacak
    console.log('Transkripsiyon isteği:', filename);
    
    res.json({ 
      message: 'Transkripsiyon endpoint\'i hazır',
      filename: filename
    });

  } catch (error) {
    console.error('Transkripsiyon hatası:', error);
    res.status(500).json({ error: 'Transkripsiyon hatası' });
  }
});

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 