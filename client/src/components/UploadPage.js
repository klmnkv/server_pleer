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
  const [uploadError, setUploadError] = useState('');
  const [dirError, setDirError] = useState('');
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [newDirectory, setNewDirectory] = useState('');

  useEffect(() => {
    fetchDirectories();
    fetchFiles('');
  }, []);

  useEffect(() => {
    fetchFiles(selectedDirectory);
  }, [selectedDirectory]);

  const fetchFiles = async (directory) => {
    try {
      const response = await axios.get(directory ? `/directories/${directory}/files` : '/files');
      setFiles(response.data);
      setFileError('');
    } catch (error) {
      setFileError(`Error fetching files: ${error.response?.data?.error || error.message}`);
      setFiles([]);
    }
  };

  const fetchDirectories = async () => {
    try {
      const response = await axios.get('/directories');
      setDirectories(response.data);
    } catch (error) {
      console.error('Error fetching directories:', error);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleDirectoryChange = (value) => {
    setSelectedDirectory(value);
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
      setDirError(`Failed to create directory: ${error.response?.data?.error || error.message}`);
    }
  };

  const handleDeleteDirectory = async (directoryName) => {
    try {
      await axios.delete(`/delete-directory/${directoryName}`);
      fetchDirectories();
      if (selectedDirectory === directoryName) {
        setSelectedDirectory('');
        fetchFiles('');
      }
    } catch (error) {
      console.error('Error deleting directory:', error);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('directory', selectedDirectory || '');

    setLoading(true);
    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setAudioUrl(response.data.audioUrl);
      setUploadError('');
      fetchFiles(selectedDirectory);
    } catch (error) {
      setUploadError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename) => {
    try {
      await axios.delete(`/delete/${filename}`);
      fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Upload Audio
      </Typography>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <input type="file" onChange={handleFileChange} accept="audio/*" aria-label="Select an audio file to upload" />
          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel>Select Directory</InputLabel>
            <Select
              value={selectedDirectory}
              onChange={(e) => handleDirectoryChange(e.target.value)}
              aria-label="Select a directory"
            >
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
          <audio
            controls
            src={audioUrl}
            onError={(e) => {
              console.error('Error loading audio:', e);
              console.error('Error details:', e.target.error);
            }}
            onLoadedData={() => console.log('Audio loaded successfully')}
          >
            Your browser does not support the audio element.
          </audio>
        </Box>
      )}
      <Typography variant="h5" gutterBottom>
        Directories
      </Typography>
      <List>
        <ListItem button divider onClick={() => handleDirectoryChange('')}>
          <ListItemText primary="Root directory" />
        </ListItem>
        {directories.map((dir, index) => (
          <ListItem button key={index} divider onClick={() => handleDirectoryChange(dir)}>
            <ListItemText primary={dir} />
            <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteDirectory(dir); }} aria-label={`Delete directory ${dir}`} edge="end">
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Typography variant="h5" gutterBottom>
        Uploaded Files (Current directory: {selectedDirectory || 'Root'})
      </Typography>
      {fileError && <Typography color="error">{fileError}</Typography>}
      <List>
        {files.length > 0 ? (
          files.map((file, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={<Link to={`/play/${encodeURIComponent(file.split('/').pop())}`} aria-label={`Play the audio file ${file}`}>{file}</Link>}
              />
              <IconButton onClick={() => handleDelete(file.split('/').pop())} aria-label={`Delete the audio file ${file}`} edge="end">
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))
        ) : (
          <Typography>No files in this directory</Typography>
        )}
      </List>
      <Box sx={{ marginTop: 4 }}>
        <Button variant="contained" color="secondary" component={Link} to="/random-facts">
          Show Random Facts
        </Button>
      </Box>
    </Container>
  );
};

export default UploadPage;
