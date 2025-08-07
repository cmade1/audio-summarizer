import { useRef, useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import { formatTime } from "./utils/formatTime";
import { downloadTranscriptAsPDF, downloadSummaryAsPDF } from "./utils/pdfHelpers";
import StatusMessage from "./components/StatusMessage"
import ProcessingSpinner from "./components/ProcessingSpinner"

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

 
  const processAudioFile = async (audioFile) => {
    setIsProcessing(true);
    setStatus("Ses dosyası yükleniyor ve işleniyor...");
    setTranscript("");
    setSummary("");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile, "recording.webm");

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

  // Kaydı başlat
  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined") {
      setStatus("Bu tarayıcıda ses kaydı desteklenmiyor. Lütfen farklı bir tarayıcı veya cihaz kullanın.");
      return;
    }
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

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-light-dark p-4">
      {/* Başlık */}
      <div className="mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center">
          Ses Özetleyici
        </h1>
        <p className="text-gray-300 text-center mt-2 text-lg">
          
        </p>
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

      <StatusMessage status={status}/>

      {isProcessing && <ProcessingSpinner />}
      
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
