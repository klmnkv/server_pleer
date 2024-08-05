import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Box, Container, Typography } from '@mui/material';
import AudioPlayer from './AudioPlayer';

const RandomFactsPage = () => {
  const [facts, setFacts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFacts = async () => {
      try {
        const response = await axios.get('/random-facts');
        setFacts(response.data);
        setError('');
      } catch (error) {
        setError(`Error fetching facts: ${error.response?.data?.error || error.message}`);
      }
    };

    fetchFacts();
  }, []);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Random Facts
      </Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Box>
        {facts.map((fact, index) => (
          <Box key={index} sx={{ marginBottom: 2 }}>
            <AudioPlayer audioUrl={fact} />
          </Box>
        ))}
      </Box>
    </Container>
  );
};

export default RandomFactsPage;
