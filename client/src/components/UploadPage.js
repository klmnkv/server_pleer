import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  Container,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  CircularProgress,
  Box,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MoveIcon from '@mui/icons-material/DriveFileMove';

const UploadPage = () => {
  // ... (предыдущие состояния)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [moveTargetDirectory, setMoveTargetDirectory] = useState('');

  // ... (предыдущие функции)

  const handleMoveDialogOpen = (file) => {
    setSelectedFile(file);
    setMoveDialogOpen(true);
  };

  const handleMoveDialogClose = () => {
    setMoveDialogOpen(false);
    setSelectedFile(null);
    setMoveTargetDirectory('');
  };

  const handleMoveFile = async () => {
    if (!selectedFile || moveTargetDirectory === undefined) {
      setFileError('Please select a file and target directory');
      return;
    }

    try {
      const response = await axios.post('/move-file', {
        filename: selectedFile,
        targetDirectory: moveTargetDirectory
      });
      console.log('File moved:', response.data);
      fetchFiles(selectedDirectory);
      setFileError('');
      handleMoveDialogClose();
    } catch (error) {
      console.error('Error moving file:', error);
      setFileError(`Failed to move file: ${error.response?.data?.error || error.message}`);
    }
  };

  return (
    <Container maxWidth="md">
      {/* ... (предыдущий JSX) */}
      <Typography variant="h5" gutterBottom>
        Uploaded Files (Current directory: {selectedDirectory || 'Root'})
      </Typography>
      {fileError && <Typography color="error">{fileError}</Typography>}
      <List>
        {files.length > 0 ? (
          files.map((file, index) => (
            <ListItem key={index} divider>
              <ListItemText
                primary={<Link to={`/play/${encodeURIComponent(file.split('/').pop())}`} aria-label={`Play the audio file ${file}`}>{file}</Link>}
              />
              <IconButton onClick={() => handleMoveDialogOpen(file)} aria-label={`Move the audio file ${file}`}>
                <MoveIcon />
              </IconButton>
              <IconButton onClick={() => handleDelete(file.split('/').pop())} aria-label={`Delete the audio file ${file}`} edge="end">
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))
        ) : (
          <Typography>No files in this directory</Typography>
        )}
      </List>

      <Dialog open={moveDialogOpen} onClose={handleMoveDialogClose}>
        <DialogTitle>Move File</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            Moving file: {selectedFile}
          </Typography>
          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel>Target Directory</InputLabel>
            <Select
              value={moveTargetDirectory}
              onChange={(e) => setMoveTargetDirectory(e.target.value)}
              label="Target Directory"
            >
              <MenuItem value="">
                <em>Root directory</em>
              </MenuItem>
              {directories.map((dir, index) => (
                <MenuItem key={index} value={dir}>{dir}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleMoveDialogClose}>Cancel</Button>
          <Button onClick={handleMoveFile} variant="contained" color="primary">
            Move
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default UploadPage;