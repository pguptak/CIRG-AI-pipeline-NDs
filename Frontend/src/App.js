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
  Block as BlockIcon
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

// Theme setup
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
        return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case 'adult_invalid':
        return <BlockIcon sx={{ color: '#ff9800' }} />;
      case 'rejected_animal':
        return <PetsIcon sx={{ color: '#f44336' }} />;
      case 'rejected_no_face':
        return <FaceIcon sx={{ color: '#f44336' }} />;
      case 'error':
        return <ErrorIcon sx={{ color: '#f44336' }} />;
      default:
        return <VisibilityIcon sx={{ color: '#2196f3' }} />;
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

  // Confidence indicator chip
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
          size="small"
          variant="outlined"
          sx={{ borderColor: '#64748b', color: '#64748b' }}
        />
      );
    }

    return (
      <Chip
        label={`${confidence.toFixed(1)}%`}
        size="small"
        variant="outlined"
        sx={{
          borderColor: getColorValue(confidenceColor),
          color: getColorValue(confidenceColor),
          fontWeight: 600,
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
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 4 }}>
        <Container maxWidth="lg">
          <Box textAlign="center" mb={6}>
            <Typography variant="h3" gutterBottom>
              AI AUTISM DETECTION
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Advanced AI-powered autism screening
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CloudUploadIcon /> Upload or Capture Image
                  </Typography>

                  <Box
                    onClick={() => document.getElementById('image-input').click()}
                    sx={{
                      border: '2px dashed',
                      borderColor: 'primary.main',
                      p: 4,
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 2,
                      bgcolor: '#f0f4ff',
                      '&:hover': { bgcolor: '#e3f2fd' },
                    }}
                  >
                    <input
                      id="image-input"
                      type="file"
                      accept={config.UPLOAD.ACCEPT}
                      onChange={handleImageSelect}
                      style={{ display: 'none' }}
                    />
                    <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h6">Click to upload an image</Typography>
                    <Typography variant="body2" color="text.secondary">
                      JPG, PNG, GIF, WebP • Max {formatFileSize(config.UPLOAD.MAX_FILE_SIZE)}
                    </Typography>
                  </Box>

                  <Box mt={3} textAlign="center">
                    <Button
                      variant="outlined"
                      onClick={() => setShowWebcam(!showWebcam)}
                      sx={{ mb: 2 }}
                    >
                      {showWebcam ? 'Hide Webcam' : 'Show Webcam'}
                    </Button>
                    {showWebcam && (
                      <Box>
                        <Box sx={{ border: '1px solid #ccc', borderRadius: 2, p: 1, display: 'inline-block' }}>
                          <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width={320}
                            height={240}
                            style={{ borderRadius: '8px' }}
                          />
                        </Box>
                        <Button
                          onClick={captureFromWebcam}
                          variant="contained"
                          sx={{ mt: 2, display: 'block', mx: 'auto' }}
                        >
                          Capture Photo
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {previewUrl && (
                    <Box textAlign="center" mt={3}>
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: 300, 
                          borderRadius: '8px', 
                          border: '2px solid #ddd',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      />
                      <Typography variant="body2" mt={1} color="text.secondary">
                        {selectedImage?.name || 'Captured Image'} 
                        {selectedImage?.size && ` (${formatFileSize(selectedImage.size)})`}
                      </Typography>
                    </Box>
                  )}

                  <Box mt={3} display="flex" gap={2} justifyContent="center">
                    <Button
                      variant="contained"
                      onClick={handleAnalyze}
                      disabled={!selectedImage || isProcessing}
                      startIcon={isProcessing ? <CircularProgress size={20} /> : <PsychologyIcon />}
                      size="large"
                    >
                      {isProcessing ? 'Analyzing...' : 'Analyze'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={handleReset} 
                      disabled={isProcessing}
                      startIcon={<RefreshIcon />}
                      size="large"
                    >
                      Reset
                    </Button>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ErrorIcon />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Analysis Failed
                          </Typography>
                          <Typography variant="body2">{error}</Typography>
                        </Box>
                      </Box>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon()} Analysis Results
                  </Typography>

                  <Alert 
                    severity={
                      analysisStatus === 'child_autism_screened' ? 'success' :
                      analysisStatus === 'adult_invalid' ? 'warning' :
                      analysisStatus.startsWith('rejected') || analysisStatus === 'error' || analysisStatus === 'autism_failed' ? 'error' :
                      'info'
                    }
                    sx={{ mb: 3 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {getStatusMessage()}
                    </Typography>
                  </Alert>

                  {isProcessing && (
                    <Box textAlign="center" py={4}>
                      <CircularProgress size={60} sx={{ mb: 2 }} />
                      <Typography variant="h6">
                        {analysisStatus === 'processing_autism' ? 'Processing autism analysis...' : 'Processing image...'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {analysisStatus === 'processing_autism' ? 
                          'Analyzing facial features for autism indicators...' :
                          'Face detection → Age classification → Autism analysis'}
                      </Typography>
                    </Box>
                  )}

                  {/* --- Priority image display --- */}
                  {!isProcessing && (() => {
                    if (analysisStatus === 'child_autism_screened' && autismAnnotatedImageUrl) {
                      return (
                        <Box textAlign="center" mb={3}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#4caf50' }}>
                            ✅ Complete Analysis - Autism Detection Result
                          </Typography>
                          <img
                            src={autismAnnotatedImageUrl}
                            alt="Autism Analysis Result"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 400,
                              borderRadius: 8,
                              border: '3px solid #4caf50',
                              boxShadow: '0 4px 12px rgba(76,175,80,0.3)'
                            }}
                            crossOrigin="anonymous"
                            onError={() => console.error('Failed to load autism image')}
                          />
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#4caf50' }}>
                            Final result: Autism detection with facial region analysis
                          </Typography>
                        </Box>
                      );
                    }

                    if (ageAnnotatedImageUrl) {
                      const borderColor = analysisStatus === 'adult_invalid' ? '#ff9800' : '#2196f3';
                      const statusText = analysisStatus === 'adult_invalid' ? 'Adult Detected - Autism Blocked' : 'Age Classification Complete';
                      return (
                        <Box textAlign="center" mb={3}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: borderColor }}>
                            {analysisStatus === 'adult_invalid' ? '🔞' : '👥'} {statusText}
                          </Typography>
                          <img
                            src={ageAnnotatedImageUrl}
                            alt="Age Classification Result"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 400,
                              borderRadius: 8,
                              border: `3px solid ${borderColor}`,
                              boxShadow: `0 4px 12px rgba(${borderColor === '#ff9800' ? '255,152,0' : '33,150,243'},0.3)`
                            }}
                            crossOrigin="anonymous"
                            onError={() => console.error('Failed to load age image')}
                          />
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: borderColor }}>
                            {analysisStatus === 'adult_invalid' ? 
                              'Adults detected - autism analysis not performed' : 
                              'Age analysis complete'}
                          </Typography>
                        </Box>
                      );
                    }

                    if (analysisStatus.startsWith('rejected') && previewUrl) {
                      return (
                        <Box textAlign="center" mb={3}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600, color: '#f44336' }}>
                            ❌ {analysisStatus === 'rejected_animal' ? 'Animal Detected' : 'Invalid Face'}
                          </Typography>
                          <img
                            src={previewUrl}
                            alt="Rejected Image"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 400,
                              borderRadius: 8,
                              border: '3px solid #f44336',
                              boxShadow: '0 4px 12px rgba(244,67,54,0.3)',
                              filter: 'grayscale(50%)'
                            }}
                          />
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#f44336' }}>
                            {analysisStatus === 'rejected_animal' ? 
                              'Animal face detected - analysis blocked' : 
                              'No valid human face found'}
                          </Typography>
                        </Box>
                      );
                    }

                    return (
                      <Box textAlign="center" py={4}>
                        <Typography variant="body1" color="text.secondary">
                          Upload or capture an image to begin AI analysis
                        </Typography>
                      </Box>
                    );
                  })()}

                  {/* Detailed autism results */}
                  {!isProcessing && results && Array.isArray(results) && results.length > 0 && (
                    <Box>
                      <Typography variant="h6" gutterBottom>Detailed Results:</Typography>
                      <Box sx={{ bgcolor: '#f5f5f5', borderRadius: 2, p: 2 }}>
                        {results.map((result, idx) => (
                          <Box key={idx} sx={{ mb: 1 }}>
                            {result.region && (
                              <Typography variant="body2">
                                <strong>{result.region}:</strong> {result.label} 
                                {result.confidence && (
                                  <Box component="span" sx={{ ml: 1 }}>
                                    <ConfidenceLevel confidence={result.confidence} />
                                  </Box>
                                )}
                              </Typography>
                            )}
                            {result.final_decision && (
                              <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main', mt: 1 }}>
                                <strong>Final Decision:</strong> {result.final_decision}
                              </Typography>
                            )}
                            {result.summary && (
                              <Typography variant="body2">
                                <strong>Summary:</strong> {result.summary}
                              </Typography>
                            )}
                            {result.status && (
                              <Typography variant="body2" color="text.secondary">
                                {result.status}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {ageAnalysis.has_faces && (
                    <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                        Age Analysis Summary
                      </Typography>
                      <Typography variant="body2">
                        Total Faces: <strong>{(ageAnalysis.kids_count || 0) + (ageAnalysis.adults_count || 0)}</strong><br />
                        Kids (≤18): <strong style={{ color: '#4caf50' }}>{ageAnalysis.kids_count || 0}</strong><br />
                        Adults (18+): <strong style={{ color: '#f44336' }}>{ageAnalysis.adults_count || 0}</strong>
                      </Typography>
                      {ageAnalysis.annotations && ageAnalysis.annotations.length > 0 && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Detected ages: {ageAnalysis.annotations.map(ann => ann.age).join(', ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {pipelineData && process.env.NODE_ENV === 'development' && (
                    <Box mt={3} p={2} bgcolor="#f0f0f0" borderRadius={2}>
                      <Typography variant="caption" color="text.secondary">
                        Debug: Status = {pipelineData.status}, Valid = {String(pipelineData.valid)}
                        {directAutismResults && ', Direct API: ✅'}
                        {autismAnnotatedImageUrl && ', Autism Image: ✅'}
                        {ageAnnotatedImageUrl && ', Age Image: ✅'}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Footer */}
          <Box textAlign="center" mt={6}>
            <Typography variant="body2" color="text.secondary">
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
