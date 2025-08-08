const path = require('path');
const fs = require('fs');
const { splitAudioBySize } = require('../services/audioService');
const { transcribeAudioParts } = require('../services/transcriptionService');
const { summarizeTranscript } = require('../services/summarizationService');

async function processAudio(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }
    
    console.log('Received file:', req.file.originalname, 'Size:', req.file.size, 'bytes');
    console.log('File mimetype:', req.file.mimetype);
    
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, '../../uploads');
    
    // Uploads dizininin var olduğundan emin ol
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Dosyanın var olduğunu kontrol et
    if (!fs.existsSync(inputPath)) {
      return res.status(400).json({ error: 'Yüklenen dosya bulunamadı' });
    }
    
    console.log('Processing audio file:', inputPath);
    const partPaths = await splitAudioBySize(inputPath, outputDir, 20);
    console.log('Audio split completed, parts:', partPaths.length);
    
    const fullTranscript = await transcribeAudioParts(partPaths);
    console.log('Transcription completed, length:', fullTranscript.length);
    
    const summary = await summarizeTranscript(fullTranscript);
    console.log('Summarization completed');
    
    // Temizlik
    partPaths.forEach(f => {
      try {
        if (fs.existsSync(f)) {
          fs.unlinkSync(f);
          console.log('Deleted part file:', f);
        }
      } catch (err) {
        console.error('Dosya silme hatası:', err);
      }
    });
    
    // Orijinal dosyayı da sil
    try {
      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
        console.log('Deleted original file:', inputPath);
      }
    } catch (err) {
      console.error('Original file deletion error:', err);
    }
    
    res.json({ transcript: fullTranscript, summary });
  } catch (error) {
    console.error('İşlem hatası:', error);
    console.error('Error stack:', error.stack);
    
    // Daha spesifik hata mesajları
    let errorMessage = 'İşlem hatası';
    if (error.message.includes('FFmpeg')) {
      errorMessage = 'Ses dosyası işleme hatası - FFmpeg sorunu';
    } else if (error.message.includes('ENOENT')) {
      errorMessage = 'Dosya bulunamadı hatası';
    } else if (error.message.includes('permission')) {
      errorMessage = 'Dosya erişim izni hatası';
    }
    
    res.status(500).json({ 
      error: errorMessage, 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

module.exports = { processAudio };