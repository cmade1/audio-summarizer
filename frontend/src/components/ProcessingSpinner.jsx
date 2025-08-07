function ProcessingSpinner () {
    return (
        <div className="flex items-center gap-2 mt-4 text-white">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-600"></div>
          <span>İşleniyor...</span>
        </div>
      );

};

export default ProcessingSpinner;