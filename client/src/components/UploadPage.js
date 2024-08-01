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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  ListItemButton,
  ListItemIcon,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MoveIcon from '@mui/icons-material/DriveFileMove';

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
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetDirectory, setTargetDirectory] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  useEffect(() => {
    fetchDirectories();
    fetchFiles('');
  }, []);

  useEffect(() => {
    console.log('Selected directory changed:', selectedDirectory);
    fetchFiles(selectedDirectory);
  }, [selectedDirectory]);

  const fetchFiles = async (directory) => {
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
  };

  const fetchDirectories = async () => {
    try {
      const response = await axios.get('/directories');
      console.log('Fetched directories:', response.data);
      setDirectories(response.data);
    } catch (error) {
      console.error('Error fetching directories:', error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDirectoryChange = (value) => {
    console.log('Directory changed to:', value);
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
      console.error('Error creating directory:', error);
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
      fetchFiles(selectedDirectory);
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
      fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleFileSelect = (fileUrl) => {
    setSelectedFiles(prev =>
      prev.includes(fileUrl)
        ? prev.filter(f => f !== fileUrl)
        : [...prev, fileUrl]
    );
  };

  const handleMoveFiles = async () => {
    if (selectedFiles.length === 0 || !targetDirectory) {
      console.error('No files selected or target directory not chosen');
      return;
    }

    try {
      for (const fileUrl of selectedFiles) {
        const filename = fileUrl.split('/').pop();
        const sourceDirectory = fileUrl.split('/').slice(-2, -1)[0];
        await axios.post('/move-file', {
          filename,
          sourceDirectory: sourceDirectory === 'uploads' ? '' : sourceDirectory,
          targetDirectory,
        });
      }
      console.log('Files moved successfully');
      fetchFiles(selectedDirectory);
      setMoveDialogOpen(false);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Error moving files:', error);
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
          <audio controls src={audioUrl} aria-label="Audio player for the uploaded file" />
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
          files.map((fileUrl, index) => {
            const filename = fileUrl.split('/').pop();
            return (
              <ListItem
                key={index}
                secondaryAction={
                  <IconButton onClick={() => handleDelete(filename)} edge="end" aria-label={`Delete ${filename}`}>
                    <DeleteIcon />
                  </IconButton>
                }
                disablePadding
              >
                <ListItemButton role={undefined} onClick={() => handleFileSelect(fileUrl)} dense>
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={selectedFiles.includes(fileUrl)}
                      tabIndex={-1}
                      disableRipple
                      inputProps={{ 'aria-labelledby': `checkbox-list-label-${index}` }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    id={`checkbox-list-label-${index}`}
                    primary={<Link to={`/play/${encodeURIComponent(filename)}`}>{filename}</Link>}
                  />
                </ListItemButton>
              </ListItem>
            );
          })
        ) : (
          <Typography>No files in this directory</Typography>
        )}
      </List>

      <Button
        variant="contained"
        color="primary"
        onClick={() => setMoveDialogOpen(true)}
        disabled={selectedFiles.length === 0}
        startIcon={<MoveIcon />}
        sx={{ marginTop: 2 }}
      >
        Move Selected Files
      </Button>

      <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)}>
        <DialogTitle>Move Files</DialogTitle>
        <DialogContent>
          <Typography>
            Selected files: {selectedFiles.map(f => f.split('/').pop()).join(', ')}
          </Typography>
          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel>Select Target Directory</InputLabel>
            <Select
              value={targetDirectory}
              onChange={(e) => setTargetDirectory(e.target.value)}
              aria-label="Select target directory"
            >
              <MenuItem value="">
                <em>Root directory</em>
              </MenuItem>
              {directories.map((dir, index) => (
                <MenuItem key={index} value={dir}>{dir}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMoveFiles}>Move</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UploadPage;