import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);
  const [directory, setDirectory] = useState('');
  const [newDirectory, setNewDirectory] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await axios.get('/files');
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(`Error fetching files: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDirectoryChange = (e) => {
    setDirectory(e.target.value);
  };

  const handleNewDirectoryChange = (e) => {
    setNewDirectory(e.target.value);
  };

  const handleCreateDirectory = async () => {
    if (!newDirectory) {
      setError('Please enter a directory name');
      return;
    }

    try {
      await axios.post('/create-directory', { directoryName: newDirectory });
      setNewDirectory('');
      setError('');
      fetchFiles();
    } catch (error) {
      console.error('Error creating directory:', error);
      setError(`Failed to create directory: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    if (directory) {
      formData.append('directory', directory);
    }

    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAudioUrl(response.data.audioUrl);
      setError('');
      fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      setError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`/delete/${filename}`);
      fetchFiles();
    } catch (error) {
      console.error('Delete error:', error);
      setError(`Delete failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="container">
      <h2>Upload Audio</h2>
      <div>
        <input type="file" onChange={handleFileChange} aria-label="Select an audio file to upload" />
        <select value={directory} onChange={handleDirectoryChange} aria-label="Select a directory">
          <option value="">Root directory</option>
          {/* Add options for existing directories */}
        </select>
        <button onClick={handleUpload} aria-label="Upload the selected audio file">Upload</button>
      </div>
      <div>
        <input
          type="text"
          value={newDirectory}
          onChange={handleNewDirectoryChange}
          placeholder="New directory name"
          aria-label="Enter new directory name"
        />
        <button onClick={handleCreateDirectory} aria-label="Create new directory">Create Directory</button>
      </div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {audioUrl && (
        <div>
          <p>Audio URL: <Link to={`/play/${encodeURIComponent(audioUrl.split('/').pop())}`}>{audioUrl}</Link></p>
          <audio controls src={audioUrl} aria-label="Audio player for the uploaded file" />
        </div>
      )}
      <h2>Uploaded Files</h2>
      <ul>
        {files.map((file, index) => {
          const filename = file.split('/').pop();
          return (
            <li key={index}>
              <Link to={`/play/${encodeURIComponent(filename)}`} aria-label={`Play the audio file ${file}`}>{file}</Link>
              <button onClick={() => handleDelete(filename)} aria-label={`Delete the audio file ${file}`}>Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UploadPage;