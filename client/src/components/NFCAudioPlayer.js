import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Container, Typography, Button, Box, CircularProgress } from '@mui/material';

const NFCAudioPlayer = () => {
  const [audioInfo, setAudioInfo] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const { directoryName } = useParams();
  const audioRef = useRef(null);

  const fetchAndPlayAudio = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`/api/audio-info/${directoryName}`);
      setAudioInfo(response.data);
      if (audioRef.current) {
        audioRef.current.src = response.data.audioUrl;
        audioRef.current.play().catch(e => console.error('Error playing audio:', e));
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error fetching audio:', error);
      setError('Failed to load audio. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndPlayAudio();
  }, [directoryName]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.error('Error playing audio:', e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrack = () => {
    fetchAndPlayAudio();
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Случайный факт
        </Typography>
        {error ? (
          <Typography color="error" gutterBottom>{error}</Typography>
        ) : (
          <>
            <audio ref={audioRef} src={audioInfo?.audioUrl} />
            <Typography variant="subtitle1" gutterBottom>
              Сейчас играет: {audioInfo?.fileName}
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handlePlayPause}
                sx={{ mr: 2 }}
              >
                {isPlaying ? 'Пауза' : 'Воспроизвести'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={handleNextTrack}
              >
                Следующий факт
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
};

export default NFCAudioPlayer;