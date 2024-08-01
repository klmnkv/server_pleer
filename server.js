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
app.use(express.urlencoded({ extended: true }));
app.use(cors());

console.log('Current directory:', __dirname);
console.log('Contents of client directory:', fsSync.readdirSync(path.join(__dirname, 'client')));
console.log('Contents of client/build directory:', fsSync.readdirSync(path.join(__dirname, 'client/build')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = req.body.directory || '';
    const targetDir = path.join(uploadDir, directory);
    fsSync.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

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

  const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${directory ? directory + '/' : ''}${req.file.filename}`;
  console.log(`File uploaded: ${audioUrl}`);
  res.send({ audioUrl });
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

app.post('/move-file', async (req, res) => {
  const { filename, sourceDirectory, targetDirectory } = req.body;

  // Извлекаем только имя файла из полного пути
  const actualFilename = path.basename(filename);

  const sourcePath = path.join(uploadDir, sourceDirectory || '', actualFilename);
  const targetPath = path.join(uploadDir, targetDirectory || '', actualFilename);

  console.log(`Moving file from ${sourcePath} to ${targetPath}`);

  try {
    // Проверяем, существует ли исходный файл
    await fs.access(sourcePath);

    // Создаем целевую директорию, если она не существует
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Перемещаем файл
    await fs.rename(sourcePath, targetPath);

    console.log('File moved successfully');
    res.send({ message: 'File moved successfully' });
  } catch (error) {
    console.error('Error moving file:', error);
    if (error.code === 'ENOENT') {
      res.status(404).send({ error: 'Source file not found' });
    } else {
      res.status(500).send({ error: 'Failed to move file' });
    }
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

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'client/build'), { maxAge: '1d' }));

app.get('/play/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

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