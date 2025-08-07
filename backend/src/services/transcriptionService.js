const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

async function transcribeAudioParts(partPaths) {
  const transcripts = await Promise.all(
      partPaths.map(async (partPath) => {
          let retryCount = 0;
          const maxRetries = 1;
          while (retryCount < maxRetries) {
              try {
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
                      body: formData,
                      timeout: 60000
                  });
                  if (!response.ok) break;
                  const data = await response.json();
                  return data.text;
              } catch (error) {
                  console.error(`Transkripsiyon hatası (deneme ${retryCount + 1}):`, error.message);
                  retryCount++;
                  if (retryCount < maxRetries) {
                      await new Promise(resolve => setTimeout(resolve, 1000));
                  }
              }
          }
          return '';
      })
  );
  return transcripts.join('\n');
}


module.exports = {
    transcribeAudioParts
};