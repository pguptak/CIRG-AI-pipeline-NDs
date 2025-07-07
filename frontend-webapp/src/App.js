import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Snackbar,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Psychology as PsychologyIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import Webcam from 'react-webcam';

import { analyzeImage, formatFileSize } from './utils/api';
import config from './config';
import './App.css';

const theme = createTheme({
  palette: {
    primary: { main: '#2196f3' },
    secondary: { main: '#ff9800' },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [annotatedImagePath, setAnnotatedImagePath] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const webcamRef = useRef(null);
  const [showWebcam, setShowWebcam] = useState(false);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      resetStateExceptImage();
      setSnackbar({
        open: true,
        message: `Image uploaded: ${file.name} (${formatFileSize(file.size)})`,
        severity: 'success',
      });
    }
  };

  const captureFromWebcam = () => {
    const screenshot = webcamRef.current.getScreenshot();
    fetch(screenshot)
      .then(res => res.blob())
      .then(blob => {
        const webcamFile = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
        setSelectedImage(webcamFile);
        setPreviewUrl(screenshot);
        resetStateExceptImage();
        setSnackbar({
          open: true,
          message: 'Image captured from webcam',
          severity: 'success',
        });
      });
  };

  const resetStateExceptImage = () => {
    setResults(null);
    setError(null);
    setAnnotatedImagePath(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    setIsProcessing(true);
    resetStateExceptImage();

    try {
      const result = await analyzeImage(selectedImage);
      setResults(result.data.results);
      setAnnotatedImagePath(result.data.annotated_image_path);
      setSnackbar({
        open: true,
        message: config.SUCCESS.ANALYSIS_SUCCESS,
        severity: 'success',
      });
    } catch (err) {
      setError(err.message);
      setSnackbar({
        open: true,
        message: err.message,
        severity: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    setAnnotatedImagePath(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography variant="h3" gutterBottom>Autism Detection AI</Typography>
          </Box>
          <Grid container spacing={4}>
            {/* Upload & Webcam Section */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    <CloudUploadIcon /> Upload or Capture Image
                  </Typography>

                  {/* Upload Box */}
                  <Box
                    onClick={() => document.getElementById('image-input').click()}
                    sx={{
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      bgcolor: '#f2f4f8',
                    }}
                  >
                    <input
                      id="image-input"
                      type="file"
                      accept={config.UPLOAD.ACCEPT}
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <Typography>Click to upload an image (JPG/PNG/GIF)</Typography>
                  </Box>

                  {/* Webcam */}
                  <Box mt={2} textAlign="center">
                    <Button
                      variant="outlined"
                      onClick={() => setShowWebcam(!showWebcam)}
                    >
                      {showWebcam ? 'Hide Webcam' : 'Show Webcam'}
                    </Button>

                    {showWebcam && (
                      <Box mt={2}>
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          width={320}
                          style={{ borderRadius: '8px', border: '1px solid #ccc' }}
                        />
                        <Button
                          onClick={captureFromWebcam}
                          variant="contained"
                          sx={{ mt: 2 }}
                        >
                          Capture from Webcam
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {/* Image Preview */}
                  {previewUrl && (
                    <Box textAlign="center" mt={3}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ maxWidth: 400, borderRadius: '8px', border: '2px solid #ccc' }}
                      />
                      <Typography mt={1}>{selectedImage?.name || 'Captured Image'}</Typography>
                    </Box>
                  )}

                  {/* Action Buttons */}
                  <Box mt={2} display="flex" gap={2} justifyContent="center">
                    <Button
                      variant="contained"
                      onClick={handleAnalyze}
                      disabled={!selectedImage || isProcessing}
                      startIcon={isProcessing ? <CircularProgress size={20} /> : <PsychologyIcon />}
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button variant="outlined" onClick={handleReset} disabled={isProcessing} startIcon={<RefreshIcon />}>
                      Reset
                    </Button>
                  </Box>

                  {/* Error */}
                  {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      <ErrorIcon sx={{ mr: 1 }} /> {error}
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Result Section */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    <VisibilityIcon /> Analysis Results
                  </Typography>

                  {isProcessing ? (
                    <Box textAlign="center" py={4}>
                      <CircularProgress size={60} />
                      <Typography>Processing image...</Typography>
                    </Box>
                  ) : results && Array.isArray(results) ? (
                    <>
                      <Box className="results" textAlign="center">
                        <Box sx={{
                          background: '#fff',
                          borderRadius: 2,
                          p: 2,
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                          display: 'inline-block',
                          mt: 2,
                          textAlign: 'left',
                          minWidth: 300,
                        }}>
                          {results.map((r, idx) => (
                            r.region ? (
                              <div key={idx}><strong>{r.region}</strong>: {r.label} ({r.confidence}%)<br /></div>
                            ) : r.final_decision ? (
                              <div key={idx}><strong>Final Decision:</strong> {r.final_decision}<br /></div>
                            ) : null
                          ))}
                        </Box>
                      </Box>

                      {annotatedImagePath && (
                        <Box id="imageContainer" textAlign="center" mt={2}>
                          <img
                            src={`${config.API_BASE_URL}${annotatedImagePath}`}
                            alt="Annotated"
                            style={{ maxWidth: 400, marginTop: 20, border: '2px solid #ccc' }}
                            crossOrigin="anonymous"
                          />
                        </Box>
                      )}
                    </>
                  ) : (
                    <Typography>No results yet. Upload or capture an image to begin analysis.</Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box textAlign="center" mt={6}>
            <Typography variant="body2" color="text.secondary">
              Developed by Prasant Gupta And Team
            </Typography>
          </Box>
        </Container>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          icon={snackbar.severity === 'success' ? <CheckCircleIcon /> : <ErrorIcon />}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
