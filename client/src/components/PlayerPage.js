import React from 'react';
import { useLocation } from 'react-router-dom';
import AudioPlayer from './AudioPlayer';
import './AudioPlayer.css';

const PlayerPage = () => {
  const location = useLocation();

  // Извлекаем URL аудио из пути
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