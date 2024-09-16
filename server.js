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

// Map to store original file names
const originalFileNames = new Map();

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

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    originalFileNames.set(file.filename, originalName);

    const audioUrl = `/play/${file.filename}`;
    console.log(`File uploaded: ${audioUrl}`);
    return { filename: file.filename, originalName, audioUrl };
  });

  res.json({ uploadedFiles });
});

// Updated route for getting files in a specific directory
app.get('/directories/:directoryName/files', async (req, res) => {
  const { directoryName } = req.params;
  const dirPath = path.join(uploadDir, directoryName);

  console.log(`Fetching files for directory: ${dirPath}`);

  try {
    const files = await getAllFiles(dirPath);
    const fileInfos = files.map(file => {
      const fileName = path.basename(file);
      return {
        name: originalFileNames.get(fileName) || fileName,
        url: `/play/${fileName}`
      };
    });
    console.log(`Files found in ${directoryName}:`, fileInfos);
    res.send(fileInfos);
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

// Updated route for getting all files
app.get('/files', async (req, res) => {
  try {
    const files = await getAllFiles(uploadDir);
    const fileInfos = files.map(file => {
      const fileName = path.basename(file);
      const directory = path.dirname(file);
      return {
        name: originalFileNames.get(fileName) || fileName,
        url: `/play/${fileName}`,
        directory: directory === '.' ? 'Root' : directory
      };
    });
    console.log(`Files retrieved: ${fileInfos.length}`);
    res.send(fileInfos);
  } catch (error) {
    console.error('Error reading upload directory:', error);
    res.status(500).send({ error: 'Unable to retrieve files' });
  }
});

// Updated route for deleting a file
app.delete('/delete/:filename(*)', async (req, res) => {
  let filename = req.params.filename;
  console.log(`Attempting to delete file: ${filename}`);

  // Extract filename from full URL if present
  const urlParts = filename.split('/');
  filename = urlParts[urlParts.length - 1];

  try {
    const files = await getAllFiles(uploadDir);
    const filePath = files.find(file => path.basename(file) === filename);

    if (!filePath) {
      console.log('File not found');
      return res.status(404).send({ error: 'File not found' });
    }

    const fullPath = path.join(uploadDir, filePath);
    console.log('Full path to delete:', fullPath);

    await fsPromises.unlink(fullPath);
    // Remove original file name from Map
    originalFileNames.delete(filename);
    console.log(`File deleted successfully: ${filename}`);
    res.send({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send({ error: 'Unable to delete file' });
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

// New route for serving audio files
app.get('/play/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  // Проверяем, существует ли файл
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('File not found');
  }
});

// For serving the React app (assuming it's built and placed in the 'client/build' directory)
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch-all route to return the React app for any unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
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