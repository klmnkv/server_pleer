import React, { useState, useEffect, useCallback } from 'react';
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

  const fetchFiles = useCallback(async (directory) => {
    console.log('Fetching files for directory:', directory);
    try {
      const response = await axios.get(directory ? `/directories/${directory}/files` : '/files');
      console.log('Fetched files:', response.data);
      setFiles(response.data);
      setFileError('');
    } catch (error) {
      console.error('Error fetching files:', error);
      setFileError(`Error fetching files: ${error.response?.data?.error || error.message}`);
      setFiles([]);
    }
  }, []);

  const fetchDirectories = useCallback(async () => {
    try {
      const response = await axios.get('/directories');
      console.log('Fetched directories:', response.data);
      setDirectories(response.data);
    } catch (error) {
      console.error('Error fetching directories:', error);
    }
  }, []);

  useEffect(() => {
    const initFetch = async () => {
      await fetchDirectories();
      await fetchFiles('');
    };
    initFetch();
  }, [fetchDirectories, fetchFiles]);

  useEffect(() => {
    console.log('Selected directory changed:', selectedDirectory);
    fetchFiles(selectedDirectory);
  }, [selectedDirectory, fetchFiles]);

  const handleFileChange = useCallback((e) => {
    setFile(e.target.files[0]);
  }, []);

  const handleDirectoryChange = useCallback((value) => {
    console.log('Directory changed to:', value);
    setSelectedDirectory(value);
  }, []);

  const handleNewDirectoryChange = useCallback((e) => {
    setNewDirectory(e.target.value);
  }, []);

  const handleCreateDirectory = useCallback(async () => {
    if (!newDirectory) {
      setDirError('Please enter a directory name');
      return;
    }

    try {
      await axios.post('/create-directory', { directoryName: newDirectory });
      setNewDirectory('');
      setDirError('');
      await fetchDirectories();
    } catch (error) {
      console.error('Error creating directory:', error);
      setDirError(`Failed to create directory: ${error.response?.data?.error || error.message}`);
    }
  }, [newDirectory, fetchDirectories]);

  const handleDeleteDirectory = useCallback(async (directoryName) => {
    try {
      await axios.delete(`/delete-directory/${directoryName}`);
      await fetchDirectories();
      if (selectedDirectory === directoryName) {
        setSelectedDirectory('');
        await fetchFiles('');
      }
    } catch (error) {
      console.error('Error deleting directory:', error);
    }
  }, [fetchDirectories, fetchFiles, selectedDirectory]);

  const handleUpload = useCallback(async () => {
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('directory', selectedDirectory || '');

    console.log('Uploading file:', file.name);
    console.log('Selected directory:', selectedDirectory);

    setLoading(true);
    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('Upload response:', response.data);
      setAudioUrl(response.data.audioUrl);
      setUploadError('');
      await fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [file, selectedDirectory, fetchFiles]);

  const handleDelete = useCallback(async (filename) => {
    try {
      await axios.delete(`/delete/${filename}`);
      await fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [fetchFiles, selectedDirectory]);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Upload Audio
      </Typography>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <input
            type="file"
            onChange={handleFileChange}
            accept="audio/*"
            id="audio-file-input"
          />
          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel id="directory-select-label">Select Directory</InputLabel>
            <Select
              labelId="directory-select-label"
              value={selectedDirectory}
              onChange={(e) => handleDirectoryChange(e.target.value)}
              label="Select Directory"
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
            label="New Directory Name"
            sx={{ marginBottom: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateDirectory}
          >
            Create Directory
          </Button>
        </Box>
      </Paper>
      {dirError && <Typography color="error">{dirError}</Typography>}
      {audioUrl && (
        <Box sx={{ marginBottom: 2 }}>
          <Typography>Audio URL: <Link to={`/play/${encodeURIComponent(audioUrl.split('/').pop())}`}>{audioUrl}</Link></Typography>
          <audio controls src={audioUrl} />
        </Box>
      )}
      <Typography variant="h5" gutterBottom>
        Directories
      </Typography>
      <List>
        <ListItem button onClick={() => handleDirectoryChange('')}>
          <ListItemText primary="Root directory" />
          <Button component={Link} to="/play/root" variant="outlined" size="small">
            Play Random
          </Button>
        </ListItem>
        {directories.map((dir, index) => (
          <ListItem key={index} button onClick={() => handleDirectoryChange(dir)}>
            <ListItemText primary={dir} />
            <Button component={Link} to={`/play/${dir}`} variant="outlined" size="small">
              Play Random
            </Button>
            <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteDirectory(dir); }} edge="end">
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
            <ListItem key={index}>
              <ListItemText
                primary={<Link to={`/play/${encodeURIComponent(file)}`}>{file}</Link>}
              />
              <IconButton onClick={() => handleDelete(file)} edge="end">
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))
        ) : (
          <Typography>No files in this directory</Typography>
        )}
      </List>
    </Container>
  );
};

export default UploadPage;