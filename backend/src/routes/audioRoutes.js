const express = require('express');
const { upload } = require('../middleware/upload');
const { processAudio } = require('../controllers/audioController');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// FFmpeg durumunu kontrol et
router.get('/ffmpeg-status', (req, res) => {
  try {
    const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
    const ffprobePath = require('@ffprobe-installer/ffprobe').path;
    
    const ffmpegExists = fs.existsSync(ffmpegPath);
    const ffprobeExists = fs.existsSync(ffprobePath);
    
    res.json({
      ffmpeg: {
        path: ffmpegPath,
        exists: ffmpegExists,
        size: ffmpegExists ? fs.statSync(ffmpegPath).size : 0
      },
      ffprobe: {
        path: ffprobePath,
        exists: ffprobeExists,
        size: ffprobeExists ? fs.statSync(ffprobePath).size : 0
      },
      uploadsDir: {
        path: path.join(__dirname, '../../uploads'),
        exists: fs.existsSync(path.join(__dirname, '../../uploads'))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'FFmpeg status check failed', details: error.message });
  }
});

router.post('/process-audio', upload.single('audio'), processAudio);

module.exports = router;