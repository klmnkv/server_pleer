import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import AudioPlayer from './AudioPlayer';

const OrelFactsPage = () => {
  const [audioUrl, setAudioUrl] = useState('');
  const [error, setError] = useState(null);

  const fetchRandomFact = useCallback(async () => {
    try {
      const response = await axios.get('/api/random-orel-fact');
      setAudioUrl(response.data.audioUrl);
      setError(null);
    } catch (error) {
      console.error('Error fetching random fact:', error);
      setError('Failed to load audio. Please try again.');
    }
  }, []);

  useEffect(() => {
    fetchRandomFact();
  }, [fetchRandomFact]);

  const handleNextFact = () => {
    fetchRandomFact();
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
      <div className={"player-page"}>
  <div className="orel-facts-page">
      {audioUrl && <AudioPlayer audioUrl={audioUrl} />}
    </div>
    </div>
  );
};

export default OrelFactsPage;