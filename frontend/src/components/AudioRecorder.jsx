import { formatTime } from "../utils/formatTime";

function AudioRecorder({
  isRecording,
  isProcessing,
  recordingTime,
  startRecording,
  stopRecording,
}) {
  return (
    <>
      <div className="flex gap-8 mb-8 items-center">
        <div className="flex flex-col items-center">
          {!isRecording ? (
            <>
              <button
                onClick={startRecording}
                disabled={isProcessing}
                className="w-20 h-20 bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed hover:cursor-pointer rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-12 h-12 text-white ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>
              <span className="text-white text-md mt-2 font-medium">
                Kaydı Başlat
              </span>
            </>
          ) : (
            <>
              <button
                onClick={stopRecording}
                disabled={isProcessing}
                className="w-20 h-20 bg-red-600 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed hover:cursor-pointer rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-10 h-10 text-white"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M6 6h12v12H6z" />
                </svg>
              </button>
              <span className="text-white text-md mt-2 font-medium">
                Kaydı Bitir
              </span>
            </>
          )}
        </div>
      </div>

      {isRecording && (
        <>
          <div className="mb-8 text-center">
            <div className="text-3xl font-bold text-white bg-black bg-opacity-30 px-6 py-3 rounded-full">
              {formatTime(recordingTime)}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AudioRecorder;
