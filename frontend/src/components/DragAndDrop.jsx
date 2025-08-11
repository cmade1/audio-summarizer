import React, { useState } from "react";
import { useRef } from "react";


function DragAndDrop( {fileInputRef , selectedFile , setSelectedFile , setRecordedAudio , setTranscript , setSummary , processAudioFile , isProcessing , setStatus }) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);

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
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const uploadFiles = async () => {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));
  
    const res = await fetch(`${apiUrl}/api/process-audio`, {
      method: "POST",
      body: formData,
    });
  
    if (res.ok) {
      alert("Upload successful!");
    } else {
      alert("Upload failed.");
    }
  };

  return (
    <>
    {/* <div
     onDrop={handleDrop}
     onDragOver={handleDragOver}
     onDragEnter={handleDragEnter}
     onDragLeave={handleDragLeave}
     style={{
     border: "2px dashed #ccc",
     padding: "20px",
     textAlign: "center",
     borderRadius: "10px",
     backgroundColor: isDragging ? "#f0f8ff" : "#fff",
     }}></div> */}
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 p-4 text-center rounded-lg"
    >
      <p className="text-gray-500">Drag and drop files here</p>
      <ul>
        {files.map((file, index) => (
          <li key={index}>{file.name}</li>
        ))}
      </ul>
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
            className="inline-flex items-center justify-center px-8 py-4 bg-indigo-600 text-white font-semibold rounded-lg cursor-pointer hover:bg-indigo-700 hover:cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg mt-4"
            >
              <button onClick={uploadFiles}>Upload Files</button>
            </label>
        </div>
        {selectedFile && (
                <></>
            )}
    </div>
    </>
  );
}

export default DragAndDrop;