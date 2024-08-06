import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container,
  Button,
  Typography,
  CircularProgress,
  Box,
  Paper,
} from '@mui/material';

const FactsUploadPage = () => {
  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadError('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('audio', file);
    formData.append('directory', 'facts_orel');

    setLoading(true);
    try {
      await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setGeneratedLink(`${window.location.origin}/random-facts`);
      setUploadError('');
    } catch (error) {
      setUploadError(`Upload failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Upload Facts for Orel
      </Typography>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <input type="file" onChange={handleFileChange} accept="audio/*" aria-label="Select an audio file to upload" />
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
      {generatedLink && (
        <Box sx={{ marginTop: 2 }}>
          <Typography>
            Generated Link: <Link to="/random-facts">Click here to listen to random facts</Link>
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default FactsUploadPage;
