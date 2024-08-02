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

    // Выводим содержимое FormData
    for (let [key, value] of formData.entries()) {
      console.log(key, value);
    }

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

  // ... (остальной JSX компонента)

  return (
    <Container maxWidth="md">
      {/* ... (JSX компонента) */}
    </Container>
  );
};

export default UploadPage;