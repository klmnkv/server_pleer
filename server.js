require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;
const cors = require('cors');
const util = require('util');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Logging setup
const logFile = fs.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
const logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
};
console.error = console.log;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  next();
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = req.body.directory || '';
    const targetDir = path.join(uploadDir, directory);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const originalExtension = path.extname(file.originalname);
    cb(null, `${timestamp}${originalExtension}`);
  }
});

const upload = multer({ storage: storage });

// Route for uploading audio files
app.post('/upload', upload.single('audio'), (req, res) => {
  console.log('File upload started');
  console.log('Upload request body:', req.body);
  console.log('Selected directory from request:', req.body.directory);

  if (!req.file) {
    console.log('No file received');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const directory = req.body.directory || '';
  const targetDir = path.join(uploadDir, directory);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log('File received:', req.file);
  console.log('File path:', req.file.path);
  console.log('File size:', req.file.size);

  const audioUrl = `/play/${req.file.filename}`;
  console.log(`File uploaded: ${audioUrl}`);
  res.json({ audioUrl, filename: req.file.filename, originalName: req.file.originalname });
});

// ... (остальные маршруты остаются без изменений)

// Обновленный маршрут для воспроизведения аудио
app.get('/play/:filename', (req, res) => {
  const { filename } = req.params;
  console.log('Audio file requested:', filename);

  const filePath = path.join(uploadDir, filename);
  console.log('Full file path:', filePath);

  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filename);
    return res.status(404).send('File not found');
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Error sending file');
    } else {
      console.log('File sent successfully');
    }
  });
});

// Удалите или закомментируйте этот маршрут, так как теперь используется /play
// app.use('/uploads', express.static(uploadDir));

// Маршрут для отдачи статических файлов React-приложения
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch-all маршрут для React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port} in ${nodeEnv} mode`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});