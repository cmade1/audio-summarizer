import { useRef, useState, useEffect } from "react";
import { formatTime } from "./utils/formatTime";
import { downloadTranscriptAsPDF, downloadSummaryAsPDF } from "./utils/pdfHelpers";
import StatusMessage from "./components/StatusMessage"
import ProcessingSpinner from "./components/ProcessingSpinner"
import AudioRecorder from "./components/AudioRecorder"
import FileUploader from "./components/FileUploader"
import TranscriptBox from "./components/TranscriptBox"
import SummaryBox from "./components/SummaryBox"    
import DragAndDrop from "./components/DragAndDrop"

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Hazır");
  const [selectedFile, setSelectedFile] = useState(null); // Seçilen dosya
  const [recordedAudio, setRecordedAudio] = useState(null); // Kaydedilen ses dosyası
  const [transcript, setTranscript] = useState(""); // Transkript sonucu için state
  const [summary, setSummary] = useState(""); // Özet sonucu için state
  const [isProcessing, setIsProcessing] = useState(false); // İşlem durumu
  const [recordingTime, setRecordingTime] = useState(0); // Kayıt süresi
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

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

  
  const startRecording = async () => {
    if (typeof MediaRecorder === "undefined") {
      setStatus("Bu tarayıcıda ses kaydı desteklenmiyor. Lütfen farklı bir tarayıcı veya cihaz kullanın.");
      return;
    }
    setStatus("Mikrofona erişiliyor...");
    try {
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
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

  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setStatus("Kayıt durduruluyor...");
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-light-dark p-4">
      
      <div className="mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center">
          Ses Özetleyici
        </h1>
        <p className="text-gray-300 text-center mt-2 text-lg">
          
        </p>
      </div>

      <AudioRecorder isRecording={isRecording} isProcessing={isProcessing} recordingTime={formatTime(recordingTime)} startRecording = {startRecording} stopRecording = {stopRecording} />
      

      {/* Dosya Yükleme */}
      
      <FileUploader 
        processAudioFile={processAudioFile} 
        fileInputRef={fileInputRef} 
        selectedFile={selectedFile} 
        isProcessing={isProcessing} 
        setSelectedFile={setSelectedFile}
        setRecordedAudio={setRecordedAudio} 
        setTranscript={setTranscript} 
        setSummary={setSummary} 
        setStatus={setStatus} 
      />

      <DragAndDrop 
        isProcessing={isProcessing} 
        setStatus={setStatus} 
        processAudioFile={processAudioFile} 
        fileInputRef={fileInputRef} 
        selectedFile={selectedFile} 
        setSelectedFile={setSelectedFile} 
        setRecordedAudio={setRecordedAudio} 
        setTranscript={setTranscript} 
        setSummary={setSummary} 
      />


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

      {/* <DragNdrop onFilesSelected={setSelectedFile}  /> */}


      {/* Sonuç kutuları */}
      {(transcript || summary) && (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full max-w-6xl">
          {/* Transkript Kutusu */}
          {transcript && (
            <TranscriptBox transcript={transcript} downloadTranscriptAsPDF={downloadTranscriptAsPDF} />
          )}

          {/* Özet Kutusu */}
          {summary && (
            <SummaryBox summary={summary} downloadSummaryAsPDF={downloadSummaryAsPDF} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
