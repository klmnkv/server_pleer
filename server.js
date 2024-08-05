require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
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

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = req.body.directory || '';
    const targetDir = path.join(uploadDir, directory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const originalExtension = path.extname(file.originalname);
    cb(null, Date.now() + originalExtension);
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const directory = req.body.directory || '';
  const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${directory ? directory + '/' : ''}${req.file.filename}`;
  res.json({ audioUrl });
});

app.post('/create-directory', async (req, res) => {
  const { directoryName } = req.body;
  if (!directoryName) {
    return res.status(400).send({ error: 'Directory name is required' });
  }
  const newDirPath = path.join(uploadDir, directoryName);
  try {
    await fs.promises.mkdir(newDirPath, { recursive: true });
    res.status(201).send({ message: 'Directory created successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to create directory' });
  }
});

app.delete('/delete-directory/:directoryName', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);
  try {
    await fs.promises.rmdir(dirPath, { recursive: true });
    res.send({ message: 'Directory deleted successfully' });
  } catch (error) {
    res.status(500).send({ error: 'Failed to delete directory' });
  }
});

app.get('/directories', async (req, res) => {
  try {
    const entries = await fs.promises.readdir(uploadDir, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    res.send(directories);
  } catch (error) {
    res.status(500).send({ error: 'Unable to retrieve directories' });
  }
});

app.get('/directories/:directoryName/files', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const files = entries.filter(entry => entry.isFile()).map(entry => `${directoryName}/${entry.name}`);
    res.send(files);
  } catch (error) {
    if (error.code === 'ENOENT') {
      res.status(404).send({ error: 'Directory not found' });
    } else {
      res.status(500).send({ error: 'Unable to retrieve files' });
    }
  }
});

app.get('/files', async (req, res) => {
  try {
    const files = await getAllFiles(uploadDir);
    const fileUrls = files.map(file => `${req.protocol}://${req.get('host')}/${file}`);
    res.send(fileUrls);
  } catch (error) {
    res.status(500).send({ error: 'Unable to retrieve files' });
  }
});

async function getAllFiles(dir) {
  try {
    const stats = await fs.promises.stat(dir);
    if (!stats.isDirectory()) {
      return [];
    }
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getAllFiles(fullPath);
      } else {
        const relativePath = path.relative(uploadDir, fullPath);
        return relativePath;
      }
    }));
    return files.flat();
  } catch (error) {
    return [];
  }
}

app.delete('/delete/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  try {
    await fs.promises.unlink(filePath);
    res.send({ message: 'File deleted successfully' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).send({ error: 'File not found' });
    }
    res.status(500).send({ error: 'Unable to delete file' });
  }
});

app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
    if (err) {
      return res.status(404).send('File not found or not readable');
    }
    res.sendFile(filePath);
  });
});

app.use('/uploads', express.static(uploadDir));
app.use(express.static(path.join(__dirname, 'client/build'), { maxAge: '1d' }));

app.get('/play/:filename', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.get('/random-facts', async (req, res) => {
  try {
    const files = await getAllFiles(uploadDir);
    const mp3Files = files.filter(file => file.endsWith('.mp3'));
    const randomFiles = mp3Files.sort(() => 0.5 - Math.random()).slice(0, 5).map(file => `${req.protocol}://${req.get('host')}/uploads/${file}`);
    res.send(randomFiles);
  } catch (error) {
    res.status(500).send({ error: 'Unable to retrieve files' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port} in ${nodeEnv} mode`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('HTTP server closed');
  });
});
