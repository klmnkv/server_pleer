import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';
import { Container, Typography } from '@mui/material';

const PlayerPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { filename } = useParams();

  let audioUrl;
  if (filename) {
    audioUrl = `/uploads/${filename}`;
  } else {
    audioUrl = decodeURIComponent(params.get('url'));
  }

  console.log('Decoded Audio URL:', audioUrl);

  if (!audioUrl) {
    return <p>No audio URL provided</p>;
  }

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Audio Player
      </Typography>
      <AudioPlayer audioUrl={audioUrl} />
    </Container>
  );
};

export default PlayerPage;
