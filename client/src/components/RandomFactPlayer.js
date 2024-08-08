import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AudioPlayer from './AudioPlayer';

const RandomFactPlayer = () => {
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState(null);

  const fetchRandomAudio = useCallback(async () => {
    try {
      const response = await axios.get('/api/audio-info/orel_facts');
      setAudioUrl(response.data.audioUrl);
      setError(null);
    } catch (error) {
      console.error('Error fetching audio:', error);
      setError('Failed to load audio. Please try again.');
    }
  }, []);

  useEffect(() => {
    fetchRandomAudio();
  }, [fetchRandomAudio]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Случайный факт об орлах</h2>
      <AudioPlayer audioUrl={audioUrl} />
      <button onClick={fetchRandomAudio}>Следующий факт</button>
    </div>
  );
};

export default RandomFactPlayer;