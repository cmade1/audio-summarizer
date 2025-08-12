function TranscriptBox ({transcript , downloadTranscriptAsPDF}) {
    return (
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
    )
}

export default TranscriptBox;