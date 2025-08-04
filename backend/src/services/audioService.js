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
        if (err) reject(err);
        else resolve(metadata.format.duration);
      });
    });
  };
  const stat = await util.promisify(fs.stat)(inputPath);
  const totalSize = stat.size;
  const duration = await getDuration();
  const segmentTime = Math.max(30, Math.min(60, Math.floor(duration * (maxSizeMB * 1024 * 1024) / totalSize)));
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(path.join(outputDir, 'part-%03d.mp3'))
      .audioCodec('copy')
      .format('mp3')
      .addOption('-f', 'segment')
      .addOption('-segment_time', segmentTime)
      .on('end', () => {
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

module.exports = {
  splitAudioBySize,
  cleanOldParts
}