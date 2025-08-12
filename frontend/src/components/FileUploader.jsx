function FileUploader ({fileInputRef , selectedFile , isProcessing , setSelectedFile , setRecordedAudio , setTranscript , setSummary , setStatus , processAudioFile}) {
    return (
        <>
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
            </>
        )
}

export default FileUploader;