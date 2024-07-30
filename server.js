require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const cors = require('cors');
const util = require('util');

const app = express();
const port = process.env.PORT || 3000;
const nodeEnv = process.env.NODE_ENV || 'development';

// Logging setup
const logFile = fsSync.createWriteStream(path.join(__dirname, 'server.log'), { flags: 'a' });
const logStdout = process.stdout;

console.log = function () {
  logFile.write(util.format.apply(null, arguments) + '\n');
  logStdout.write(util.format.apply(null, arguments) + '\n');
};
console.error = console.log;

// Middleware
app.use(express.json());
app.use(cors());

console.log('Current directory:', __dirname);
console.log('Contents of client directory:', fsSync.readdirSync(path.join(__dirname, 'client')));
console.log('Contents of client/build directory:', fsSync.readdirSync(path.join(__dirname, 'client/build')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Сначала сохраняем во временную директорию
    const tempDir = path.join(__dirname, 'temp');
    if (!fsSync.existsSync(tempDir)) {
      fsSync.mkdirSync(tempDir, { recursive: true });
    }
    console.log('Multer destination (temp):', tempDir);
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log('Multer filename:', filename);
    cb(null, filename);
  }
});

const tempDir = path.join(__dirname, 'temp');
if (!fsSync.existsSync(tempDir)) {
  fsSync.mkdirSync(tempDir);
}

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm', 'audio/aac'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.log('Rejected file:', file.originalname, 'Mimetype:', file.mimetype);
      cb(null, false);
    }
  }
});

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.url === '/upload') {
    console.log('Request headers:', req.headers);
    console.log('Request body:', req.body);
  }
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

app.delete('/delete-directory/:directoryName', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);

  try {
    await fs.rmdir(dirPath, { recursive: true });
    console.log(`Directory deleted: ${dirPath}`);
    res.send({ message: 'Directory deleted successfully' });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(500).send({ error: 'Failed to delete directory' });
  }
});

app.get('/directories', async (req, res) => {
  try {
    const entries = await fs.readdir(uploadDir, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    res.send(directories);
  } catch (error) {
    console.error('Error reading directories:', error);
    res.status(500).send({ error: 'Unable to retrieve directories' });
  }
});

app.get('/directories/:directoryName/files', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const files = entries.filter(entry => entry.isFile()).map(entry => path.join(directoryName, entry.name));
    res.send(files);
  } catch (error) {
    console.error('Error reading files in directory:', error);
    res.status(500).send({ error: 'Unable to retrieve files' });
  }
});

app.post('/upload', upload.single('audio'), (req, res) => {
  console.log('Upload request received');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);

  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).send({ error: 'No file uploaded' });
  }

  const { directory } = req.body;
  console.log('Directory from request:', directory);

  let audioUrl;
  let targetDir;

  if (directory) {
    targetDir = path.join(uploadDir, directory);
    console.log('Target directory:', targetDir);
    if (!fsSync.existsSync(targetDir)) {
      console.log('Creating directory:', targetDir);
      fsSync.mkdirSync(targetDir, { recursive: true });
    }
    audioUrl = `${req.protocol}://${req.get('host')}/uploads/${directory}/${req.file.filename}`;
  } else {
    targetDir = uploadDir;
    audioUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  console.log('Original file path:', req.file.path);
  console.log('Target file path:', path.join(targetDir, req.file.filename));

  // Перемещаем файл в нужную директорию, если это необходимо
  if (req.file.path !== path.join(targetDir, req.file.filename)) {
    try {
      fsSync.renameSync(req.file.path, path.join(targetDir, req.file.filename));
      console.log('File moved to:', path.join(targetDir, req.file.filename));
    } catch (error) {
      console.error('Error moving file:', error);
      return res.status(500).send({ error: 'Failed to move uploaded file' });
    }
  }

  console.log(`File uploaded: ${audioUrl}`);
  res.send({ audioUrl });
});
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

app.delete('/delete/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  try {
    await fs.unlink(filePath);
    console.log(`File deleted: ${filename}`);
    res.send({ message: 'File deleted successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).send({ error: 'File not found' });
    }
    console.error('Error deleting file:', error);
    res.status(500).send({ error: 'Unable to delete file' });
  }
});

app.use('/uploads', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const redirectUrl = `/play/${encodeURIComponent(path.basename(req.url))}`;
    console.log(`Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  } else {
    next();
  }
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'client/build'), { maxAge: '1d' }));

app.get('/play/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).send({ error: `Multer error: ${err.message}` });
  }
  res.status(500).send({ error: 'Something went wrong!', message: err.message });
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
