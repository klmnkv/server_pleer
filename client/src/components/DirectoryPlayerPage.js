import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import AudioPlayer from './AudioPlayer';
import { Container, Typography, Button, Box } from '@mui/material';

const DirectoryPlayerPage = () => {
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { directory } = useParams();

  const fetchRandomAudio = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/random-audio/${directory}`);
      setAudioUrl(response.data.audioUrl);
      setError('');
    } catch (error) {
      console.error('Error fetching random audio:', error);
      setError('Failed to load random audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRandomAudio();
  }, [directory]);

  if (loading) {
    return <Typography>Loading random audio...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>Random Audio Player</Typography>
      <Typography variant="subtitle1" gutterBottom>
        Playing random audio from directory: {directory}
      </Typography>
      <AudioPlayer audioUrl={audioUrl} />
      <Button
        variant="contained"
        color="primary"
        onClick={fetchRandomAudio}
        sx={{ mt: 2 }}
      >
        Play Another Random Track
      </Button>
    </Container>
  );
};

export default DirectoryPlayerPage;