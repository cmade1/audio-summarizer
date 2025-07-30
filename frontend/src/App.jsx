import { useRef, useState } from "react";

function App() {
  // Kayıt durumunu ve MediaRecorder referansını tutuyoruz
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Hazır");
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Ses dosyasını backend'e gönder
  const uploadAudioToBackend = async (audioBlob) => {
    setIsUploading(true);
    setStatus("Ses dosyası yükleniyor...");

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("http://localhost:3001/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Yükleme hatası");
      }

      const result = await response.json();
      console.log("Backend yanıtı:", result);
      setStatus(`Ses dosyası yüklendi: ${result.filename}`);
    } catch (error) {
      console.error("Yükleme hatası:", error);
      setStatus("Ses dosyası yüklenirken hata oluştu");
    } finally {
      setIsUploading(false);
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
        uploadAudioToBackend(audioBlob);
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

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-light-dark p-4">
      <h1 className="text-2xl font-bold mb-4">Ses Kaydı</h1>
      <div className="flex gap-4 mb-4">
        <button
          onClick={startRecording}
          disabled={isRecording || isUploading}
          className="px-4 py-2 bg-green-700 text-white rounded disabled:opacity-50 hover:cursor-pointer"
        >
          Kaydı Başlat
        </button>
        <button
          onClick={stopRecording}
          disabled={!isRecording || isUploading}
          className="px-4 py-2 bg-red-700 text-white rounded disabled:opacity-50 hover:cursor-pointer"
        >
          Kaydı Durdur
        </button>
      </div>
      <div className="text-lg font-medium">Durum: {status}</div>
      {isUploading && (
        <div className="mt-4 text-blue-600">Dosya yükleniyor...</div>
      )}
    </div>
  );
}

export default App;
