const path = require('path');
const fs = require('fs');
const util = require('util');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function cleanOldParts(outputDir) {
    fs.readdirSync(outputDir)
      .filter(f => f.startsWith('part-') && f.endsWith('.mp3'))
      .forEach(f => fs.unlinkSync(path.join(outputDir, f)));
}
  
async function splitAudioBySize (inputPath , outputDir , maxSizeMB = 20 ) {
  const getDuration = () => {
    return new Promise((resolve , reject) => {
      ffmpeg.ffprobe(inputPath , (err , metadata) => {
        if (err) {
          console.error('FFprobe error:', err);
          reject(err);
        } else {
          
          const duration = metadata.format.duration || 60; 
          resolve(duration);
        }
      });
    });
  };
  
  try {
    const stat = await util.promisify(fs.stat)(inputPath);
    const totalSize = stat.size;
    
    const duration = await getDuration();
    
    
    let segmentTime = 30; 
    if (duration && duration > 0 && totalSize > 0) {
      segmentTime = Math.max(30, Math.min(60, Math.floor(duration * (maxSizeMB * 1024 * 1024) / totalSize)));
    }
    
    return new Promise((resolve, reject) => {
      
      const tempMp3Path = path.join(outputDir, 'temp.mp3');
      
      ffmpeg(inputPath)
        .output(tempMp3Path)
        .audioCodec('libmp3lame')
        .format('mp3')
        .addOption('-ac', '1') // Mono
        .addOption('-ar', '16000') // 16kHz
        .addOption('-b:a', '64k') // 64kbps
        .addOption('-y') // Overwrite
        .on('end', () => {
          // MP3 dosyasını segmentlere böl
          ffmpeg(tempMp3Path)
            .output(path.join(outputDir, 'part-%03d.mp3'))
            .audioCodec('copy') // Re-encode yapma, sadece kopyala
            .addOption('-f', 'segment')
            .addOption('-segment_time', segmentTime.toString())
            .addOption('-y')
            .on('end', () => {
              // Temp MP3 dosyasını sil
              try {
                if (fs.existsSync(tempMp3Path)) {
                  fs.unlinkSync(tempMp3Path);
                }
              } catch (err) {
                console.error('Error deleting temp MP3:', err);
              }
              
              const partFiles = fs.readdirSync(outputDir)
                .filter(f => f.startsWith('part-') && f.endsWith('.mp3'))
                .map(f => path.join(outputDir, f));
              resolve(partFiles);
            })
            .on('error', (err) => {
              console.error('Split error:', err);
              reject(new Error(`Audio splitting failed: ${err.message}`));
            })
            .run();
        })
        .on('error', (err) => {
          console.error('Conversion error:', err);
          reject(new Error(`Audio conversion failed: ${err.message}`));
        })
        .run();
    });
  } catch (error) {
    console.error('Audio processing error:', error);
    throw error;
  }
};

module.exports = {
  splitAudioBySize,
  cleanOldParts
}