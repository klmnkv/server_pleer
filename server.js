const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const port = 3000;

app.use(cors());

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

  const audioUrl = `https://server-pleer.onrender.com:${port}/uploads/${req.file.filename}`;
  res.send({ audioUrl });
});

app.get('/files', (req, res) => {
  fs.readdir(uploadDir, (err, files) => {
    if (err) {
      return res.status(500).send({ error: 'Unable to retrieve files' });
    }

    const fileUrls = files.map(file => `https://server-pleer.onrender.com:${port}/uploads/${file}`);
    res.send(fileUrls);
  });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

app.listen(port, () => {
  console.log(`Server running at http://https://server-pleer.onrender.com:${port}/`);
});
