import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Box,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const UploadPage = () => {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [dirError, setDirError] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [newDirectory, setNewDirectory] = useState('');

  useEffect(() => {
    fetchFiles();
    fetchDirectories();
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

  const fetchDirectories = async () => {
    try {
      const response = await axios.get('/directories');
      setDirectories(response.data);
    } catch (error) {
      console.error('Error fetching directories:', error);
      setError(`Error fetching directories: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDirectoryChange = (e) => {
    setSelectedDirectory(e.target.value);
  };

  const handleNewDirectoryChange = (e) => {
    setNewDirectory(e.target.value);
  };

  const handleCreateDirectory = async () => {
    if (!newDirectory) {
      setDirError('Please enter a directory name');
      return;
    }

    try {
      await axios.post('/create-directory', { directoryName: newDirectory });
      setNewDirectory('');
      setDirError('');
      fetchDirectories();
    } catch (error) {
      console.error('Error creating directory:', error);
      setDirError(`Failed to create directory: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteDirectory = async (directoryName) => {
    try {
      await axios.delete(`/delete-directory/${directoryName}`);
      fetchDirectories();
    } catch (error) {
      console.error('Error deleting directory:', error);
      setError(`Failed to delete directory: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    if (selectedDirectory) {
      formData.append('directory', selectedDirectory);
    }

    setLoading(true);
    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAudioUrl(response.data.audioUrl);
      setUploadError('');
      fetchFiles();
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
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
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Upload Audio
      </Typography>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <input type="file" onChange={handleFileChange} aria-label="Select an audio file to upload" />
          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel>Select Directory</InputLabel>
            <Select value={selectedDirectory} onChange={handleDirectoryChange} aria-label="Select a directory">
              <MenuItem value="">
                <em>Root directory</em>
              </MenuItem>
              {directories.map((dir, index) => (
                <MenuItem key={index} value={dir}>{dir}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            aria-label="Upload the selected audio file"
            disabled={loading}
            sx={{ marginTop: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Upload'}
          </Button>
        </Box>
      </Paper>
      {uploadError && <Typography color="error">{uploadError}</Typography>}
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <TextField
            fullWidth
            value={newDirectory}
            onChange={handleNewDirectoryChange}
            placeholder="New directory name"
            aria-label="Enter new directory name"
            sx={{ marginBottom: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateDirectory}
            aria-label="Create new directory"
          >
            Create Directory
          </Button>
        </Box>
      </Paper>
      {dirError && <Typography color="error">{dirError}</Typography>}
      {audioUrl && (
        <Box sx={{ marginBottom: 2 }}>
          <Typography>Audio URL: <Link to={`/play/${encodeURIComponent(audioUrl.split('/').pop())}`}>{audioUrl}</Link></Typography>
          <audio controls src={audioUrl} aria-label="Audio player for the uploaded file" />
        </Box>
      )}
      <Typography variant="h5" gutterBottom>
        Directories
      </Typography>
      <List>
        {directories.map((dir, index) => (
          <ListItem key={index} divider>
            <ListItemText primary={dir} />
            <IconButton onClick={() => handleDeleteDirectory(dir)} aria-label={`Delete directory ${dir}`} edge="end">
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Typography variant="h5" gutterBottom>
        Uploaded Files
      </Typography>
      <List>
        {files.map((file, index) => {
          const filename = file.split('/').pop();
          return (
            <ListItem key={index} divider>
              <ListItemText
                primary={<Link to={`/play/${encodeURIComponent(filename)}`} aria-label={`Play the audio file ${file}`}>{file}</Link>}
              />
              <IconButton onClick={() => handleDelete(filename)} aria-label={`Delete the audio file ${file}`} edge="end">
                <DeleteIcon />
              </IconButton>
            </ListItem>
          );
        })}
      </List>
    </Container>
  );
};

export default UploadPage;
