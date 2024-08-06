import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Container, Typography } from '@mui/material';
import AudioPlayer from './AudioPlayer';

const RandomFactsPage = () => {
  const [fact, setFact] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFact = async () => {
      try {
        const response = await axios.get('/random-fact');
        setFact(response.data);
        setError('');
      } catch (error) {
        setError(`Error fetching fact: ${error.response?.data?.error || error.message}`);
      }
    };

    fetchFact();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Random Fact
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      {fact && (
        <Box sx={{ marginBottom: 2 }}>
          <AudioPlayer audioUrl={fact} />
        </Box>
      )}
    </Container>
  );
};

export default RandomFactsPage;
