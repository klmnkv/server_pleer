require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const util = require('util');
const busboy = require('connect-busboy');

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
app.use(busboy());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Request headers:', req.headers);
  next();
});

console.log('Current directory:', __dirname);
console.log('Contents of client directory:', fs.readdirSync(path.join(__dirname, 'client')));
console.log('Contents of client/build directory:', fs.readdirSync(path.join(__dirname, 'client/build')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

app.post('/upload', (req, res) => {
  console.log('Upload request received');
  console.log('Request headers:', req.headers);

  let fileUploadedSuccessfully = false;

  req.pipe(req.busboy);

  req.busboy.on('field', (fieldname, val) => {
    if (fieldname === 'directory') {
      console.log('Directory from form:', val);
      req.directory = val;
    }
  });

  req.busboy.on('file', (fieldname, file, fileInfo) => {
    console.log('Uploading file:', fileInfo.filename);

    const directory = req.directory || '';
    console.log('Target directory:', directory);

    const targetDir = path.join(uploadDir, directory);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = Date.now() + path.extname(fileInfo.filename);
    const saveTo = path.join(targetDir, filename);
    console.log('Saving file to:', saveTo);

    const writeStream = fs.createWriteStream(saveTo);

    file.pipe(writeStream);

    writeStream.on('finish', () => {
      fileUploadedSuccessfully = true;
      const audioUrl = `${req.protocol}://${req.get('host')}/uploads/${directory ? directory + '/' : ''}${filename}`;
      console.log(`File uploaded: ${audioUrl}`);
      res.json({ audioUrl });
    });
  });

  req.busboy.on('finish', () => {
    if (!fileUploadedSuccessfully) {
      console.log('No file was uploaded');
      res.status(400).json({ error: 'No file was uploaded' });
    }
  });
});

// ... (остальной код сервера)

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${port} in ${nodeEnv} mode`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});