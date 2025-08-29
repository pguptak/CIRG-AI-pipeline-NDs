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
  Chip,
  Paper,
} from '@mui/material';
import {
  Pets as PetsIcon,
  CloudUpload as CloudUploadIcon,
  Psychology as PsychologyIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Face as FaceIcon,
  Block as BlockIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import Webcam from 'react-webcam';
import { 
  analyzeImage, 
  callAutismApiDirectly, 
  formatFileSize, 
  getFullImageUrl, 
  getConfidenceColor 
} from './utils/api';
import config from './config';
import './App.css';

// Theme setup with larger components
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
    h3: {
      fontSize: '3.5rem',
      fontWeight: 800,
    },
    h4: {
      fontSize: '2.8rem',
      fontWeight: 700,
    },
    h5: {
      fontSize: '2.2rem',
      fontWeight: 600,
    },
    h6: {
      fontSize: '1.8rem',
      fontWeight: 500,
    },
    body1: {
      fontSize: '1.4rem',
    },
    body2: {
      fontSize: '1.2rem',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontSize: '1.4rem',
          padding: '16px 32px',
          minHeight: '56px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          padding: '24px',
          borderRadius: '20px',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          fontSize: '1.6rem',
          padding: '24px 32px',
          borderRadius: '16px',
        },
        icon: {
          fontSize: '3rem',
        },
        message: {
          fontSize: '1.6rem',
          fontWeight: 600,
        },
      },
    },
  },
  shape: {
    borderRadius: 16,
  },
});

