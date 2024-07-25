import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Box, Slider, Typography } from '@mui/material';
import './AudioPlayer.css';

const AudioPlayer = ({ audioUrl }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handlePlayPause = () => setIsPlaying(!audioElement.paused);
    const handleTimeUpdate = () => setCurrentTime(audioElement.currentTime);
    const handleDurationChange = () => setDuration(audioElement.duration);
    const handleEnded = () => setIsPlaying(false);
    const handleError = (e) => {
      console.error('Audio error:', e);
      setError('Error loading audio file');
    };

    audioElement.addEventListener('play', handlePlayPause);
    audioElement.addEventListener('pause', handlePlayPause);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('durationchange', handleDurationChange);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('play', handlePlayPause);
      audioElement.removeEventListener('pause', handlePlayPause);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('durationchange', handleDurationChange);
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

  const handleVolumeChange = (e, newValue) => {
    setVolume(newValue);
    audioRef.current.volume = newValue;
  };

  const handleSeek = (e, newValue) => {
    setCurrentTime(newValue);
    audioRef.current.currentTime = newValue;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (error) {
    return <div role="alert">Error: {error}</div>;
  }

  return (
    <Box className="audio-player" sx={{ p: 2, border: '1px solid grey', borderRadius: 2 }}>
      <audio ref={audioRef} src={audioUrl} />
      <Box className="controls" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handlePlayPauseClick}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "Pause" : "Play"}
        </Button>
        <Box className="time-control" sx={{ flexGrow: 1, mx: 2 }}>
          <Slider
            value={currentTime}
            min={0}
            max={duration}
            step={0.1}
            onChange={handleSeek}
            aria-label="Seek"
          />
          <Typography variant="body2" aria-live="polite">
            {formatTime(currentTime)} / {formatTime(duration)}
          </Typography>
        </Box>
        <Box className="volume-control" sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ mr: 1 }}>Volume:</Typography>
          <Slider
            value={volume}
            min={0}
            max={1}
            step={0.01}
            onChange={handleVolumeChange}
            aria-label="Volume"
          />
        </Box>
      </Box>
    </Box>
  );
};

AudioPlayer.propTypes = {
  audioUrl: PropTypes.string.isRequired,
};

export default AudioPlayer;
