const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');




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

module.exports = {
    transcribeAudioParts
};