const multer = require('multer');
const path = require('path');


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      // Benzersiz dosya adı oluştur
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
    }
});
  
const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
      // Sadece ses dosyalarını kabul et
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Sadece ses dosyaları kabul edilir!'), false);
      }
    }
});

module.exports = {
    upload
};