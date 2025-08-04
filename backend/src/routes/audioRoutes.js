const express = require('express');
const { upload } = require('../middleware/upload');
const { processAudio } = require('../controllers/audioController');

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Backend çalışıyor!' });
});

router.post('/upload-audio', upload.single('audio'), (req, res) => {
  // Sadece dosya yükleme için
  if (!req.file) {
    return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
  }
  res.json({
    message: 'Ses dosyası başarıyla yüklendi',
    filename: req.file.filename,
    size: req.file.size
  });
});
  
router.post('/process-audio', upload.single('audio'), processAudio);

module.exports = router;