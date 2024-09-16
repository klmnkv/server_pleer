import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';
import './AudioPlayer.css';

const PlayerPage = () => {
  const location = useLocation();
  const { filename } = useParams();

  // URL аудио теперь формируется напрямую из пути
  const audioUrl = location.pathname;

  console.log('Audio URL:', audioUrl);

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