import { useRef, useState, useEffect } from "react";
import { jsPDF } from "jspdf";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Hazır");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Seçilen dosya
  const [recordedAudio, setRecordedAudio] = useState(null); // Kaydedilen ses dosyası
  const [transcript, setTranscript] = useState(""); // Transkript sonucu için state
  const [summary, setSummary] = useState(""); // Özet sonucu için state
  const [isProcessing, setIsProcessing] = useState(false); // İşlem durumu
  const [recordingTime, setRecordingTime] = useState(0); // Kayıt süresi
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  // Zamanlayıcı için useEffect
  useEffect(() => {
    let interval = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Saniyeyi dakika:saniye formatına çevir
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const processAudioFile = async (audioFile) => {
    setIsProcessing(true);
    setStatus("Ses dosyası yükleniyor ve işleniyor...");
    setTranscript("");
    setSummary("");

    try {
      const formData = new FormData();

      // Dosya formatına göre uygun uzantı kullan
      let fileName = "recording.webm";
      if (audioFile.type.includes("mp4")) {
        fileName = "recording.m4a";
      } else if (audioFile.type.includes("wav")) {
        fileName = "recording.wav";
      } else if (audioFile.type.includes("mp3")) {
        fileName = "recording.mp3";
      }

      formData.append("audio", audioFile, fileName);

      // Tek endpoint!
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/process-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(errorData.error || "İşleme hatası");
        throw new Error(errorData.details || "İşleme hatası");
      }

      const result = await response.json();
      setTranscript(result.transcript);
      setSummary(result.summary);
      setStatus("İşlem tamamlandı!");
      setSelectedFile(null);
      setRecordedAudio(null);
    } catch (error) {
      console.error("İşleme hatası:", error);
      setStatus("İşleme sırasında bir hata oluştu");
    } finally {
      setIsProcessing(false);
    }
  };

  // FFmpeg durumunu kontrol et
  const checkFFmpegStatus = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiUrl}/api/ffmpeg-status`);
      const data = await response.json();
      console.log("FFmpeg Status:", data);
      setStatus(
        `FFmpeg durumu: ${data.ffmpeg.exists ? "Kurulu" : "Kurulu değil"}`
      );
    } catch (error) {
      console.error("FFmpeg status check error:", error);
      setStatus("FFmpeg durumu kontrol edilemedi");
    }
  };

  // Kaydı başlat
  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined") {
      setStatus(
        "Bu tarayıcıda ses kaydı desteklenmiyor. Lütfen farklı bir tarayıcı veya cihaz kullanın."
      );
      return;
    }
    setStatus("Mikrofona erişiliyor...");
    try {
      // Kullanıcıdan mikrofon izni al
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Desteklenen formatları kontrol et - öncelik sırası
      const formats = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/wav",
        "audio/ogg;codecs=opus",
      ];

      let mimeType = "";
      for (const format of formats) {
        if (MediaRecorder.isTypeSupported(format)) {
          mimeType = format;
          console.log("Selected format:", format);
          break;
        }
      }

      if (!mimeType) {
        setStatus("Bu tarayıcıda desteklenen ses formatı bulunamadı");
        return;
      }

      // MediaRecorder ile sesi kaydet
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
        setStatus("Kayıt başladı");
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        setStatus("Kayıt durdu");
        // Kayıt bitince tüm ses parçalarını birleştir
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType,
        });

        console.log("Recorded audio blob:", {
          size: audioBlob.size,
          type: audioBlob.type,
        });

        // Kaydedilen ses dosyasını sakla
        setRecordedAudio(audioBlob);
        setStatus("Kayıt tamamlandı. Özet çıkarmak için tıklayın.");
      };

      mediaRecorder.start();
    } catch (err) {
      setStatus("Mikrofon erişimi reddedildi veya bir hata oluştu");
      console.error(err);
    }
  };

  // Kaydı durdur
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setStatus("Kayıt durduruluyor...");
    }
  };

  const downloadTranscriptAsPDF = () => {
    const doc = new jsPDF();

    // Türkçe karakterler için uygun font ayarları
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    // Başlık - Türkçe karakterleri düzelt
    const title = "Transkript"
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");

    doc.text(title, 10, 20);

    // İçerik için daha kalın font
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Türkçe karakterleri düzgün göstermek için encoding ayarı
    const turkishText = transcript
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");

    // Metni satırlara böl - Türkçe karakterler için daha geniş alan
    const lines = doc.splitTextToSize(turkishText, 180);

    // Her satırı ayrı ayrı yaz
    let yPosition = 35;
    lines.forEach((line, index) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 10, yPosition);
      yPosition += 9; // Satır aralığını artırdım
    });

    doc.save("transkript.pdf");
  };

  const downloadSummaryAsPDF = () => {
    const doc = new jsPDF();

    // Türkçe karakterler için uygun font ayarları
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    // Başlık - Türkçe karakterleri düzelt
    const title = "Toplantı Özeti"
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");

    doc.text(title, 10, 20);

    // İçerik için daha kalın font
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);

    // Türkçe karakterleri düzgün göstermek için encoding ayarı
    const turkishText = summary
      .replace(/ğ/g, "g")
      .replace(/Ğ/g, "G")
      .replace(/ü/g, "u")
      .replace(/Ü/g, "U")
      .replace(/ş/g, "s")
      .replace(/Ş/g, "S")
      .replace(/ı/g, "i")
      .replace(/İ/g, "I")
      .replace(/ö/g, "o")
      .replace(/Ö/g, "O")
      .replace(/ç/g, "c")
      .replace(/Ç/g, "C");

    // Metni satırlara böl - Türkçe karakterler için daha geniş alan
    const lines = doc.splitTextToSize(turkishText, 180);

    // Her satırı ayrı ayrı yaz
    let yPosition = 35;
    lines.forEach((line, index) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 10, yPosition);
      yPosition += 9; // Satır aralığını artırdım
    });

    doc.save("ozet.pdf");
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-light-dark p-4">
      {/* Başlık */}
      <div className="mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center">
          Ses Özetleyici
        </h1>
        <p className="text-gray-300 text-center mt-2 text-lg"></p>
      </div>

      {/* Kayıt Butonları */}
      <div className="flex gap-8 mb-8 items-center">
        {/* Start Recording Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={startRecording}
            disabled={isRecording || isProcessing}
            className="w-16 h-16 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed hover:cursor-pointer rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-8 h-8 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <span className="text-white text-sm mt-2 font-medium">
            Kaydı Başlat
          </span>
        </div>

        {/* Stop Recording Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={stopRecording}
            disabled={!isRecording || isProcessing}
            className="w-16 h-16 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed hover:cursor-pointer rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
          <span className="text-white text-sm mt-2 font-medium">
            Kaydı Durdur
          </span>
        </div>
      </div>

      {/* Zamanlayıcı */}
      {isRecording && (
        <div className="mb-8 text-center">
          <div className="text-3xl font-bold text-white bg-black bg-opacity-30 px-6 py-3 rounded-full">
            {formatTime(recordingTime)}
          </div>
        </div>
      )}

      {/* Dosya Yükleme */}
      <div className="mb-8 mt-4">
        <input
          ref={fileInputRef}
          id="audio-upload"
          type="file"
          accept="audio/webm,audio/mp3,audio/wav,audio/m4a"
          onChange={(e) => {
            if (e.target.files[0]) {
              setSelectedFile(e.target.files[0]);
              setRecordedAudio(null); // Kaydedilen sesi temizle
              setTranscript(""); // Önceki transkripti temizle
              setSummary(""); // Önceki özeti temizle
            }
          }}
          className="hidden"
        />
        <label
          htmlFor="audio-upload"
          className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <svg
            className="w-6 h-6 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <span className="text-lg">Ses Dosyası Yükle</span>
        </label>
      </div>

      {/* Seçilen Dosya Bilgisi */}
      {selectedFile && (
        <div className="mb-6 text-white flex flex-col items-center justify-center">
          <div className="bg-gray-800 bg-opacity-50 rounded-lg px-6 py-4 backdrop-blur-sm border border-gray-700">
            <p className="text-lg font-medium">
              Seçilen dosya: {selectedFile.name}
            </p>
            <button
              onClick={() => processAudioFile(selectedFile)}
              disabled={isProcessing}
              className="mt-3 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-700 hover:cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Özet Çıkar
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setRecordedAudio(null);
                setTranscript("");
                setSummary("");
                setStatus("Hazır");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="mt-3 px-6 py-2 bg-red-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-red-700 hover:cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg ml-3"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* Kaydedilen Ses Dosyası için Özet Çıkar Butonu */}
      {recordedAudio && (
        <div className="mb-6 text-white flex flex-col items-center justify-center">
          <div className="bg-gray-800 bg-opacity-50 rounded-lg px-6 py-4 backdrop-blur-sm border border-gray-700">
            <p className="text-lg font-medium mb-2">Kayıt tamamlandı!</p>
            <button
              onClick={() => processAudioFile(recordedAudio)}
              disabled={isProcessing}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Özet Çıkar
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setRecordedAudio(null);
                setTranscript("");
                setSummary("");
                setStatus("Hazır");
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-red-700 hover:cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg ml-3 mt-3"
            >
              İptal Et
            </button>
          </div>
        </div>
      )}

      {/* Durum Mesajı - Daha az dikkat çekici */}
      <div className="text-sm text-gray-400 font-medium mb-6 text-center">
        Durum: {status}
      </div>

      {/* FFmpeg Durum Kontrolü */}
      <div className="mb-4 text-center">
        <button
          onClick={checkFFmpegStatus}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-all duration-200 text-sm"
        >
          FFmpeg Durumunu Kontrol Et
        </button>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 mt-4 text-white">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-600"></div>
          <span>İşleniyor...</span>
        </div>
      )}

      {/* Sonuçlar - Yan Yana Kutular */}
      {(transcript || summary) && (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full max-w-6xl">
          {/* Transkript Kutusu */}
          {transcript && (
            <div className="w-full lg:flex-1 bg-white rounded-lg shadow-lg p-6">
              <h2 className="font-bold text-lg mb-4 text-gray-800">
                Transkript
              </h2>
              <div className="bg-gray-100 rounded p-4 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-800 text-sm">
                  {transcript}
                </pre>
              </div>
              <button
                onClick={downloadTranscriptAsPDF}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 hover:cursor-pointer flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>PDF İndir</span>
              </button>
            </div>
          )}

          {/* Özet Kutusu */}
          {summary && (
            <div className="w-full lg:flex-1 bg-white rounded-lg shadow-lg p-6">
              <h2 className="font-bold text-lg mb-4 text-gray-800">Özet</h2>
              <div className="bg-gray-100 rounded p-4 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-800 text-sm">
                  {summary}
                </pre>
              </div>
              <button
                onClick={downloadSummaryAsPDF}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 hover:cursor-pointer flex items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>PDF İndir</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
