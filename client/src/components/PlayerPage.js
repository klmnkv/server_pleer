import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';

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
    <div className="container">
      <h2>Audio Player</h2>
      <AudioPlayer audioUrl={audioUrl} />
    </div>
  );
};

export default PlayerPage;