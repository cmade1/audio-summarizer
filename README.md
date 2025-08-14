# Ses Özetleyici (Audio Summarizer)

[![Live Project](https://img.shields.io/badge/Live%20Project-View%20App-blue?style=for-the-badge&logo=vercel)](https://audio-summarizer-phi.vercel.app/)

**🌐 [Canlı Uygulamayı Görüntüle](https://audio-summarizer-phi.vercel.app/)**

Bu proje, ses dosyalarını işleyerek transkript çıkarma ve özetleme işlemlerini gerçekleştiren full-stack bir web uygulamasıdır. Kullanıcılar ses kaydı yapabilir veya mevcut ses dosyalarını yükleyebilir, ardından OpenAI API'leri kullanılarak transkript ve özet elde edebilirler.

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js 18+
- FFmpeg (otomatik kurulum)
- OpenAI API Key

### Environment Variables

**Backend (.env)**
```env
OPENAI_API_KEY=your_openai_api_key
PORT=3001
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:3001
```

### Kurulum Adımları

1. **Backend Kurulumu**
```bash
cd backend
npm install
npm start
```

2. **Frontend Kurulumu**
```bash
cd frontend
npm install
npm run dev
```

### 🖥️ Lokal Çalıştırma

Projeyi lokal ortamda çalıştırmak için:

1. **Terminal 1 - Backend:**
```bash
cd backend
npm start
# Backend http://localhost:3001 adresinde çalışacak
```

2. **Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Frontend http://localhost:5173 adresinde çalışacak
```

3. **Tarayıcıda açın:** `http://localhost:5173`

**Not:** Backend'in çalışması için `.env` dosyasında `OPENAI_API_KEY` tanımlı olmalıdır.

## 🏗️ Proje Mimarisi

### Frontend (React + Vite)
- **Teknoloji Stack**: React 19, Vite, Tailwind CSS
- **Ana Bileşenler**:
  - `App.jsx`: Ana uygulama bileşeni, state yönetimi ve API çağrıları
  - `AudioRecorder.jsx`: Tarayıcı tabanlı ses kaydı
  - `FileUploader.jsx`: Dosya yükleme arayüzü
  - `DragAndDrop.jsx`: Sürükle-bırak dosya yükleme
  - `TranscriptBox.jsx`: Transkript görüntüleme ve PDF indirme
  - `SummaryBox.jsx`: Özet görüntüleme ve PDF indirme

### Backend (Node.js + Express)
- **Teknoloji Stack**: Node.js, Express, FFmpeg, OpenAI API
- **Mimari**: MVC pattern ile modüler yapı
- **Ana Servisler**:
  - `audioService.js`: Ses dosyası işleme ve bölme
  - `transcriptionService.js`: OpenAI Whisper API entegrasyonu
  - `summarizationService.js`: OpenAI GPT-4 özetleme

## 🔧 Teknik Detaylar

### Ses İşleme Pipeline

1. **Dosya Yükleme**: Multer middleware ile güvenli dosya yükleme
2. **Format Dönüştürme**: FFmpeg ile MP3 formatına dönüştürme
3. **Büyük Dosya Bölme**: 20MB limit için otomatik segmentasyon
4. **Transkripsiyon**: OpenAI Whisper API ile Türkçe transkripsiyon
5. **Özetleme**: GPT-4 ile yapılandırılmış özet çıkarma

### API Endpoints

```
POST /api/process-audio
- Ses dosyası yükleme ve işleme
- Multipart form data kabul eder
- Response: { transcript, summary }

GET /api/test
- Backend sağlık kontrolü
```

### Güvenlik ve Performans

- **CORS**: Sadece izinli origin'ler (production + development)
- **Dosya Temizleme**: İşlem sonrası otomatik dosya silme
- **Hata Yönetimi**: Kapsamlı error handling ve retry mekanizması
- **Timeout**: 60 saniye maksimum işlem süresi


## 📁 Dosya Yapısı

```
audio-summarizer/
├── backend/
│   ├── src/
│   │   ├── controllers/     # API endpoint handlers
│   │   ├── middleware/      # Multer upload middleware
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Business logic
│   │   └── utils/           # FFmpeg utilities
│   ├── uploads/             # Geçici dosya depolama
│   └── server.js            # Ana server dosyası
├── frontend/
│   ├── src/
│   │   ├── components/      # React bileşenleri
│   │   ├── utils/           # PDF helpers, format utilities
│   │   └── App.jsx          # Ana uygulama bileşeni
│   └── package.json
└── README.md
```

## 🔄 İş Akışı

1. **Ses Girişi**: Kullanıcı ses kaydı yapar veya dosya yükler
2. **Dosya İşleme**: Backend'de FFmpeg ile format dönüştürme
3. **Büyük Dosya Bölme**: 20MB üzeri dosyalar otomatik bölünür
4. **Transkripsiyon**: Her segment için OpenAI Whisper API çağrısı
5. **Metin Birleştirme**: Tüm segmentler birleştirilir
6. **Özetleme**: GPT-4 ile yapılandırılmış özet çıkarılır
7. **Sonuç**: Transkript ve özet frontend'e döndürülür
8. **PDF Export**: jsPDF ile PDF indirme seçeneği

## 🔍 Önemli Kod Parçaları

### Backend - Ana İşlem Akışı

**`controllers/audioController.js` - Ana İşlem Controller'ı:**
```javascript
async function processAudio(req, res) {
  try {
    // 1. Dosya kontrolü
    if (!req.file) {
      return res.status(400).json({ error: 'Ses dosyası bulunamadı' });
    }
    
    // 2. Ses dosyasını böl (20MB limit için)
    const partPaths = await splitAudioBySize(inputPath, outputDir, 20);
    
    // 3. Her parçayı transkribe et
    const fullTranscript = await transcribeAudioParts(partPaths);
    
    // 4. Transkripti özetle
    const summary = await summarizeTranscript(fullTranscript);
    
    // 5. Geçici dosyaları temizle
    partPaths.forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    
    res.json({ transcript: fullTranscript, summary });
  } catch (error) {
    // Hata yönetimi
  }
}
```

### Backend - Ses İşleme Servisi

**`services/audioService.js` - FFmpeg ile Ses Bölme:**
```javascript
async function splitAudioBySize(inputPath, outputDir, maxSizeMB = 20) {
  // 1. Dosya süresini al
  const duration = await getDuration();
  
  // 2. Segment süresini hesapla (30-60 saniye arası)
  let segmentTime = 30;
  if (duration && totalSize > 0) {
    segmentTime = Math.max(30, Math.min(60, 
      Math.floor(duration * (maxSizeMB * 1024 * 1024) / totalSize)));
  }
  
  // 3. FFmpeg ile MP3'e dönüştür
  ffmpeg(inputPath)
    .output(tempMp3Path)
    .audioCodec('libmp3lame')
    .addOption('-ac', '1')     // Mono
    .addOption('-ar', '16000') // 16kHz
    .addOption('-b:a', '64k')  // 64kbps
    
  // 4. Segmentlere böl
  ffmpeg(tempMp3Path)
    .output(path.join(outputDir, 'part-%03d.mp3'))
    .addOption('-f', 'segment')
    .addOption('-segment_time', segmentTime.toString())
}
```

### Backend - OpenAI API Entegrasyonu

**`services/transcriptionService.js` - Whisper API:**
```javascript
async function transcribeAudioParts(partPaths) {
  const transcripts = await Promise.all(
    partPaths.map(async (partPath) => {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(partPath));
      formData.append('model', 'whisper-1');
      formData.append('language', 'tr'); // Türkçe
      
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders()
        },
        body: formData,
        timeout: 60000 // 60 saniye timeout
      });
      
      const data = await response.json();
      return data.text;
    })
  );
  return transcripts.join('\n');
}
```

**`services/summarizationService.js` - GPT-4 Özetleme:**
```javascript
async function summarizeTranscript(transcript) {
  const systemPrompt = `
    Aşağıda bir toplantının yazıya dökülmüş hali verilecek. Bu metni temel alarak toplantının özetini oluştur.
    Lütfen şu yapıya sadık kal:
    - Toplantı Başlığı
    - Toplantı Özeti
    - Karar Maddeleri
    - Aksiyon Maddeleri
    - Notlar
  `.trim();
  
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
```

### Frontend - Ana Uygulama Mantığı

**`App.jsx` - State Yönetimi ve API Çağrıları:**
```javascript
// Ana state'ler
const [isRecording, setIsRecording] = useState(false);
const [transcript, setTranscript] = useState("");
const [summary, setSummary] = useState("");
const [isProcessing, setIsProcessing] = useState(false);

// Ses işleme fonksiyonu
const processAudioFile = async (audioFile) => {
  setIsProcessing(true);
  const formData = new FormData();
  formData.append("audio", audioFile, fileName);
  
  const response = await fetch(`${apiUrl}/api/process-audio`, {
    method: "POST",
    body: formData,
  });
  
  const result = await response.json();
  setTranscript(result.transcript);
  setSummary(result.summary);
  setIsProcessing(false);
};
```
## 🛠️ Özellikler

### Frontend
- ✅ Tarayıcı tabanlı ses kaydı
- ✅ Drag & drop dosya yükleme
- ✅ Gerçek zamanlı kayıt süresi
- ✅ İşlem durumu göstergeleri
- ✅ PDF indirme (transkript/özet)
- ✅ Responsive tasarım
- ✅ Türkçe karakter desteği

### Backend
- ✅ Çoklu ses formatı desteği
- ✅ Otomatik dosya bölme
- ✅ Retry mekanizması
- ✅ Hata yönetimi
- ✅ Dosya temizleme
- ✅ CORS güvenliği

## 🚀 Deployment

### Platform Dağılımı
- **Frontend**: Vercel ile yayınlandı
- **Backend**: Render ile yayınlandı

### Production Gereksinimleri
- OpenAI API key
- CORS origin ayarları (frontend URL'i backend'e eklenmeli)
- FFmpeg binary'leri (Render'da otomatik)

## 🔍 Hata Ayıklama

### Yaygın Sorunlar
1. **FFmpeg Hatası**: Binary path kontrolü
2. **CORS Hatası**: Origin whitelist kontrolü
3. **Dosya Boyutu**: 20MB limit kontrolü
4. **API Timeout**: 60 saniye limit

### Log Kontrolü
```bash
# Backend logları
npm run dev

# Frontend console
F12 > Console
```

## 📝 Geliştirme Notları

- **State Management**: React useState hooks
- **File Handling**: Blob API ve FormData
- **Audio Processing**: MediaRecorder API
- **PDF Generation**: jsPDF library
- **Styling**: Tailwind CSS utility classes

Bu proje, modern web teknolojileri kullanarak ses işleme ve AI entegrasyonu sağlayan kapsamlı bir çözümdür.


### 🔧 Teknik Notlar

**Önemli Konfigürasyonlar:**
- **FFmpeg Ayarları**: Mono, 16kHz, 64kbps (Whisper için optimize)
- **Dosya Boyutu Limiti**: 20MB (otomatik bölme)
- **Segment Süresi**: 30-60 saniye (dinamik hesaplama)
- **API Timeout**: 60 saniye
- **Retry Mekanizması**: 1 kez tekrar deneme

**Güvenlik Önlemleri:**
- CORS whitelist (production + development)
- Dosya tipi kontrolü (sadece audio/*)
- Otomatik dosya temizleme
- Hata mesajlarında detay gizleme
