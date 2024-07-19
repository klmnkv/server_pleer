const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Настройка CORS для вашего фронтенда
const corsOptions = {
  origin: 'https://bred-stikers.netlify.app',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Обработка предварительных запросов

// Убедитесь, что директория uploads существует
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ error: 'No file uploaded' });
  }
  const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.send({ audioUrl });
});

app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading upload directory:', err);
      return res.status(500).send({ error: 'Unable to retrieve files' });
    }
    const fileUrls = files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file}`);
    res.send(fileUrls);
  });
});

app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send({ error: 'Unable to delete file' });
    }
    res.send({ message: 'File deleted successfully' });
  });
});

// Промежуточное ПО для обработки прямых ссылок на аудиофайлы
app.use('/uploads', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    res.redirect(`/?url=${encodeURIComponent(`${req.protocol}://${req.get('host')}${req.originalUrl}`)}`);
  } else {
    next();
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Обслуживание статических файлов из папки build
app.use(express.static(path.join(__dirname, 'build')));

// Обслуживание index.html для всех маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});