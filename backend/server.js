const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const fetch = require('node-fetch');
const FormData = require('form-data');
const util = require('util');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3001;

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfprobePath(ffprobePath);

// Middleware
app.use(cors());
app.use(express.json());

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


function cleanOldParts(outputDir) {
  fs.readdirSync(outputDir)
    .filter(f => f.startsWith('part-') && f.endsWith('.mp3'))
    .forEach(f => fs.unlinkSync(path.join(outputDir, f)));
}

async function splitAudioBySize (inputPath , outputDir , maxSizeMB = 20 ) {
  // ffprobe ile dosya süresini ve boyutunu öğren
  const getDuration = () => {
    return new Promise((resolve , reject) => {
      ffmpeg.ffprobe(inputPath , (err , metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });
  };
  const stat = await util.promisify(fs.stat)(inputPath);
  const totalSize = stat.size;
  const duration = await getDuration();

  // Parça süresini hesapla (saniye cinsinden)
  console.log('Duration:', duration, 'TotalSize:', totalSize, 'MaxSizeMB:', maxSizeMB);
  const segmentTime = Math.max(10, Math.min(300, Math.floor(duration * (maxSizeMB * 1024 * 1024) / totalSize)));
  console.log('Calculated segmentTime:', segmentTime);

  // Parçalama işlemi
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(path.join(outputDir, 'part-%03d.mp3'))
      .audioCodec('copy')
      .format('mp3')
      .addOption('-f', 'segment')
      .addOption('-segment_time', segmentTime)
      .on('stderr', (stderrLine) => {
        console.error('ffmpeg stderr:', stderrLine);
      })
      .on('end', () => {
        // Parça dosya yollarını bul
        const partFiles = fs.readdirSync(outputDir)
          .filter(f => f.startsWith('part-') && f.endsWith('.mp3'))
          .map(f => path.join(outputDir, f));
        resolve(partFiles);
      })
      .on('error', (err) => {
        console.error('ffmpeg error:', err);
        reject(err);
      })
      .run();
  });

};




async function transcribeAudioParts(partPaths) {
  const transcripts = [];
  for (const partPath of partPaths) {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(partPath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'tr');
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });
    const data = await response.json();
    transcripts.push(data.text);
  }
  return transcripts.join('\n');
}

async function summarizeTranscript(transcript) {
  const systemPrompt =  `
  Aşağıda bir toplantının yaziya dokulmus hali verilecek. Bu metni temel alarak toplantının özetini oluştur.
  Lütfen şu yapıya sadık kal:
  - Toplantı Başlığı
  - Toplantı Özeti
  - Karar Maddeleri
  - Aksiyon Maddeleri
  - Notlar
  
  Özetin dili sade, Türkçe ve kurumsal olmalı. Gereksiz tekrarlar çıkarılmalı, konu dışı sohbetler atlanmalı. Kısa ama anlamlı bir çıktı oluşturulmalı.
  Çıktın markdown formatında olsun.
  Bağlama uygun emojiler kullanılmalı.
      `.trim(); // prompt'un tamamı
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript }
      ],
      temperature: 0.5
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

app.post('/api/process-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, 'uploads');
    // 1. Parçala
    const partPaths = await splitAudioBySize(inputPath, outputDir, 20);
    // 2. Transkripte et
    const fullTranscript = await transcribeAudioParts(partPaths);
    // 3. Özetlet
    const summary = await summarizeTranscript(fullTranscript);
    // 4. Temizlik (isteğe bağlı: part dosyalarını sil)
    partPaths.forEach(f => fs.unlinkSync(f));
    // 5. Sonucu döndür
    res.json({ transcript: fullTranscript, summary });
  } catch (error) {
    console.error('İşlem hatası:', error);
    res.status(500).json({ error: 'İşlem hatası', details: error.message });
  }
});

// Multer konfigürasyonu - ses dosyalarını geçici olarak saklamak için
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     // Benzersiz dosya adı oluştur
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({ 
//   storage: storage,
//   fileFilter: function (req, file, cb) {
//     // Sadece ses dosyalarını kabul et
//     if (file.mimetype.startsWith('audio/')) {
//       cb(null, true);
//     } else {
//       cb(new Error('Sadece ses dosyaları kabul edilir!'), false);
//     }
//   }
// });

// Uploads klasörünü oluştur (eğer yoksa)

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

// OLD ENDPOINT (deprecated)
/*
// Whisper API endpoint'i (eski, artık kullanılmıyor)
app.post('/api/transcribe', async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: 'Dosya adı gerekli' });
    }
    const filePath = path.join(__dirname, 'uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Dosya bulunamadı' });
    }

    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'tr');

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(500).json({ error: 'Whisper API hatası', details: errText });
    }
    const data = await openaiRes.json();
    res.json({ transcript: data.text });
  } catch (error) {
    console.error('Transkripsiyon hatası:', error);
    res.status(500).json({ error: 'Transkripsiyon hatası', details: error.message });
  }
});

// Özetleme endpoint'i (eski, artık kullanılmıyor)
app.post('/api/summarize', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript) {
      return res.status(400).json({ error: 'Transkript gerekli' });
    }

    const systemPrompt = `
Aşağıda bir toplantının yaziya dokulmus hali verilecek. Bu metni temel alarak toplantının özetini oluştur.
Lütfen şu yapıya sadık kal:
- Toplantı Başlığı
- Toplantı Özeti
- Karar Maddeleri
- Aksiyon Maddeleri
- Notlar

Özetin dili sade, Türkçe ve kurumsal olmalı. Gereksiz tekrarlar çıkarılmalı, konu dışı sohbetler atlanmalı. Kısa ama anlamlı bir çıktı oluşturulmalı.
Çıktın markdown formatında olsun.
Bağlama uygun emojiler kullanılmalı.
    `.trim();

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        temperature: 0.5
      })
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(500).json({ error: 'GPT-4 özetleme hatası', details: errText });
    }

    const data = await openaiRes.json();
    const summary = data.choices?.[0]?.message?.content || '';
    res.json({ summary });
  } catch (error) {
    console.error('Özetleme hatası:', error);
    res.status(500).json({ error: 'Özetleme hatası', details: error.message });
  }
});
*/

app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
}); 