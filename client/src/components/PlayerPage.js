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
    // Если filename передан как параметр пути, используем его напрямую
    audioUrl = decodeURIComponent(filename);

    // Если filename не начинается с '/', добавляем '/uploads/'
    if (!audioUrl.startsWith('/')) {
      audioUrl = `/uploads/${audioUrl}`;
    }
  } else {
    // Если filename отсутствует, пытаемся получить URL из параметров запроса
    audioUrl = params.get('url');
  }

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