app.delete('/delete/:filename(*)', async (req, res) => {
  let filename = req.params.filename;
  console.log(`Received delete request for: ${filename}`);

  // Извлекаем имя файла из полного URL
  const urlParts = filename.split('/');
  filename = urlParts[urlParts.length - 1];

  console.log(`Attempting to delete file: ${filename}`);

  try {
    const files = await getAllFiles(uploadDir);
    console.log('All files:', files);
    const filePath = files.find(file => path.basename(file) === filename);
    console.log(`File path found: ${filePath}`);

    if (!filePath) {
      console.log('File not found');
      return res.status(404).send({ error: 'File not found' });
    }

    const fullPath = path.join(uploadDir, filePath);
    console.log('Full path to delete:', fullPath);

    await fsPromises.unlink(fullPath);
    console.log(`File deleted successfully: ${filename}`);
    res.send({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).send({ error: 'Unable to delete file' });
  }
});