// Direct autism API call function
const callDirectAutismAPI = async (imageFile) => {
  const formData = new FormData();
  formData.append('file', imageFile);
  try {
    console.log('🔄 Making direct call to autism detection API...');
    const response = await fetch('https://autism-detection-backend-667306373563.europe-west1.run.app/predict/', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Direct autism API HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Direct autism API response:', result);
    return result;
  } catch (error) {
    console.error('❌ Direct autism API call failed:', error);
    throw error;
  }
};

// Enhanced extraction for deeply nested API data
const extractAnalysisData = (response) => {
  let ageSummary = null;
  let autismResults = null;
  let annotatedAgeUrl = null;
  let autismAnnotatedImageUrl = null;
  let baseUrl = 'https://animal-human-filter-667306373563.europe-west2.run.app';

  if (response.age_analysis_data?.age_analysis_data?.age_check_summary) {
    const nestedData = response.age_analysis_data.age_analysis_data;
    ageSummary = nestedData.age_check_summary;
    
    if (nestedData.age_check_summary?.annotated_image_url) {
      annotatedAgeUrl = `${baseUrl}${nestedData.age_check_summary.annotated_image_url}`;
    }
    
    if (nestedData.autism_prediction_data) {
      autismResults = nestedData.autism_prediction_data.results;
      if (nestedData.autism_prediction_data.annotated_image_path) {
        autismAnnotatedImageUrl = `${baseUrl}${nestedData.autism_prediction_data.annotated_image_path}`;
      }
    }
  }
  else if (response.age_analysis_data?.age_check_summary) {
    ageSummary = response.age_analysis_data.age_check_summary;
    
    if (response.age_analysis_data?.annotated_image_url) {
      annotatedAgeUrl = `${baseUrl}${response.age_analysis_data.annotated_image_url}`;
    }
    
    if (response.age_analysis_data.autism_prediction_data) {
      autismResults = response.age_analysis_data.autism_prediction_data.results;
      if (response.age_analysis_data.autism_prediction_data.annotated_image_path) {
        autismAnnotatedImageUrl = `${baseUrl}${response.age_analysis_data.autism_prediction_data.annotated_image_path}`;
      }
    }
  }

  if (response.annotated_image_url && !annotatedAgeUrl) {
    annotatedAgeUrl = `${baseUrl}${response.annotated_image_url}`;
  }

  console.log('🔍 Extracted data:', {
    ageSummary,
    autismResults,
    annotatedAgeUrl,
    autismAnnotatedImageUrl
  });

  return { ageSummary, autismResults, annotatedAgeUrl, autismAnnotatedImageUrl };
};

// Large Error Display Component
const LargeErrorBox = ({ title, message, type = 'error' }) => {
  const getErrorIcon = () => {
    switch(type) {
      case 'warning': return <WarningIcon sx={{ fontSize: '5rem', color: '#ff9800' }} />;
      case 'info': return <ErrorIcon sx={{ fontSize: '5rem', color: '#2196f3' }} />;
      default: return <ErrorIcon sx={{ fontSize: '5rem', color: '#f44336' }} />;
    }
  };

  const getBackgroundColor = () => {
    switch(type) {
      case 'warning': return 'linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)';
      case 'info': return 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)';
      default: return 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)';
    }
  };

  const getBorderColor = () => {
    switch(type) {
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#f44336';
    }
  };

  return (
    <Paper
      elevation={6}
      sx={{
        background: getBackgroundColor(),
        border: `4px solid ${getBorderColor()}`,
        borderRadius: '24px',
        padding: '48px 40px',
        margin: '32px 0',
        textAlign: 'center',
        boxShadow: `0 12px 40px rgba(0,0,0,0.15)`,
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
      }}
    >
      {getErrorIcon()}
      
      <Box>
        <Typography
          variant="h3"
          sx={{
            fontSize: '3.2rem',
            fontWeight: 800,
            color: getBorderColor(),
            marginBottom: '16px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {title}
        </Typography>
        
        <Typography
          variant="h5"
          sx={{
            fontSize: '2.4rem',
            fontWeight: 600,
            color: '#333',
            lineHeight: 1.4,
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
          {message}
        </Typography>
      </Box>
    </Paper>
  );
};

function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [pipelineData, setPipelineData] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  // Age and autism data
  const [ageAnalysis, setAgeAnalysis] = useState({});
  const [autismAnalysis, setAutismAnalysis] = useState({});
  const [ageAnnotatedImageUrl, setAgeAnnotatedImageUrl] = useState(null);
  const [autismAnnotatedImageUrl, setAutismAnnotatedImageUrl] = useState(null);
  const [directAutismResults, setDirectAutismResults] = useState(null);

  const webcamRef = useRef(null);
  const [showWebcam, setShowWebcam] = useState(false);

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > config.UPLOAD.MAX_FILE_SIZE) {
        setSnackbar({
          open: true,
          message: 'File too large. Please select an image under 10MB.',
          severity: 'error',
        });
        return;
      }

      if (!config.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
        setSnackbar({
          open: true,
          message: 'Invalid file type. Please select JPG, PNG, GIF, or WebP.',
          severity: 'error',
        });
        return;
      }

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
    try {
      const screenshot = webcamRef.current?.getScreenshot();
      if (!screenshot) {
        setSnackbar({
          open: true,
          message: 'Failed to capture image from webcam',
          severity: 'error',
        });
        return;
      }

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
        })
        .catch(err => {
          console.error('Webcam capture error:', err);
          setSnackbar({
            open: true,
            message: 'Failed to process webcam capture',
            severity: 'error',
          });
        });
    } catch (err) {
      console.error('Webcam error:', err);
      setSnackbar({
        open: true,
        message: 'Webcam not available',
        severity: 'error',
      });
    }
  };

  const resetStateExceptImage = () => {
    setResults(null);
    setError(null);
    setAnalysisStatus('idle');
    setPipelineData(null);
    setAgeAnalysis({});
    setAutismAnalysis({});
    setAgeAnnotatedImageUrl(null);
    setAutismAnnotatedImageUrl(null);
    setDirectAutismResults(null);
  };

  // Main analysis function with conditional direct API call
  const handleAnalyze = async () => {
    if (!selectedImage) {
      setSnackbar({
        open: true,
        message: 'Please select or capture an image first',
        severity: 'warning',
      });
      return;
    }

    setIsProcessing(true);
    resetStateExceptImage();
    setAnalysisStatus('processing');

    try {
      console.log('🚀 Starting image analysis...');
      
      // 1. First, get face/age analysis from pipeline
      const response = await analyzeImage(selectedImage);
      console.log('🔍 Full Pipeline Response:', response);
      
      setPipelineData(response);
      const {
        ageSummary,
        autismResults,
        annotatedAgeUrl,
        autismAnnotatedImageUrl: initialAutismImage
      } = extractAnalysisData(response);

      setAnalysisStatus(response.status || 'unknown');
      
      // Set the age annotated image
      if (annotatedAgeUrl) {
        console.log('🖼️ Setting age annotated image:', annotatedAgeUrl);
        setAgeAnnotatedImageUrl(annotatedAgeUrl);
      }
      
      if (ageSummary) setAgeAnalysis(ageSummary);

      // **KEY LOGIC: Only call direct autism API if age < 18 AND face filter passed**
      const kidsPresent = ageSummary && ageSummary.kids_count > 0;
      const faceValidated = response.valid && response.status === 'face_validated_and_processed';
      
      if (kidsPresent && faceValidated) {
        console.log('✅ Child detected and face validated - calling direct autism API');
        setAnalysisStatus('processing_autism');
        setSnackbar({
          open: true,
          message: 'Child detected. Running autism analysis...',
          severity: 'info',
        });

        try {
          // Call direct autism API
          const directResults = await callDirectAutismAPI(selectedImage);
          
          if (directResults && directResults.results) {
            console.log('✅ Direct autism API successful');
            setDirectAutismResults(directResults);
            setResults(directResults.results);
            
            // Set autism annotated image from direct API
            if (directResults.annotated_image_url) {
              const fullUrl = directResults.annotated_image_url.startsWith('http') 
                ? directResults.annotated_image_url 
                : `https://autism-detection-backend-667306373563.europe-west1.run.app${directResults.annotated_image_url}`;
              setAutismAnnotatedImageUrl(fullUrl);
            } else if (directResults.annotated_image_path) {
              const fullUrl = directResults.annotated_image_path.startsWith('http') 
                ? directResults.annotated_image_path 
                : `https://autism-detection-backend-667306373563.europe-west1.run.app${directResults.annotated_image_path}`;
              setAutismAnnotatedImageUrl(fullUrl);
            }
            
            setAnalysisStatus('child_autism_screened');
            setSnackbar({
              open: true,
              message: 'Autism analysis completed successfully!',
              severity: 'success',
            });
          } else {
            // Fallback to pipeline results if direct API fails
            if (autismResults && autismResults.length > 0) {
              setResults(autismResults);
              if (initialAutismImage) {
                setAutismAnnotatedImageUrl(initialAutismImage);
              }
              setAnalysisStatus('child_autism_screened');
            } else {
              setAnalysisStatus('autism_failed');
              setResults([]);
            }
          }
        } catch (directError) {
          console.error('❌ Direct autism API failed:', directError);
          
          // Fallback to pipeline results
          if (autismResults && autismResults.length > 0) {
            setResults(autismResults);
            if (initialAutismImage) {
              setAutismAnnotatedImageUrl(initialAutismImage);
            }
            setAnalysisStatus('child_autism_screened');
            setSnackbar({
              open: true,
              message: 'Autism analysis completed using pipeline results.',
              severity: 'success',
            });
          } else {
            setAnalysisStatus('autism_failed');
            setResults([]);
            setSnackbar({
              open: true,
              message: 'Autism analysis failed. Please try again.',
              severity: 'error',
            });
          }
        }
      }
      // Adults detected: block autism analysis
      else if (ageSummary && ageSummary.adults_count > 0) {
        setAnalysisStatus('adult_invalid');
        setResults([{
          summary: `Adults detected: ${ageSummary.adults_count}, Kids: ${ageSummary.kids_count}`,
          status: 'Autism analysis blocked - only available for children under 18'
        }]);
        setSnackbar({
          open: true,
          message: 'Adult detected (18+). Autism analysis only for children.',
          severity: 'warning',
        });
      }
      // Face validation failed or unclear age
      else {
        setAnalysisStatus('unclear_age');
        setResults([{
          summary: !faceValidated ? 'Face validation failed' : 'Age classification unclear',
          details: 'Try again with a clearer image showing a human face.'
        }]);
        setSnackbar({
          open: true,
          message: !faceValidated ? 'Face validation failed.' : 'Age unclear. Please try with a better image.',
          severity: 'warning'
        });
      }

    } catch (err) {
      console.error('❌ Analysis error:', err);
      setError(err.message || 'Analysis failed');
      setAnalysisStatus('error');
      setSnackbar({
        open: true,
        message: err.message || 'Analysis failed',
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Other handlers
  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedImage(null);
    setPreviewUrl(null);
    resetStateExceptImage();
    setSnackbar({
      open: true,
      message: 'Reset completed',
      severity: 'info',
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStatusIcon = () => {
    switch (analysisStatus) {
      case 'child_autism_screened':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: '4rem' }} />;
      case 'adult_invalid':
        return <BlockIcon sx={{ color: '#ff9800', fontSize: '4rem' }} />;
      case 'rejected_animal':
        return <PetsIcon sx={{ color: '#f44336', fontSize: '4rem' }} />;
      case 'rejected_no_face':
        return <FaceIcon sx={{ color: '#f44336', fontSize: '4rem' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336', fontSize: '4rem' }} />;
      default:
        return <VisibilityIcon sx={{ color: '#2196f3', fontSize: '4rem' }} />;
    }
  };

  const getStatusMessage = () => {
    switch (analysisStatus) {
      case 'processing':
        return 'Processing through AI pipeline...';
      case 'processing_autism':
        return 'Processing autism analysis...';
      case 'child_autism_screened':
        return 'Complete Analysis: Child detected, autism screening performed';
      case 'adult_invalid':
        return 'Adult Detected: Autism analysis blocked (18+ restriction)';
      case 'rejected_animal':
        return 'Animal Detected: Only human faces are accepted';
      case 'rejected_no_face':
        return 'No Face Detected: Please ensure a clear human face is visible';
      case 'error':
        return 'Analysis Failed: Please try again';
      case 'autism_failed':
        return 'Autism Analysis Failed: Please try again';
      default:
        return 'Upload an image to start analysis';
    }
  };

  // Confidence indicator chip (larger)
  const ConfidenceLevel = ({ confidence }) => {
    const confidenceColor = getConfidenceColor(confidence);
    const getColorValue = (color) => {
      switch(color) {
        case 'success': return '#4caf50';
        case 'warning': return '#ff9800';
        case 'error': return '#f44336';
        default: return '#2196f3';
      }
    };

    if (typeof confidence !== 'number' || isNaN(confidence)) {
      return (
        <Chip
          label="N/A"
          size="medium"
          variant="outlined"
          sx={{ 
            borderColor: '#64748b', 
            color: '#64748b',
            fontSize: '1.2rem',
            height: '40px',
            '& .MuiChip-label': { fontSize: '1.2rem', fontWeight: 600 }
          }}
        />
      );
    }

    return (
      <Chip
        label={`${confidence.toFixed(1)}%`}
        size="medium"
        variant="outlined"
        sx={{
          borderColor: getColorValue(confidenceColor),
          color: getColorValue(confidenceColor),
          fontWeight: 600,
          fontSize: '1.2rem',
          height: '40px',
          '& .MuiChip-label': { fontSize: '1.2rem', fontWeight: 600 }
        }}
      />
    );
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // --- MAIN UI RENDER ---
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 6 }}>
        <Container maxWidth="xl">
          <Box textAlign="center" mb={8}>
            <Typography variant="h3" gutterBottom sx={{ fontSize: '4rem', mb: 3 }}>
              AI AUTISM DETECTION
            </Typography>
            <Typography variant="h5" color="text.secondary" sx={{ fontSize: '2rem' }}>
              Advanced AI-powered autism screening
            </Typography>
          </Box>

          <Grid container spacing={6}>
            <Grid item xs={12} lg={6}>
              <Card sx={{ minHeight: '800px' }}>
                <CardContent sx={{ padding: '40px' }}>
                  <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    <CloudUploadIcon sx={{ fontSize: '3rem' }} /> Upload or Capture Image
                  </Typography>

                  <Box
                    onClick={() => document.getElementById('image-input').click()}
                    sx={{
                      border: '4px dashed',
                      borderColor: 'primary.main',
                      p: 6,
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 4,
                      bgcolor: '#f0f4ff',
                      '&:hover': { bgcolor: '#e3f2fd' },
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <input
                      id="image-input"
                      type="file"
                      accept={config.UPLOAD.ACCEPT}
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <CloudUploadIcon sx={{ fontSize: '6rem', color: 'primary.main', mb: 2 }} />
                    <Typography variant="h5" sx={{ mb: 1 }}>Click to upload an image</Typography>
                    <Typography variant="h6" color="text.secondary">
                      JPG, PNG, GIF, WebP • Max {formatFileSize(config.UPLOAD.MAX_FILE_SIZE)}
                    </Typography>
                  </Box>

                  <Box mt={4} textAlign="center">
                    <Button
                      variant="outlined"
                      onClick={() => setShowWebcam(!showWebcam)}
                      sx={{ mb: 3, fontSize: '1.3rem', padding: '12px 24px' }}
                      size="large"
                    >
                      {showWebcam ? 'Hide Webcam' : 'Show Webcam'}
                    </Button>
                    
                    {showWebcam && (
                      <Box>
                        <Box sx={{ border: '2px solid #ccc', borderRadius: 3, p: 2, display: 'inline-block' }}>
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width={400}
                            height={300}
                            style={{ borderRadius: '12px' }}
                          />
                        </Box>
                        <Button
                          onClick={captureFromWebcam}
                          variant="contained"
                          sx={{ mt: 3, display: 'block', mx: 'auto', fontSize: '1.3rem' }}
                          size="large"
                        >
                          Capture Photo
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {previewUrl && (
                    <Box textAlign="center" mt={4}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 400, 
                          borderRadius: '16px', 
                          border: '4px solid #ddd',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                        }}
                      />
                      <Typography variant="h6" mt={2} color="text.secondary">
                        {selectedImage?.name || 'Captured Image'} 
                        {selectedImage?.size && ` (${formatFileSize(selectedImage.size)})`}
                      </Typography>
                    </Box>
                  )}

                  <Box mt={5} display="flex" gap={3} justifyContent="center">
                    <Button
                      variant="contained"
                      onClick={handleAnalyze}
                      disabled={!selectedImage || isProcessing}
                      startIcon={isProcessing ? <CircularProgress size={24} /> : <PsychologyIcon />}
                      size="large"
                      sx={{ fontSize: '1.4rem', minWidth: '180px' }}
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={handleReset} 
                      disabled={isProcessing}
                      startIcon={<RefreshIcon />}
                      size="large"
                      sx={{ fontSize: '1.4rem', minWidth: '140px' }}
                    >
                      Reset
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} lg={6}>
              <Card sx={{ minHeight: '800px' }}>
                <CardContent sx={{ padding: '40px' }}>
                  <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                    {getStatusIcon()} Analysis Results
                  </Typography>

                  <Alert 
                    severity={
                      analysisStatus === 'child_autism_screened' ? 'success' :
                      analysisStatus === 'adult_invalid' ? 'warning' :
                      analysisStatus.startsWith('rejected') || analysisStatus === 'error' || analysisStatus === 'autism_failed' ? 'error' :
                      'info'
                    }
                    sx={{ mb: 4, fontSize: '1.5rem', padding: '20px 32px' }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1.8rem' }}>
                      {getStatusMessage()}
                    </Typography>
                  </Alert>

                  {/* Large Error Display */}
                  {error && (
                    <LargeErrorBox 
                      title="Analysis Failed"
                      message={error}
                      type="error"
                    />
                  )}

                  {/* Processing Status */}
                  {isProcessing && (
                    <Paper
                      elevation={3}
                      sx={{
                        textAlign: 'center',
                        py: 8,
                        px: 4,
                        borderRadius: '20px',
                        background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                        border: '2px solid #2196f3',
                      }}
                    >
                      <CircularProgress size={80} sx={{ mb: 4 }} />
                      <Typography variant="h4" sx={{ mb: 2 }}>
                        {analysisStatus === 'processing_autism' ? 'Processing autism analysis...' : 'Processing image...'}
                      </Typography>
                      <Typography variant="h6" color="text.secondary">
                        {analysisStatus === 'processing_autism' ? 
                          'Analyzing facial features for autism indicators...' :
                          'Face detection → Age classification → Autism analysis'}
                      </Typography>
                    </Paper>
                  )}

                  {/* Priority image display */}
                  {!isProcessing && (() => {
                    if (analysisStatus === 'child_autism_screened' && autismAnnotatedImageUrl) {
                      return (
                        <Box textAlign="center" mb={4}>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#4caf50', fontSize: '1.6rem' }}>
                            ✅ Complete Analysis - Autism Detection Result
                          </Typography>
                          <img
                            src={autismAnnotatedImageUrl}
                            alt="Autism Analysis Result"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 500,
                              borderRadius: 16,
                              border: '4px solid #4caf50',
                              boxShadow: '0 8px 24px rgba(76,175,80,0.3)'
                            }}
                            crossOrigin="anonymous"
                            onError={() => console.error('Failed to load autism image')}
                          />
                          <Typography variant="body1" sx={{ display: 'block', mt: 2, color: '#4caf50', fontSize: '1.3rem' }}>
                            Final result: Autism detection with facial region analysis
                          </Typography>
                        </Box>
                      );
                    }
                    if (ageAnnotatedImageUrl) {
                      const borderColor = analysisStatus === 'adult_invalid' ? '#ff9800' : '#2196f3';
                      const statusText = analysisStatus === 'adult_invalid' ? 'Adult Detected - Autism Blocked' : 'Age Classification Complete';
                      return (
                        <Box textAlign="center" mb={4}>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: borderColor, fontSize: '1.6rem' }}>
                            {analysisStatus === 'adult_invalid' ? '🔞' : '👥'} {statusText}
                          </Typography>
                          <img
                            src={ageAnnotatedImageUrl}
                            alt="Age Classification Result"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 500,
                              borderRadius: 16,
                              border: `4px solid ${borderColor}`,
                              boxShadow: `0 8px 24px rgba(${borderColor === '#ff9800' ? '255,152,0' : '33,150,243'},0.3)`
                            }}
                            crossOrigin="anonymous"
                            onError={() => console.error('Failed to load age image')}
                          />
                          <Typography variant="body1" sx={{ display: 'block', mt: 2, color: borderColor, fontSize: '1.3rem' }}>
                            {analysisStatus === 'adult_invalid' ? 
                              'Adults detected - autism analysis not performed' : 
                              'Age analysis complete'}
                          </Typography>
                        </Box>
                      );
                    }
                    if (analysisStatus.startsWith('rejected') && previewUrl) {
                      return (
                        <LargeErrorBox
                          title={analysisStatus === 'rejected_animal' ? 'Animal Detected' : 'Invalid Face'}
                          message={analysisStatus === 'rejected_animal' ? 
                            'Animal face detected - analysis blocked. Please upload a human face.' : 
                            'No valid human face found. Please ensure a clear human face is visible.'}
                          type="warning"
                        />
                      );
                    }
                    return (
                      <Paper
                        elevation={2}
                        sx={{
                          textAlign: 'center',
                          py: 8,
                          px: 4,
                          borderRadius: '20px',
                          background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                        }}
                      >
                        <Typography variant="h5" color="text.secondary" sx={{ fontSize: '1.8rem' }}>
                          Upload or capture an image to begin AI analysis
                        </Typography>
                      </Paper>
                    );
                  })()}

                  {/* Detailed autism results */}
                  {!isProcessing && results && Array.isArray(results) && results.length > 0 && (
                    <Box mt={4}>
                      <Typography variant="h5" gutterBottom sx={{ fontSize: '2rem' }}>Detailed Results:</Typography>
                      <Paper elevation={2} sx={{ bgcolor: '#f5f5f5', borderRadius: 3, p: 4 }}>
                        {results.map((result, idx) => (
                          <Box key={idx} sx={{ mb: 3 }}>
                            {result.region && (
                              <Typography variant="h6" sx={{ fontSize: '1.4rem' }}>
                                <strong>{result.region}:</strong> {result.label} 
                                {result.confidence && (
                                  <Box component="span" sx={{ ml: 2 }}>
                                    <ConfidenceLevel confidence={result.confidence} />
                                  </Box>
                                )}
                              </Typography>
                            )}
                            {result.final_decision && (
                              <Typography variant="h5" sx={{ fontWeight: 600, color: 'primary.main', mt: 2, fontSize: '1.6rem' }}>
                                <strong>Final Decision:</strong> {result.final_decision}
                              </Typography>
                            )}
                            {result.summary && (
                              <Typography variant="body1" sx={{ fontSize: '1.3rem' }}>
                                <strong>Summary:</strong> {result.summary}
                              </Typography>
                            )}
                            {result.status && (
                              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.2rem' }}>
                                {result.status}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Paper>
                    </Box>
                  )}

                  {ageAnalysis.has_faces && (
                    <Box sx={{ mt: 4, p: 3, bgcolor: '#f8fafc', borderRadius: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, fontSize: '1.5rem' }}>
                        Age Analysis Summary
                      </Typography>
                      <Typography variant="body1" sx={{ fontSize: '1.3rem' }}>
                        Total Faces: <strong>{(ageAnalysis.kids_count || 0) + (ageAnalysis.adults_count || 0)}</strong><br />
                        Kids (≤18): <strong style={{ color: '#4caf50' }}>{ageAnalysis.kids_count || 0}</strong><br />
                        Adults (18+): <strong style={{ color: '#f44336' }}>{ageAnalysis.adults_count || 0}</strong>
                      </Typography>
                      {ageAnalysis.annotations && ageAnalysis.annotations.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                            Detected ages: {ageAnalysis.annotations.map(ann => ann.age).join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box textAlign="center" mt={8}>
            <Typography variant="h6" color="text.secondary" sx={{ fontSize: '1.4rem' }}>
              Developed by Dr Prasant Gupta And Team
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Snackbar Notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            fontSize: '1.3rem',
            '& .MuiAlert-message': { fontSize: '1.3rem' }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
}

export default App;
