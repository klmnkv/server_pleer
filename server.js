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
    const originalExtension = path.extname(file.originalname);
    cb(null, Date.now() + originalExtension);
  }
});

// Configure multer for handling file uploads
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit per file
    files: 100 // Allow up to 100 files per upload
  }
});

// Updated route for uploading multiple audio files
app.post('/upload', upload.array('audio'), (req, res) => {
  console.log('Multiple file upload started');
  console.log('Upload request body:', req.body);
  console.log('Selected directory from request:', req.body.directory);

  if (!req.files || req.files.length === 0) {
    console.log('No files received');
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const directory = req.body.directory || '';
  const targetDir = path.join(uploadDir, directory);

  // Create directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const uploadedFiles = req.files.map(file => {
    const oldPath = file.path;
    const newPath = path.join(targetDir, file.filename);
    fs.renameSync(oldPath, newPath);

    console.log('File received:', file);
    console.log('File path:', newPath);
    console.log('File size:', file.size);

    const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${directory ? directory + '/' : ''}${file.filename}`;
    console.log(`File uploaded: ${audioUrl}`);
    return { filename: file.filename, audioUrl };
  });

  res.json({ uploadedFiles });
});

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size is too large. Max limit is 50MB per file.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Max limit is 100 files per upload.' });
    }
  }
  next(err);
});

// Function to get a random audio file from a directory
async function getRandomAudioFile(directory) {
  const dirPath = path.join(uploadDir, directory);
  try {
    const files = await fsPromises.readdir(dirPath);
    const audioFiles = files.filter(file => ['.mp3', '.wav', '.ogg'].includes(path.extname(file)));

    if (audioFiles.length === 0) {
      throw new Error('No audio files found in the specified directory');
    }

    return audioFiles[Math.floor(Math.random() * audioFiles.length)];
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
    throw error;
  }
}

// Route for creating a new directory
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

// Route for deleting a directory
app.delete('/delete-directory/:directoryName', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);

  try {
    await fsPromises.rmdir(dirPath, { recursive: true });
    console.log(`Directory deleted: ${dirPath}`);
    res.send({ message: 'Directory deleted successfully' });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(500).send({ error: 'Failed to delete directory' });
  }
});

// Route for getting all directories
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

// Route for getting files in a specific directory
app.get('/directories/:directoryName/files', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);

  console.log(`Fetching files for directory: ${dirPath}`);

  try {
    const files = await getAllFiles(dirPath);
    const fileNames = files.map(file => path.basename(file));
    console.log(`Files found in ${directoryName}:`, fileNames);
    res.send(fileNames);
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

// Route for getting all files
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

// Helper function to get all files recursively
async function getAllFiles(dir) {
  console.log(`Scanning directory: ${dir}`);
  try {
    const entries = await fsPromises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return getAllFiles(fullPath);
      } else {
        return path.relative(uploadDir, fullPath);
      }
    }));
    return files.flat();
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
    return [];
  }
}

// Route for deleting a file
app.delete('/delete/:filename(*)', async (req, res) => {
  let filename = req.params.filename;
  console.log(`Received delete request for: ${filename}`);

  // Извлекаем имя файла из полного URL
  const urlParts = filename.split('/');
  filename = urlParts[urlParts.length - 1];

  console.log(`Attempting to delete file: ${filename}`);

  try {
    const files = await getAllFiles(uploadDir);
    console.log('All files:', files);
    const filePath = files.find(file => path.basename(file) === filename);
    console.log(`File path found: ${filePath}`);

    if (!filePath) {
      console.log('File not found');
      return res.status(404).send({ error: 'File not found' });
    }

    const fullPath = path.join(uploadDir, filePath);
    console.log('Full path to delete:', fullPath);

    await fsPromises.unlink(fullPath);
    console.log(`File deleted successfully: ${filename}`);
    res.send({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send({ error: 'Unable to delete file' });
  }
});

// Route for serving audio files (used by the audio player)
app.get('/uploads/:filename', async (req, res) => {
  const { filename } = req.params;
  console.log('Audio file requested:', filename);

  try {
    const files = await getAllFiles(uploadDir);
    const filePath = files.find(file => path.basename(file) === filename);

    if (!filePath) {
      console.error('File not found:', filename);
      return res.status(404).send('File not found');
    }

    const fullPath = path.join(uploadDir, filePath);
    console.log('Full file path:', fullPath);

    res.sendFile(fullPath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).send('Error sending file');
      } else {
        console.log('File sent successfully');
      }
    });
  } catch (error) {
    console.error('Error accessing file:', error);
    res.status(500).send('Internal server error');
  }
});

// API for getting info about a random audio file from orel_facts directory
app.get('/api/random-orel-fact', async (req, res) => {
  try {
    const fileName = await getRandomAudioFile('orel_facts');
    const audioUrl = `/uploads/orel_facts/${fileName}`;
    res.json({ audioUrl, fileName });
  } catch (error) {
    console.error('Error getting random audio info:', error);
    res.status(404).json({ error: 'Audio not found' });
  }
});

// Route for serving static files (React build)
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