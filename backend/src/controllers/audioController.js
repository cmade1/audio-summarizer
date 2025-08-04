const path = require('path');
const fs = require('fs');
const { splitAudioBySize, cleanOldParts } = require('../services/audioService');
const { transcribeAudioParts } = require('../services/transcriptionService');
const { summarizeTranscript } = require('../services/summarizationService');

async function processAudio(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }
    const inputPath = req.file.path;
    const outputDir = path.join(__dirname, '../../uploads');
    const partPaths = await splitAudioBySize(inputPath, outputDir, 20);
    const fullTranscript = await transcribeAudioParts(partPaths);
    const summary = await summarizeTranscript(fullTranscript);
    partPaths.forEach(f => {
      try {
        fs.unlinkSync(f);
      } catch (err) {
        console.error('Dosya silme hatası:', err);
      }
    });
    res.json({ transcript: fullTranscript, summary });
  } catch (error) {
    console.error('İşlem hatası:', error);
    res.status(500).json({ error: 'İşlem hatası', details: error.message });
  }
}

module.exports = { processAudio };