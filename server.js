const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

console.log('Current directory:', __dirname);
console.log('Contents of client directory:', fs.readdirSync('./client'));
console.log('Contents of client/build directory:', fs.readdirSync('./client/build'));

// Middleware для обработки JSON
app.use(express.json());

// Логирование всех запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});


app.post('/create-directory', async (req, res) => {
  const { directoryName } = req.body;
  if (!directoryName) {
    return res.status(400).send({ error: 'Directory name is required' });
  }

  const newDirPath = path.join(uploadDir, directoryName);

  try {
    await fs.mkdir(newDirPath, { recursive: true });
    console.log(`Directory created: ${newDirPath}`);
    res.status(201).send({ message: 'Directory created successfully' });
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).send({ error: 'Failed to create directory' });
  }
});

// Обновите маршрут загрузки файла, чтобы учитывать директории
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).send({ error: 'No file uploaded' });
  }

  const { directory } = req.body;
  let audioUrl;

  if (directory) {
    const dirPath = path.join(uploadDir, directory);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    audioUrl = `${req.protocol}://${req.get('host')}/uploads/${directory}/${req.file.filename}`;
  } else {
    audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  console.log(`File uploaded: ${audioUrl}`);
  res.send({ audioUrl });
});

// Обновите маршрут получения файлов, чтобы включать директории
app.get('/files', async (req, res) => {
  try {
    const files = await getAllFiles(uploadDir);
    const fileUrls = files.map(file => `${req.protocol}://${req.get('host')}/${file}`);
    console.log(`Files retrieved: ${fileUrls.length}`);
    res.send(fileUrls);
  } catch (error) {
    console.error('Error reading upload directory:', error);
    res.status(500).send({ error: 'Unable to retrieve files' });
  }
});

// Вспомогательная функция для рекурсивного получения всех файлов
async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return getAllFiles(fullPath);
    } else {
      return fullPath.replace(uploadDir, 'uploads');
    }
  }));
  return files.flat();
}

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

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'));
    }
  }
});

// API маршруты
app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).send({ error: 'No file uploaded' });
  }
  const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  console.log(`File uploaded: ${audioUrl}`);
  res.send({ audioUrl });
});

app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      console.error('Error reading upload directory:', err);
      return res.status(500).send({ error: 'Unable to retrieve files' });
    }
    const fileUrls = files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file}`);
    console.log(`Files retrieved: ${fileUrls.length}`);
    res.send(fileUrls);
  });
});

app.delete('/delete/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send({ error: 'File not found' });
  }
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send({ error: 'Unable to delete file' });
    }
    console.log(`File deleted: ${filename}`);
    res.send({ message: 'File deleted successfully' });
  });
});

// Промежуточное ПО для обработки прямых ссылок на аудиофайлы
app.use('/uploads', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const redirectUrl = `/play/${encodeURIComponent(path.basename(req.url))}`;
    console.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } else {
    next();
  }
});

// Обслуживание статических файлов из папки uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Обслуживание статических файлов из папки client/build
app.use(express.static(path.join(__dirname, 'client/build')));

// Маршрут для проигрывателя
app.get('/play/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Обслуживание index.html для всех остальных маршрутов
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Обработка ошибок multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).send({ error: err.message });
  }
  next(err);
});

// Общая обработка ошибок
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running at port ${port}`);
});