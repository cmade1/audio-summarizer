import { useState , useRef } from "react";


function DragAndDrop( { setSelectedFile , setRecordedAudio , setTranscript , setSummary ,  isProcessing , setStatus }) {

  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isProcessing) {
      setStatus("İşlem devam ediyor, lütfen bekleyin.");
      return;
    }

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("audio/")) {
      setStatus("Lütfen bir ses dosyası bırakın.");
      return;
    }

    setSelectedFile(file);
    setRecordedAudio(null);
    setTranscript("");
    setSummary("");
    setStatus("Ses dosyası bırakıldı, işleniyor...");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  return (
    
    <div
      ref={dropRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-full max-w-lg h-32 flex items-center justify-center border-2 border-dashed rounded-lg transition-all duration-200 mb-6 ${
        isDragging ? "border-indigo-500 bg-indigo-950/40" : "border-gray-400 bg-gray-800/40"
      }`}
      style={{ cursor: isProcessing ? "not-allowed" : "default" }}
    >
      {isProcessing
        ? "İşlem devam ediyor..."
        : "Ses dosyanızı buraya sürükleyip bırakın"}
    </div>
    
    
  );
}

export default DragAndDrop;