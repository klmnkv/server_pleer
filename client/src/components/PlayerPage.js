import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';
import './AudioPlayer.css';

const PlayerPage = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const { filename } = useParams();

  let audioUrl;
  if (filename) {
    audioUrl = `/uploads/${decodeURIComponent(filename)}`;
  } else {
    audioUrl = decodeURIComponent(params.get('url'));
  }

  console.log('Decoded Audio URL:', audioUrl);

  if (!audioUrl) {
    return <p>No audio URL provided</p>;
  }

  return (
    <div className="player-page">
      <div className="player-container">
        <AudioPlayer audioUrl={audioUrl} />
      </div>
    </div>
  );
};

export default PlayerPage;