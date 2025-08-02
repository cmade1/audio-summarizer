import { useRef, useState, useEffect } from "react";
import { jsPDF } from "jspdf";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // Seçilen dosya
  const [recordedAudio, setRecordedAudio] = useState(null); // Kaydedilen ses dosyası
  const [transcript, setTranscript] = useState(""); // Transkript sonucu için state
  const [summary, setSummary] = useState(""); // Özet sonucu için state
  const [isProcessing, setIsProcessing] = useState(false); // İşlem durumu
  const [recordingTime, setRecordingTime] = useState(0); // Kayıt süresi
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

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

  // Ses dosyasını backend'e gönder ve işlemleri yap
  const processAudioFile = async (audioFile) => {
    setIsProcessing(true);
    setStatus("Uploading audio file...");
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
        throw new Error("Upload error");
      }

      const result = await response.json();
      setStatus(`Audio file uploaded: ${result.filename}`);

      // --- BURADA TRANSKRİPSİYON İSTEĞİ ---
      setStatus("Starting transcription...");
      const transcribeRes = await fetch(
        "http://localhost:3001/api/transcribe",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: result.filename }),
        }
      );

      if (!transcribeRes.ok) {
        throw new Error("Transcription error");
      }

      const transcribeData = await transcribeRes.json();
      setTranscript(transcribeData.transcript);
      setStatus("Transcription completed!");

      // --- BURADA ÖZETLEME İSTEĞİ ---
      setStatus("Starting summarization...");
      const summarizeRes = await fetch("http://localhost:3001/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcribeData.transcript }),
      });

      if (!summarizeRes.ok) {
        throw new Error("Summarization error");
      }

      const summarizeData = await summarizeRes.json();
      setSummary(summarizeData.summary);
      setStatus("Process completed!");

      // İşlem tamamlandıktan sonra ses dosyalarını temizle
      setSelectedFile(null);
      setRecordedAudio(null);
    } catch (error) {
      console.error("Upload/transcription/summarization error:", error);
      setStatus("Error occurred during processing");
    } finally {
      setIsProcessing(false);
    }
  };

  // Kaydı başlat
  const startRecording = async () => {
    setStatus("Accessing microphone...");
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
        setStatus("Recording started");
      };

      mediaRecorder.onstop = () => {
        setIsRecording(false);
        setStatus("Recording stopped");
        // Kayıt bitince tüm ses parçalarını birleştir
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        console.log("Recorded audio Blob:", audioBlob);

        // Kaydedilen ses dosyasını sakla
        setRecordedAudio(audioBlob);
        setStatus("Recording completed. Click 'Extract Summary' to process.");
      };

      mediaRecorder.start();
    } catch (err) {
      setStatus("Microphone access denied or error occurred");
      console.error(err);
    }
  };

  // Kaydı durdur
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setStatus("Stopping recording...");
    }
  };

  const downloadTranscriptAsPDF = () => {
    const doc = new jsPDF();

    // Türkçe karakterler için uygun font ayarları
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    // Başlık - Türkçe karakterleri düzelt
    const title = "Transcript"
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

    doc.save("transcript.pdf");
  };

  const downloadSummaryAsPDF = () => {
    const doc = new jsPDF();

    // Türkçe karakterler için uygun font ayarları
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);

    // Başlık - Türkçe karakterleri düzelt
    const title = "Toplanti Ozeti"
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

    doc.save("summary.pdf");
  };

  return (
    <div className="min-h-screen min-w-screen flex flex-col items-center justify-center bg-light-dark p-4">
      {/* Başlık - Daha büyük ve yukarıda */}
      <div className="mb-12 mt-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white text-center">
          Audio Summarizer
        </h1>
        <p className="text-gray-300 text-center mt-2 text-lg">
          Transform your audio into intelligent summaries
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
            Start Recording
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
            Stop Recording
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

      {/* Kaydedilen Ses Dosyası için Özet Çıkar Butonu */}
      {/* {recordedAudio && (
        <div className="mb-4 text-white flex flex-col items-center justify-center">
          <p className="text-lg mb-2">Kayıt tamamlandı!</p>
          <button
            onClick={() => processAudioFile(recordedAudio)}
            disabled={isProcessing}
            className="px-4 py-2 bg-purple-600 text-white font-bold rounded disabled:opacity-50 hover:cursor-pointer hover:bg-purple-700"
          >
            Özet Çıkar
          </button>
        </div>
      )} */}

      {/* Dosya Yükleme - Daha sade tasarım */}
      <div className="mb-8 mt-4">
        <input
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
          <span className="text-lg">Upload Audio File</span>
        </label>
      </div>

      {/* Seçilen Dosya Bilgisi */}
      {selectedFile && (
        <div className="mb-6 text-white flex flex-col items-center justify-center">
          <div className="bg-gray-800 bg-opacity-50 rounded-lg px-6 py-4 backdrop-blur-sm border border-gray-700">
            <p className="text-lg font-medium">
              Selected file: {selectedFile.name}
            </p>
            <button
              onClick={() => processAudioFile(selectedFile)}
              disabled={isProcessing}
              className="mt-3 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Extract Summary
            </button>
          </div>
        </div>
      )}

      {/* Kaydedilen Ses Dosyası için Özet Çıkar Butonu */}
      {recordedAudio && (
        <div className="mb-6 text-white flex flex-col items-center justify-center">
          <div className="bg-gray-800 bg-opacity-50 rounded-lg px-6 py-4 backdrop-blur-sm border border-gray-700">
            <p className="text-lg font-medium mb-2">Recording completed!</p>
            <button
              onClick={() => processAudioFile(recordedAudio)}
              disabled={isProcessing}
              className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Extract Summary
            </button>
          </div>
        </div>
      )}

      {/* Durum Mesajı - Daha az dikkat çekici */}
      <div className="text-sm text-gray-400 font-medium mb-6 text-center">
        Status: {status}
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 mt-4 text-white">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-600"></div>
          <span>Processing...</span>
        </div>
      )}

      {/* Sonuçlar - Yan Yana Kutular */}
      {(transcript || summary) && (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full max-w-6xl">
          {/* Transkript Kutusu */}
          {transcript && (
            <div className="w-full lg:flex-1 bg-white rounded-lg shadow-lg p-6">
              <h2 className="font-bold text-lg mb-4 text-gray-800">
                Transcript
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
                <span>Download PDF</span>
              </button>
            </div>
          )}

          {/* Özet Kutusu */}
          {summary && (
            <div className="w-full lg:flex-1 bg-white rounded-lg shadow-lg p-6">
              <h2 className="font-bold text-lg mb-4 text-gray-800">Summary</h2>
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
                <span>Download PDF</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
