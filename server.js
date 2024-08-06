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

// Ensure upload directory exists
fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const directory = req.body.directory || '';
    const targetDir = path.join(uploadDir, directory);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const originalExtension = path.extname(file.originalname);
    cb(null, Date.now() + originalExtension);
  }
});

const upload = multer({ storage: storage });

app.post('/upload', upload.single('audio'), (req, res) => {
  console.log('File upload started');
  console.log('Upload request body:', req.body);
  console.log('Selected directory from request:', req.body.directory);

  if (!req.file) {
    console.log('No file received');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('File received:', req.file);
  console.log('File path:', req.file.path);
  console.log('File size:', req.file.size);

  const directory = req.body.directory || '';
  const relativePath = path.relative(uploadDir, req.file.path);
  const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${relativePath}`;
  console.log(`File uploaded: ${audioUrl}`);
  res.json({ audioUrl });
});

app.post('/create-directory', async (req, res) => {
  const { directoryName } = req.body;
  if (!directoryName) {
    return res.status(400).send({ error: 'Directory name is required' });
  }

  const newDirPath = path.join(uploadDir, directoryName);

  try {
    await fsPromises.mkdir(newDirPath, { recursive: true });
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
    await fsPromises.rm(dirPath, { recursive: true, force: true });
    console.log(`Directory deleted: ${dirPath}`);
    res.send({ message: 'Directory deleted successfully' });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(500).send({ error: 'Failed to delete directory' });
  }
});

app.get('/directories', async (req, res) => {
  try {
    const entries = await fsPromises.readdir(uploadDir, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
    console.log('Fetched directories:', directories);
    res.send(directories);
  } catch (error) {
    console.error('Error reading directories:', error);
    res.status(500).send({ error: 'Unable to retrieve directories' });
  }
});

app.get('/directories/:directoryName/files', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);

  console.log(`Fetching files for directory: ${dirPath}`);

  try {
    const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
    console.log(`Entries in directory ${directoryName}:`, entries);
    const files = entries
      .filter(entry => entry.isFile())
      .map(entry => `${directoryName}/${entry.name}`);
    console.log(`Files found in ${directoryName}:`, files);
    res.send(files);
  } catch (error) {
    console.error('Error reading files in directory:', error);
    if (error.code === 'ENOENT') {
      console.log(`Directory not found: ${dirPath}`);
      res.status(404).send({ error: 'Directory not found' });
    } else {
      res.status(500).send({ error: 'Unable to retrieve files' });
    }
  }
});
app.get('/files', async (req, res) => {
  try {
    const files = await getAllFiles(uploadDir);
    const fileUrls = files.map(file => `${req.protocol}://${req.get('host')}/uploads/${file}`);
    console.log(`Files retrieved: ${fileUrls.length}`);
    console.log('Files:', fileUrls);
    res.send(fileUrls);
  } catch (error) {
    console.error('Error reading upload directory:', error);
    res.status(500).send({ error: 'Unable to retrieve files' });
  }
});


async function moveExistingFiles() {
  try {
    const files = await fsPromises.readdir(uploadDir);
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = await fsPromises.stat(filePath);
      if (stats.isFile()) {
        const directoryName = '1'; // или любая другая логика определения директории
        const targetDir = path.join(uploadDir, directoryName);
        await fsPromises.mkdir(targetDir, { recursive: true });
        const newPath = path.join(targetDir, file);
        await fsPromises.rename(filePath, newPath);
        console.log(`Moved file ${file} to ${newPath}`);
      }
    }
  } catch (error) {
    console.error('Error moving existing files:', error);
  }
}

async function getAllFiles(dir) {
  console.log(`Scanning directory: ${dir}`);
  try {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getAllFiles(fullPath);
      } else {
        const relativePath = path.relative(uploadDir, fullPath);
        console.log(`Found file: ${relativePath}`);
        return relativePath;
      }
    }));
    return files.flat();
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    return [];
  }
}


app.delete('/delete/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadDir, filename);
  try {
    await fsPromises.unlink(filePath);
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

app.get('/uploads/:filename', (req, res) => {
  const filePath = path.join(uploadDir, req.params.filename);
  console.log('Audio file requested:', filePath);

  fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK, (err) => {
    if (err) {
      console.error('Error accessing file:', err);
      return res.status(404).send('File not found or not readable');
    }
    console.log('File exists and is readable');
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      } else {
        console.log('File sent successfully');
      }
    });
  });
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