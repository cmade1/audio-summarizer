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
    const partPaths = await splitAudioBySize(inputPath, outputDir, 20);  // parçala
    const fullTranscript = await transcribeAudioParts(partPaths);   // transkripte et    
    const summary = await summarizeTranscript(fullTranscript);     // özetlet  
    partPaths.forEach(f => fs.unlinkSync(f));              // temizlik
    res.json({ transcript: fullTranscript, summary });   // sonuç döndür 
  } catch (error) {
    console.error('İşlem hatası:', error);
    res.status(500).json({ error: 'İşlem hatası', details: error.message });
  }
}

// app.post('/api/process-audio', upload.single('audio'), async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
//       }
//       const inputPath = req.file.path;
//       const outputDir = path.join(__dirname, 'uploads');
//       // 1. Parçala
//       const partPaths = await splitAudioBySize(inputPath, outputDir, 20);
//       // 2. Transkripte et
//       const fullTranscript = await transcribeAudioParts(partPaths);
//       // 3. Özetlet
//       const summary = await summarizeTranscript(fullTranscript);
//       // 4. Temizlik (isteğe bağlı: part dosyalarını sil)
//       partPaths.forEach(f => fs.unlinkSync(f));
//       // 5. Sonucu döndür
//       res.json({ transcript: fullTranscript, summary });
//     } catch (error) {
//       console.error('İşlem hatası:', error);
//       res.status(500).json({ error: 'İşlem hatası', details: error.message });
//     }
//   });


module.exports = { processAudio };