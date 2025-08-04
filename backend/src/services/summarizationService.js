const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');



async function summarizeTranscript(transcript) {
    const systemPrompt =  `
    Aşağıda bir toplantının yaziya dokulmus hali verilecek. Bu metni temel alarak toplantının özetini oluştur.
    Lütfen şu yapıya sadık kal:
    - Toplantı Başlığı
    - Toplantı Özeti
    - Karar Maddeleri
    - Aksiyon Maddeleri
    - Notlar
    
    Özetin dili sade, Türkçe ve kurumsal olmalı. Gereksiz tekrarlar çıkarılmalı, konu dışı sohbetler atlanmalı. Kısa ama anlamlı bir çıktı oluşturulmalı.
    Çıktın markdown formatında olsun.
    Bağlama uygun emojiler kullanılmalı.
        `.trim(); // prompt'un tamamı
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        temperature: 0.5
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

module.exports = {
    summarizeTranscript
};  