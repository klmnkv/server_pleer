import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await axios.get('https://server-pleer.onrender.com/files');
        setFiles(response.data);
      } catch (error) {
        console.error('Error fetching files:', error);
        setError(`Error fetching files: ${error.response?.data?.error || error.message}`);
      }
    };

    fetchFiles();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await axios.post('https://server-pleer.onrender.com/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAudioUrl(response.data.audioUrl);
      setError('');
      setFiles([...files, response.data.audioUrl]);
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`https://server-pleer.onrender.com/delete/${filename}`);
      setFiles(files.filter(file => !file.includes(filename)));
    } catch (error) {
      console.error('Delete error:', error);
      setError(`Delete failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="container">
      <h2>Upload Audio</h2>
      <input type="file" onChange={handleFileChange} aria-label="Select an audio file to upload" />
      <button onClick={handleUpload} aria-label="Upload the selected audio file">Upload</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {audioUrl && (
        <div>
          <p>Audio URL: <Link to={`/play/uploads/${encodeURIComponent(audioUrl.split('/').pop())}`}>{audioUrl}</Link></p>
          <audio controls src={audioUrl} aria-label="Audio player for the uploaded file" />
        </div>
      )}
      <h2>Uploaded Files</h2>
      <ul>
        {files.map((file, index) => {
          const filename = file.split('/').pop();
          return (
            <li key={index}>
              <Link to={`/play/uploads/${encodeURIComponent(filename)}`} aria-label={`Play the audio file ${file}`}>{file}</Link>
              <button onClick={() => handleDelete(filename)} aria-label={`Delete the audio file ${file}`}>Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UploadPage;