import { useRef, useState } from "react";
import { jsPDF } from "jspdf";
import "./dejavu-sans-normal.js";

function App() {
  // Kayıt durumunu ve MediaRecorder referansını tutuyoruz
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Hazır");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Seçilen dosya
  const [transcript, setTranscript] = useState(""); // Transkript sonucu için state
  const [summary, setSummary] = useState(""); // Özet sonucu için state
  const [isProcessing, setIsProcessing] = useState(false); // İşlem durumu
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Ses dosyasını backend'e gönder ve işlemleri yap
  const processAudioFile = async (audioFile) => {
    setIsProcessing(true);
    setStatus("Ses dosyası yükleniyor...");
    setTranscript(""); // Önceki transkripti temizle
    setSummary(""); // Önceki özeti temizle

    try {
      const formData = new FormData();
      formData.append("audio", audioFile, "recording.webm");

      const response = await fetch("http://localhost:3001/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Yükleme hatası");
      }

      const result = await response.json();
      setStatus(`Ses dosyası yüklendi: ${result.filename}`);

      // --- BURADA TRANSKRİPSİYON İSTEĞİ ---
      setStatus("Transkripsiyon başlatılıyor...");
      const transcribeRes = await fetch("http://localhost:3001/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: result.filename }),
      });

      if (!transcribeRes.ok) {
        throw new Error("Transkripsiyon hatası");
      }

      const transcribeData = await transcribeRes.json();
      setTranscript(transcribeData.transcript);
      setStatus("Transkripsiyon tamamlandı!");

      // --- BURADA ÖZETLEME İSTEĞİ ---
      setStatus("Özetleme başlatılıyor...");
      const summarizeRes = await fetch("http://localhost:3001/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcribeData.transcript }),
      });

      if (!summarizeRes.ok) {
        throw new Error("Özetleme hatası");
      }

      const summarizeData = await summarizeRes.json();
      setSummary(summarizeData.summary);
      setStatus("İşlem tamamlandı!");

    } catch (error) {
      console.error("Yükleme/transkripsiyon/özetleme hatası:", error);
      setStatus("İşlem sırasında hata oluştu");
    } finally {
      setIsProcessing(false);
    }
  };

  // Kaydı başlat
  const startRecording = async () => {
    setStatus("Mikrofona erişiliyor...");
    try {
      // Kullanıcıdan mikrofon izni al
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // MediaRecorder ile sesi kaydet
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
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
          type: "audio/webm",
        });
        console.log("Kaydedilen ses Blob:", audioBlob);

        // Ses dosyasını backend'e gönder
        processAudioFile(audioBlob);
      };

      mediaRecorder.start();
    } catch (err) {
      setStatus("Mikrofon erişimi reddedildi veya hata oluştu");
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Transkript", 10, 10);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(transcript, 190);
    doc.text(lines, 10, 20);
    doc.save("transkript.pdf");
  };

  const downloadSummaryAsPDF = () => {
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text("Toplantı Özeti", 10, 10);
    doc.setFontSize(10);
    // Türkçe karakterler için splitTextToSize ile satırları böl
    const lines = doc.splitTextToSize(summary, 190);
    doc.text(lines, 10, 20);
    doc.save("ozet.pdf");
  };
  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-light-dark p-4">
      <h1 className="text-2xl font-bold mb-4 text-white">----------------</h1>
      
      {/* Kayıt Butonları */}
      <div className="flex gap-4 mb-4">
        <button
          onClick={startRecording}
          disabled={isRecording || isProcessing}
          className="px-4 py-2 bg-green-700 text-white font-bold rounded disabled:opacity-50 hover:cursor-pointer hover:bg-green-800"
        >
          Kaydı Başlat
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording || isProcessing}
          className="px-4 py-2 bg-red-700 text-white font-bold rounded disabled:opacity-50 hover:cursor-pointer hover:bg-red-800"
        >
          Kaydı Durdur
        </button>
      </div>

      {/* Dosya Yükleme */}
      <div className="mb-4">
        <input
          id="audio-upload"
          type="file"
          accept="audio/webm,audio/mp3,audio/wav,audio/m4a"
          onChange={(e) => {
            if (e.target.files[0]) {
              setSelectedFile(e.target.files[0]);
              setTranscript(""); // Önceki transkripti temizle
              setSummary(""); // Önceki özeti temizle
            }
          }}
          className="hidden"
        />
        <label
          htmlFor="audio-upload"
          className="px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700 transition"
        >
          Ses Dosyası Yükle
        </label>
      </div>

      {/* Seçilen Dosya Bilgisi */}
      {selectedFile && (
        <div className="mb-4 text-white flex flex-col items-center justify-center">
          <p className="text-lg  ">Seçilen dosya: {selectedFile.name}</p>
          <button
            onClick={() => processAudioFile(selectedFile)}
            disabled={isProcessing}
            className="mt-2 px-4 py-2 bg-purple-600 text-white font-bold rounded disabled:opacity-50 hover:cursor-pointer hover:bg-purple-700 "
          >
            Özet Çıkar
          </button>
        </div>
      )}

      {/* Durum Mesajı */}
      <div className="text-lg text-white font-medium mb-4">Durum: {status}</div>
      
      {isProcessing && (
        <div className="flex items-center gap-2 mt-4 text-white">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-600"></div>
          <span>İşlem yapılıyor...</span>
        </div>
      )}

      {/* Sonuçlar - Yan Yana Kutular */}
      {(transcript || summary) && (
        <div className="flex gap-8 w-full max-w-6xl ">
          {/* Transkript Kutusu */}
          {transcript && (
            <div className="flex-1 bg-white rounded-lg shadow-lg p-4">
              <h2 className="font-bold text-lg mb-3 text-gray-800">Transkript</h2>
              <div className="bg-gray-100 rounded p-3 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-800 text-sm">{transcript}</pre>
              </div>
              <button 
                onClick={downloadTranscriptAsPDF}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 hover:cursor-pointer">
                Transkripti İndir
              </button>
            </div>
          )}

          {/* Özet Kutusu */}
          {summary && (
            <div className="flex-1 bg-white rounded-lg shadow-lg p-4">
              <h2 className="font-bold text-lg mb-3 text-gray-800">Özet</h2>
              <div className="bg-gray-100 rounded p-3 h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-gray-800 text-sm">{summary}</pre>
              </div>
              <button 
                onClick={downloadSummaryAsPDF}
                className="mt-3 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 hover:cursor-pointer">
                Özeti İndir
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
