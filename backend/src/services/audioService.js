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
          console.log('Audio metadata:', metadata.format);
          resolve(metadata.format.duration);
        }
      });
    });
  };
  
  try {
    const stat = await util.promisify(fs.stat)(inputPath);
    const totalSize = stat.size;
    console.log('Input file size:', totalSize, 'bytes');
    
    const duration = await getDuration();
    console.log('Audio duration:', duration, 'seconds');
    
    const segmentTime = Math.max(30, Math.min(60, Math.floor(duration * (maxSizeMB * 1024 * 1024) / totalSize)));
    console.log('Segment time:', segmentTime, 'seconds');
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .output(path.join(outputDir, 'part-%03d.mp3'))
        .audioCodec('libmp3lame')
        .format('mp3')
        .addOption('-f', 'segment')
        .addOption('-segment_time', segmentTime)
        .addOption('-ac', '1') // Mono audio
        .addOption('-ar', '16000') // 16kHz sample rate
        .addOption('-b:a', '64k') // 64kbps bitrate
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('FFmpeg progress:', progress);
        })
        .on('end', () => {
          console.log('FFmpeg processing completed');
          const partFiles = fs.readdirSync(outputDir)
            .filter(f => f.startsWith('part-') && f.endsWith('.mp3'))
            .map(f => path.join(outputDir, f));
          console.log('Generated part files:', partFiles);
          resolve(partFiles);
        })
        .on('error', (err) => {
          console.error('FFmpeg error details:', err);
          console.error('FFmpeg stderr:', err.stderr);
          reject(new Error(`FFmpeg processing failed: ${err.message}`));
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