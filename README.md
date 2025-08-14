# Ses Özetleyici (Audio Summarizer)

Bu proje, ses dosyalarını işleyerek transkript çıkarma ve özetleme işlemlerini gerçekleştiren full-stack bir web uygulamasıdır. Kullanıcılar ses kaydı yapabilir veya mevcut ses dosyalarını yükleyebilir, ardından OpenAI API'leri kullanılarak transkript ve özet elde edebilirler.

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
npm run dev
```

2. **Frontend Kurulumu**
```bash
cd frontend
npm install
npm run dev
```

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

### Vercel Deployment
- Backend: `vercel.json` ile serverless functions
- Frontend: Vite build ile static hosting
- Environment variables: Vercel dashboard'da ayarlanır

### Production Gereksinimleri
- OpenAI API key
- CORS origin ayarları
- FFmpeg binary'leri (otomatik)

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
