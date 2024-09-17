import React, { useState, useEffect, useCallback } from 'react';
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
  LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const UploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [dirError, setDirError] = useState('');
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileList, setFileList] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState('');
  const [newDirectory, setNewDirectory] = useState('');

  const fetchFiles = useCallback(async (directory) => {
    console.log('Получение файлов для директории:', directory);
    try {
      const response = await axios.get(directory ? `/directories/${directory}/files` : '/files');
      console.log('Полученные файлы:', response.data);
      setFileList(response.data);
      setFileError('');
    } catch (error) {
      console.error('Ошибка при получении файлов:', error);
      setFileError(`Ошибка при получении файлов: ${error.response?.data?.error || error.message}`);
      setFileList([]);
    }
  }, []);

  const fetchDirectories = useCallback(async () => {
    try {
      const response = await axios.get('/directories');
      console.log('Полученные директории:', response.data);
      setDirectories(response.data);
    } catch (error) {
      console.error('Ошибка при получении директорий:', error);
    }
  }, []);

  useEffect(() => {
    const initFetch = async () => {
      await fetchDirectories();
      await fetchFiles('');
    };
    initFetch();
  }, [fetchDirectories, fetchFiles]);

  useEffect(() => {
    console.log('Выбранная директория изменена:', selectedDirectory);
    fetchFiles(selectedDirectory);
  }, [selectedDirectory, fetchFiles]);

  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  }, []);

  const handleRemoveFile = useCallback((index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  }, []);

  const handleDirectoryChange = useCallback((value) => {
    console.log('Директория изменена на:', value);
    setSelectedDirectory(value);
  }, []);

  const handleNewDirectoryChange = useCallback((e) => {
    setNewDirectory(e.target.value);
  }, []);

  const handleCreateDirectory = useCallback(async () => {
    if (!newDirectory) {
      setDirError('Пожалуйста, введите имя директории');
      return;
    }

    try {
      await axios.post('/create-directory', { directoryName: newDirectory });
      setNewDirectory('');
      setDirError('');
      await fetchDirectories();
    } catch (error) {
      console.error('Ошибка при создании директории:', error);
      setDirError(`Не удалось создать директорию: ${error.response?.data?.error || error.message}`);
    }
  }, [newDirectory, fetchDirectories]);

  const handleDeleteDirectory = useCallback(async (directoryName) => {
    try {
      await axios.delete(`/delete-directory/${directoryName}`);
      await fetchDirectories();
      if (selectedDirectory === directoryName) {
        setSelectedDirectory('');
        await fetchFiles('');
      }
    } catch (error) {
      console.error('Ошибка при удалении директории:', error);
    }
  }, [fetchDirectories, fetchFiles, selectedDirectory]);

  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setUploadError('Пожалуйста, выберите хотя бы один файл');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('audio', file));
    formData.append('directory', selectedDirectory || '');

    console.log('Загрузка файлов:', files.map(f => f.name));
    console.log('Выбранная директория:', selectedDirectory);

    setLoading(true);
    setUploadProgress(0);
    try {
      const response = await axios.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        },
      });
      console.log('Ответ загрузки:', response.data);
      // Изменяем загруженные файлы, чтобы использовать только имя файла и путь
      const modifiedUploadedFiles = response.data.uploadedFiles.map(file => {
        const urlParts = file.audioUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const directory = urlParts[urlParts.length - 2] || '';
        return {
          ...file,
          filename: filename,
          directory: directory,
          relativePath: `${directory}/${filename}`
        };
      });
      setUploadedFiles(modifiedUploadedFiles);
      setUploadError('');
      setFiles([]);  // Очищаем выбор файлов после успешной загрузки
      await fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      setUploadError(`Загрузка не удалась: ${error.response?.data?.error || error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  }, [files, selectedDirectory, fetchFiles]);

  const handleDelete = useCallback(async (filename) => {
    try {
      console.log(`Попытка удаления файла: ${filename}`);
      await axios.delete(`/delete/${encodeURIComponent(filename)}`);
      console.log(`Запрос на удаление отправлен для файла: ${filename}`);
      await fetchFiles(selectedDirectory);
    } catch (error) {
      console.error('Ошибка удаления:', error);
      // Добавьте здесь обработку ошибок, например, показ уведомления пользователю
    }
  }, [fetchFiles, selectedDirectory]);

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom>
        Загрузка аудио
      </Typography>
      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <input
            type="file"
            onChange={handleFileChange}
            accept="audio/*"
            id="audio-file-input"
            multiple
          />
          <FormControl fullWidth sx={{ marginTop: 2 }}>
            <InputLabel id="directory-select-label">Выберите директорию</InputLabel>
            <Select
              labelId="directory-select-label"
              value={selectedDirectory}
              onChange={(e) => handleDirectoryChange(e.target.value)}
              label="Выберите директорию"
            >
              <MenuItem value="">
                <em>Корневая директория</em>
              </MenuItem>
              {directories.map((dir, index) => (
                <MenuItem key={index} value={dir}>{dir}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={loading}
            sx={{ marginTop: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Загрузить'}
          </Button>
        </Box>
      </Paper>
      {uploadError && <Typography color="error">{uploadError}</Typography>}

      <Paper elevation={3} sx={{ padding: 2, marginBottom: 2 }}>
        <Box component="form" noValidate autoComplete="off">
          <TextField
            fullWidth
            value={newDirectory}
            onChange={handleNewDirectoryChange}
            placeholder="Имя новой директории"
            label="Имя новой директории"
            sx={{ marginBottom: 2 }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreateDirectory}
          >
            Создать директорию
          </Button>
        </Box>
      </Paper>
      {dirError && <Typography color="error">{dirError}</Typography>}

      {/* Отображение выбранных файлов */}
      {files.length > 0 && (
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Typography variant="h6">Выбранные файлы ({files.length}):</Typography>
          <List>
            {files.map((file, index) => (
              <ListItem key={index}>
                <ListItemText primary={file.name} secondary={`${(file.size / 1024 / 1024).toFixed(2)} МБ`} />
                <IconButton onClick={() => handleRemoveFile(index)} edge="end">
                  <DeleteIcon />
                </IconButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Отображение прогресса загрузки */}
      {loading && (
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Typography variant="body1">Прогресс загрузки: {uploadProgress}%</Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Отображение загруженных файлов */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ marginTop: 2, marginBottom: 2 }}>
          <Typography variant="h6">Загруженные файлы:</Typography>
          <List>
            {uploadedFiles.map((file, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={<Link to={`/play/${encodeURIComponent(file.relativePath)}`}>{file.filename}</Link>}
                  secondary={file.audioUrl}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Typography variant="h5" gutterBottom>
        Директории
      </Typography>
      <List>
        <ListItem button onClick={() => handleDirectoryChange('')}>
          <ListItemText primary="Корневая директория" />
        </ListItem>
        {directories.map((dir, index) => (
          <ListItem button key={index} onClick={() => handleDirectoryChange(dir)}>
            <ListItemText primary={dir} />
            <IconButton onClick={(e) => { e.stopPropagation(); handleDeleteDirectory(dir); }} edge="end">
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Typography variant="h5" gutterBottom>
        Загруженные файлы (Текущая директория: {selectedDirectory || 'Корневая'})
      </Typography>
      {fileError && <Typography color="error">{fileError}</Typography>}
      <List>
        {fileList.length > 0 ? (
          fileList.map((file, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={<Link to={`/play/${encodeURIComponent(file)}`}>{file}</Link>}
              />
              <IconButton onClick={() => handleDelete(file)} edge="end">
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))
        ) : (
          <Typography>В этой директории нет файлов</Typography>
        )}
      </List>
    </Container>
  );
};

export default UploadPage;