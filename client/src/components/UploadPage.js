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
  LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [dirError, setDirError] = useState('');
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [newDirectory, setNewDirectory] = useState('');

  const fetchFiles = useCallback(async (directory) => {
    console.log('Fetching files for directory:', directory);
    try {
      const response = await axios.get(directory ? `/directories/${directory}/files` : '/files');
      console.log('Fetched files:', response.data);
      setFileList(response.data);
      setFileError('');
    } catch (error) {
      console.error('Error fetching files:', error);
      setFileError(`Error fetching files: ${error.response?.data?.error || error.message}`);
      setFileList([]);
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
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
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
    if (files.length === 0) {
      setUploadError('Please select at least one file');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('audio', file));
    formData.append('directory', selectedDirectory || '');

    console.log('Uploading files:', files.map(f => f.name));
    console.log('Selected directory:', selectedDirectory);

    setLoading(true);
    setUploadProgress(0);
    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
      console.log('Upload response:', response.data);
      setUploadedFiles(response.data.uploadedFiles);
      setUploadError('');
      setFiles([]);  // Clear the file selection after successful upload
      await fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [files, selectedDirectory, fetchFiles]);

  const handleDelete = useCallback(async (fileUrl) => {
    try {
      await axios.delete(`/delete/${encodeURIComponent(fileUrl)}`);
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
            multiple
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

      {/* Display selected files */}
      {files.length > 0 && (
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Typography variant="h6">Selected Files ({files.length}):</Typography>
          <List>
            {files.map((file, index) => (
              <ListItem key={index}>
                <ListItemText primary={file.name} secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`} />
                <IconButton onClick={() => handleRemoveFile(index)} edge="end">
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Display upload progress */}
      {loading && (
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Typography variant="body1">Upload Progress: {uploadProgress}%</Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Display uploaded files */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Typography variant="h6">Uploaded Files:</Typography>
          <List>
            {uploadedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={<Link to={file.audioUrl}>{file.originalName}</Link>}
                  secondary={`https://bred-audio.ru${file.audioUrl}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="h5" gutterBottom>
        Directories
      </Typography>
      <List>
        <ListItem button onClick={() => handleDirectoryChange('')}>
          <ListItemText primary="Root directory" />
        </ListItem>
        {directories.map((dir, index) => (
          <ListItem button key={index} onClick={() => handleDirectoryChange(dir)}>
            <ListItemText primary={dir} />
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
        {fileList.length > 0 ? (
          fileList.map((file, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={<Link to={file.url}>{file.name}</Link>}
                secondary={
                  <>
                    {!selectedDirectory && file.directory !== 'Root' && `Directory: ${file.directory}`}
                    <br />
                    {`https://bred-audio.ru${file.url}`}
                  </>
                }
              />
              <IconButton onClick={() => handleDelete(file.url)} edge="end">
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