import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './AudioPlayer.css';

const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlayPause = () => setIsPlaying(!audioElement.paused);
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Error loading audio file');
    };

    audioElement.addEventListener('play', handlePlayPause);
    audioElement.addEventListener('pause', handlePlayPause);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('play', handlePlayPause);
      audioElement.removeEventListener('pause', handlePlayPause);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const handlePlayPauseClick = () => {
    const audioElement = audioRef.current;
    if (isPlaying) {
      audioElement.pause();
    } else {
      audioElement.play().catch(e => console.error('Error playing audio:', e));
    }
  };

  if (error) {
    return <div role="alert">Error: {error}</div>;
  }

  return (
    <div className="audio-player" role="region">
      <audio ref={audioRef} src={audioUrl} aria-hidden="true" />
      <div className="controls">
        <button
          className="play-pause-button"
          onClick={handlePlayPauseClick}
          aria-label={isPlaying ? "Пауза" : "Старт"}
          aria-pressed={isPlaying}
        >
          {isPlaying ? "Пауза" : "Старт"}
        </button>
      </div>
    </div>
  );
};

AudioPlayer.propTypes = {
  audioUrl: PropTypes.string.isRequired,
};

export default AudioPlayer;