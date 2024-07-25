import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      console.error('Audio element not found');
      return;
    }

    const handlePlayPause = () => {
      setIsPlaying(!audioElement.paused);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Error loading audio file');
    };

    audioElement.addEventListener('play', handlePlayPause);
    audioElement.addEventListener('pause', handlePlayPause);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('play', handlePlayPause);
      audioElement.removeEventListener('pause', handlePlayPause);
      audioElement.removeEventListener('error', handleError);
    };
  }, [audioUrl]);

  const handlePlayPauseClick = () => {
    const audioElement = audioRef.current;
    if (audioElement.paused) {
      audioElement.play().catch(e => console.error('Error playing audio:', e));
    } else {
      audioElement.pause();
    }
  };

  const handleVolumeChange = (e) => {
    const audioElement = audioRef.current;
    audioElement.volume = e.target.value;
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div>
      <h2>Audio Player</h2>
      <audio ref={audioRef} src={audioUrl} />
      <div className="controls">
        <button onClick={handlePlayPauseClick} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <label>
          Volume:
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </label>
      </div>
    </div>
  );
};

AudioPlayer.propTypes = {
  audioUrl: PropTypes.string.isRequired,
};

export default AudioPlayer;
