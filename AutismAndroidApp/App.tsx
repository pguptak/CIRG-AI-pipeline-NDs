import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  Asset,
  ImageLibraryOptions,
  CameraOptions,
  MediaType,
} from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';

const { width, height } = Dimensions.get('window');

// Configuration - Integrated from your web version
const config = {
  // Backend API Base URL - Animal Filter API as entry point
  API_BASE_URL: 'https://animal-human-filter-667306373563.europe-west2.run.app',
  
  // API Endpoints
  ENDPOINTS: {
    ANALYZE: '/filter_face/',
    HEALTH: '/health',
    KEEPALIVE: '/keepalive',
  },

  // Upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10 MB limit
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ACCEPT: 'image/*',
  },

  // UI configuration
  UI: {
    ANIMATION_DURATION: 300,
    LOADING_TIMEOUT: 300000,     // 5 minutes for severe cold start cascade
    AUTO_REFRESH_INTERVAL: 5000,
    COLD_START_WARNING_TIME: 15000,
    RETRY_DELAY: 12000,
    MAX_RETRIES: 2,
  },

  // Colors
  COLORS: {
    PRIMARY: '#2196F3',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    ERROR: '#F44336',
    DARK_BACKGROUND: '#1a1a1a',
    WHITE: '#FFFFFF',
    INFO: '#2196F3',
  },

  // Results configuration
  RESULTS: {
    CONFIDENCE_THRESHOLDS: {
      HIGH: 70,
      MEDIUM: 40,
      LOW: 0,
    },
    CHIP_COLORS: {
      HIGH: 'success',
      MEDIUM: 'warning',
      LOW: 'error',
    },
  },

  // Error messages
  ERRORS: {
    NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
    UPLOAD_ERROR: 'Failed to upload image. Please try again.',
    ANALYSIS_ERROR: 'Failed to analyze image. Please try again.',
    FILE_TOO_LARGE: 'File size is too large. Please select an image under 10MB.',
    INVALID_FILE_TYPE: 'Invalid file type. Please select a valid image file (JPG, PNG, GIF, WebP).',
    ANIMAL_DETECTED: 'Animal face detected. Please upload a photo containing only human faces.',
    NO_FACE_DETECTED: 'No human face detected. Please ensure a clear human face is visible.',
    ADULT_ONLY: 'Only adults detected. Autism analysis is only available for children under 18.',
    INVALID_IMAGE: 'Invalid image. Please upload a clear photo of a human face.',
    CORRUPT_IMAGE: 'Image appears to be corrupted. Please try uploading a different image.',
    UNSUPPORTED_FORMAT: 'Image format not supported. Please use JPG, PNG, GIF, or WebP.',
  },

  // App info
  APP: {
    DEVELOPER: 'Dr Prasant Gupta And Team',
  },
};

// API Utilities - Adapted for React Native
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const validateImageFile = (file: any) => {
  if (!file) return 'No file selected';
  if (file.fileSize && file.fileSize > config.UPLOAD.MAX_FILE_SIZE) {
    return config.ERRORS.FILE_TOO_LARGE;
  }
  if (file.fileSize === 0) return config.ERRORS.CORRUPT_IMAGE;
  return null;
};

const analyzeImage = async (imageFile: any, retryCount = 0): Promise<any> => {
  const validationError = validateImageFile(imageFile);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append('file', {
    uri: imageFile.uri,
    type: imageFile.type,
    name: imageFile.fileName || 'image.jpg',
  } as any);

  const url = `${config.API_BASE_URL}${config.ENDPOINTS.ANALYZE}`;
  
  try {
    console.log(`🚀 Attempting image analysis (attempt ${retryCount + 1}/${config.UI.MAX_RETRIES + 1})`);
    
    const response = await axios.post(url, formData, {
      timeout: config.UI.LOADING_TIMEOUT,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: function (status) {
        return status < 500;
      }
    });

    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Analysis successful');
      return response.data;
    } else if (response.status === 400) {
      const errorData = response.data;
      throw new Error(errorData.reason || errorData.message || config.ERRORS.INVALID_IMAGE);
    } else {
      throw new Error(`Server error (${response.status}): ${response.data?.message || 'Unknown error'}`);
    }

  } catch (error: any) {
    console.error(`❌ Analysis attempt ${retryCount + 1} failed:`, error.message);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 400) {
        if (errorData && errorData.reason) {
          if (errorData.reason.toLowerCase().includes('animal')) {
            throw new Error(config.ERRORS.ANIMAL_DETECTED);
          } else if (errorData.reason.toLowerCase().includes('face')) {
            throw new Error(config.ERRORS.NO_FACE_DETECTED);
          } else {
            throw new Error(errorData.reason);
          }
        }
        throw new Error(config.ERRORS.INVALID_IMAGE);
      } else if (status >= 500) {
        if (retryCount < config.UI.MAX_RETRIES) {
          console.log(`🔄 Service cascade error (500), retrying in ${config.UI.RETRY_DELAY}ms...`);
          await sleep(config.UI.RETRY_DELAY);
          return analyzeImage(imageFile, retryCount + 1);
        }
        throw new Error('The autism analysis service is experiencing issues. Please try again in a few minutes.');
      }
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      if (retryCount < config.UI.MAX_RETRIES) {
        console.log(`⏰ Timeout, retrying in ${config.UI.RETRY_DELAY}ms...`);
        await sleep(config.UI.RETRY_DELAY);
        return analyzeImage(imageFile, retryCount + 1);
      }
      throw new Error('Services are taking longer than expected. Please try again.');
    }
    
    throw new Error(error.message || config.ERRORS.ANALYSIS_ERROR);
  }
};

const callAutismApiDirectly = async (imageFile: any): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: imageFile.uri,
      type: imageFile.type,
      name: imageFile.fileName || 'image.jpg',
    } as any);
    
    console.log('🧠 Calling autism API directly...');
    
    const response = await axios.post(
      'https://autism-detection-backend-667306373563.europe-west1.run.app/predict/',
      formData,
      {
        timeout: 120000,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: function (status) {
          return status < 500;
        }
      }
    );

    if (response.status === 200) {
      console.log('✅ Autism API direct call successful');
      
      if (response.data.annotated_image_path) {
        const autismImageUrl = `https://autism-detection-backend-667306373563.europe-west1.run.app${response.data.annotated_image_path}`;
        response.data.annotated_image_url = autismImageUrl;
        console.log('🔗 Autism image URL:', autismImageUrl);
      }
      
      return response.data;
    } else {
      throw new Error(`Autism API returned status ${response.status}`);
    }
    
  } catch (error: any) {
    console.error('❌ Direct autism API call failed:', error);
    throw new Error(`Autism detection failed: ${error.message}`);
  }
};

const extractAnalysisData = (response: any) => {
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
  } else if (response.age_analysis_data?.age_check_summary) {
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

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const getConfidenceColor = (confidence: number): string => {
  if (typeof confidence !== 'number' || isNaN(confidence)) {
    return config.RESULTS.CHIP_COLORS.LOW;
  }

  const normalizedConfidence = confidence > 1 ? confidence : confidence * 100;
  
  if (normalizedConfidence >= config.RESULTS.CONFIDENCE_THRESHOLDS.HIGH) {
    return config.RESULTS.CHIP_COLORS.HIGH;
  } else if (normalizedConfidence >= config.RESULTS.CONFIDENCE_THRESHOLDS.MEDIUM) {
    return config.RESULTS.CHIP_COLORS.MEDIUM;
  } else {
    return config.RESULTS.CHIP_COLORS.LOW;
  }
};

const showAlert = (title: string, message: string) => {
  Alert.alert(title, message, [{ text: 'OK' }]);
};

// Main App Component
export default function AutismDetectionApp() {
  const [selectedImage, setSelectedImage] = useState<Asset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState('idle');
  const [pipelineData, setPipelineData] = useState<any>(null);

  // Age and autism data
  const [ageAnalysis, setAgeAnalysis] = useState<any>({});
  const [autismAnalysis, setAutismAnalysis] = useState<any>({});
  const [ageAnnotatedImageUrl, setAgeAnnotatedImageUrl] = useState<string | null>(null);
  const [autismAnnotatedImageUrl, setAutismAnnotatedImageUrl] = useState<string | null>(null);
  const [directAutismResults, setDirectAutismResults] = useState<any>(null);

  const ensurePermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;

    const storagePerm = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

    const camOk = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    const storOk = await PermissionsAndroid.check(storagePerm);

    if (camOk && storOk) return true;

    const camRes = camOk
      ? PermissionsAndroid.RESULTS.GRANTED
      : await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA);

    const storRes = storOk
      ? PermissionsAndroid.RESULTS.GRANTED
      : await PermissionsAndroid.request(storagePerm);

    if (camRes === PermissionsAndroid.RESULTS.GRANTED && storRes === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    Alert.alert(
      'Permissions Required',
      'Camera and storage access are needed to pick or capture images.',
      [{ text: 'OK' }]
    );
    return false;
  };

  const handleImageSelect = async () => {
    if (!(await ensurePermissions())) return;

    const options: ImageLibraryOptions = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel || response.errorCode) return;

      if (response.assets?.length) {
        setSelectedImage(response.assets[0]);
        resetStateExceptImage();
        showAlert('Success', `Image selected: ${response.assets[0].fileName || 'image'} (${formatFileSize(response.assets[0].fileSize || 0)})`);
      }
    });
  };

  const captureImage = async () => {
    if (!(await ensurePermissions())) return;

    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      saveToPhotos: true,
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchCamera(options, (response) => {
      if (response.didCancel || response.errorCode) return;

      if (response.assets?.length) {
        setSelectedImage(response.assets[0]);
        resetStateExceptImage();
        showAlert('Success', 'Image captured successfully!');
      }
    });
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

  const handleAnalyze = async () => {
    if (!selectedImage) {
      showAlert('No Image', 'Please select or capture an image first');
      return;
    }

    setIsProcessing(true);
    resetStateExceptImage();
    setAnalysisStatus('processing');

    try {
      console.log('🚀 Starting image analysis...');
      
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
      
      if (annotatedAgeUrl) {
        console.log('🖼️ Setting age annotated image:', annotatedAgeUrl);
        setAgeAnnotatedImageUrl(annotatedAgeUrl);
      }
      
      if (ageSummary) setAgeAnalysis(ageSummary);

      const kidsPresent = ageSummary && ageSummary.kids_count > 0;
      const faceValidated = response.valid && response.status === 'face_validated_and_processed';
      
      if (kidsPresent && faceValidated) {
        console.log('✅ Child detected and face validated - calling direct autism API');
        setAnalysisStatus('processing_autism');
        showAlert('Processing', 'Child detected. Running autism analysis...');

        try {
          const directResults = await callAutismApiDirectly(selectedImage);
          
          if (directResults && directResults.results) {
            console.log('✅ Direct autism API successful');
            setDirectAutismResults(directResults);
            setResults(directResults.results);
            
            if (directResults.annotated_image_url) {
              setAutismAnnotatedImageUrl(directResults.annotated_image_url);
            } else if (directResults.annotated_image_path) {
              const fullUrl = directResults.annotated_image_path.startsWith('http')
                ? directResults.annotated_image_path
                : `https://autism-detection-backend-667306373563.europe-west1.run.app${directResults.annotated_image_path}`;
              setAutismAnnotatedImageUrl(fullUrl);
            }
            
            setAnalysisStatus('child_autism_screened');
            showAlert('Success', 'Autism analysis completed successfully!');
          } else {
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
        } catch (directError: any) {
          console.error('❌ Direct autism API failed:', directError);
          
          if (autismResults && autismResults.length > 0) {
            setResults(autismResults);
            if (initialAutismImage) {
              setAutismAnnotatedImageUrl(initialAutismImage);
            }
            setAnalysisStatus('child_autism_screened');
            showAlert('Info', 'Autism analysis completed using pipeline results.');
          } else {
            setAnalysisStatus('autism_failed');
            setResults([]);
            showAlert('Error', 'Autism analysis failed. Please try again.');
          }
        }
      } else if (ageSummary && ageSummary.adults_count > 0) {
        setAnalysisStatus('adult_invalid');
        setResults([{
          summary: `Adults detected: ${ageSummary.adults_count}, Kids: ${ageSummary.kids_count}`,
          status: 'Autism analysis blocked - only available for children under 18'
        }]);
        showAlert('Adult Detected', 'Adult detected (18+). Autism analysis only for children.');
      } else {
        setAnalysisStatus('unclear_age');
        setResults([{
          summary: !faceValidated ? 'Face validation failed' : 'Age classification unclear',
          details: 'Try again with a clearer image showing a human face.'
        }]);
        showAlert('Warning', !faceValidated ? 'Face validation failed.' : 'Age unclear. Please try with a better image.');
      }

    } catch (err: any) {
      console.error('❌ Analysis error:', err);
      setError(err.message || 'Analysis failed');
      setAnalysisStatus('error');
      showAlert('Error', err.message || 'Analysis failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    resetStateExceptImage();
    showAlert('Reset', 'All data cleared successfully');
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

  const getStatusColor = () => {
    switch (analysisStatus) {
      case 'child_autism_screened':
        return config.COLORS.SUCCESS;
      case 'adult_invalid':
        return config.COLORS.WARNING;
      case 'rejected_animal':
      case 'rejected_no_face':
      case 'error':
      case 'autism_failed':
        return config.COLORS.ERROR;
      default:
        return config.COLORS.INFO;
    }
  };

  const ConfidenceLevel = ({ confidence }: { confidence: number }) => {
    const confidenceColor = getConfidenceColor(confidence);
    
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      return (
        <Text style={[styles.confidenceText, { color: '#64748b' }]}>
          N/A
        </Text>
      );
    }

    return (
      <Text style={[styles.confidenceText, { 
        color: confidenceColor === 'success' ? config.COLORS.SUCCESS :
               confidenceColor === 'warning' ? config.COLORS.WARNING :
               config.COLORS.ERROR 
      }]}>
        {confidence.toFixed(1)}%
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={config.COLORS.DARK_BACKGROUND} />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AI AUTISM DETECTION</Text>
          <Text style={styles.subtitle}>Advanced AI-powered autism screening</Text>
        </View>

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <TouchableOpacity style={styles.uploadButton} onPress={handleImageSelect}>
            <Icon name="folder" size={20} color={config.COLORS.WHITE} />
            <Text style={styles.uploadButtonText}>📁 Pick from Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
            <Icon name="camera-alt" size={20} color={config.COLORS.WHITE} />
            <Text style={styles.captureButtonText}>📷 Capture with Camera</Text>
          </TouchableOpacity>

          {selectedImage && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              <Text style={styles.imageInfo}>
                {selectedImage.fileName || 'Captured Image'}
                {selectedImage.fileSize && ` (${formatFileSize(selectedImage.fileSize)})`}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isProcessing ? (
            <View style={[styles.analyzeButton, styles.disabledButton]}>
              <ActivityIndicator size="small" color={config.COLORS.WHITE} />
            </View>
          ) : (
            <TouchableOpacity 
              style={[styles.analyzeButton, !selectedImage && styles.disabledButton]} 
              onPress={handleAnalyze}
              disabled={!selectedImage || isProcessing}
            >
              <Icon name="psychology" size={20} color={config.COLORS.WHITE} />
              <Text style={styles.analyzeButtonText}>🧠 Analyze</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.resetButton} 
            onPress={handleReset}
            disabled={isProcessing}
          >
            <Icon name="refresh" size={20} color={config.COLORS.WHITE} />
            <Text style={styles.resetButtonText}>🔄 Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Results Section */}
        <View style={styles.resultsSection}>
          <Text style={styles.resultsTitle}>📊 Analysis Results</Text>

          {/* Status Message */}
          <View style={[styles.statusCard, { borderLeftColor: getStatusColor() }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusMessage()}
            </Text>
          </View>

          {/* Loading Indicator */}
          {isProcessing && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={config.COLORS.PRIMARY} />
              <Text style={styles.loadingText}>
                {analysisStatus === 'processing_autism' ? 'Processing autism analysis...' : 'Processing image...'}
              </Text>
              <Text style={styles.loadingSubtext}>
                {analysisStatus === 'processing_autism' ?
                  'Analyzing facial features for autism indicators...' :
                  'Face detection → Age classification → Autism analysis'}
              </Text>
            </View>
          )}

          {/* Result Images */}
          {!isProcessing && (() => {
            if (analysisStatus === 'child_autism_screened' && autismAnnotatedImageUrl) {
              return (
                <View style={styles.resultImageContainer}>
                  <Text style={[styles.imageLabel, { color: config.COLORS.SUCCESS }]}>
                    ✅ Complete Analysis - Autism Detection Result
                  </Text>
                  <Image
                    source={{ uri: autismAnnotatedImageUrl }}
                    style={[styles.resultImage, { borderColor: config.COLORS.SUCCESS }]}
                  />
                  <Text style={[styles.imageCaption, { color: config.COLORS.SUCCESS }]}>
                    Final result: Autism detection with facial region analysis
                  </Text>
                </View>
              );
            }

            if (ageAnnotatedImageUrl) {
              const borderColor = analysisStatus === 'adult_invalid' ? config.COLORS.WARNING : config.COLORS.PRIMARY;
              const statusText = analysisStatus === 'adult_invalid' ? 'Adult Detected - Autism Blocked' : 'Age Classification Complete';
              
              return (
                <View style={styles.resultImageContainer}>
                  <Text style={[styles.imageLabel, { color: borderColor }]}>
                    {analysisStatus === 'adult_invalid' ? '🔞' : '👥'} {statusText}
                  </Text>
                  <Image
                    source={{ uri: ageAnnotatedImageUrl }}
                    style={[styles.resultImage, { borderColor }]}
                  />
                  <Text style={[styles.imageCaption, { color: borderColor }]}>
                    {analysisStatus === 'adult_invalid' ?
                      'Adults detected - autism analysis not performed' :
                      'Age analysis complete'}
                  </Text>
                </View>
              );
            }

            return null;
          })()}

          {/* Detailed Results */}
          {!isProcessing && results && Array.isArray(results) && results.length > 0 && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Detailed Results:</Text>
              <View style={styles.detailsCard}>
                {results.map((result: any, idx: number) => (
                  <View key={idx} style={styles.resultItem}>
                    {result.region && (
                      <Text style={styles.resultText}>
                        <Text style={styles.boldText}>{result.region}:</Text> {result.label}
                        {result.confidence && (
                          <View style={styles.inlineConfidence}>
                            <ConfidenceLevel confidence={result.confidence} />
                          </View>
                        )}
                      </Text>
                    )}
                    {result.final_decision && (
                      <Text style={[styles.resultText, styles.finalDecision]}>
                        <Text style={styles.boldText}>Final Decision:</Text> {result.final_decision}
                      </Text>
                    )}
                    {result.summary && (
                      <Text style={styles.resultText}>
                        <Text style={styles.boldText}>Summary:</Text> {result.summary}
                      </Text>
                    )}
                    {result.status && (
                      <Text style={styles.resultText}>
                        {result.status}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Age Analysis Summary */}
          {ageAnalysis.has_faces && (
            <View style={styles.ageAnalysisContainer}>
              <Text style={styles.ageAnalysisTitle}>Age Analysis Summary</Text>
              <View style={styles.ageAnalysisCard}>
                <Text style={styles.ageAnalysisText}>
                  Total Faces: {(ageAnalysis.kids_count || 0) + (ageAnalysis.adults_count || 0)}{'\n'}
                  Kids (≤18): {ageAnalysis.kids_count || 0}{'\n'}
                  Adults (18+): {ageAnalysis.adults_count || 0}
                </Text>
                {ageAnalysis.annotations && ageAnalysis.annotations.length > 0 && (
                  <Text style={styles.detectedAges}>
                    Detected ages: {ageAnalysis.annotations.map((ann: any) => ann.age).join(', ')}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Developed by {config.APP.DEVELOPER}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: config.COLORS.DARK_BACKGROUND,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: config.COLORS.WHITE,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
  },
  uploadSection: {
    marginBottom: 30,
  },
  uploadButton: {
    backgroundColor: config.COLORS.PRIMARY,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  uploadButtonText: {
    color: config.COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  captureButton: {
    borderColor: config.COLORS.WHITE,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  captureButtonText: {
    color: config.COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreview: {
    width: width - 60,
    height: 250,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  imageInfo: {
    color: '#B0BEC5',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 30,
  },
  analyzeButton: {
    backgroundColor: config.COLORS.SUCCESS,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: '#666',
  },
  analyzeButtonText: {
    color: config.COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderColor: config.COLORS.WHITE,
    borderWidth: 2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: config.COLORS.WHITE,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  resultsSection: {
    marginBottom: 30,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: config.COLORS.WHITE,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: config.COLORS.WHITE,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: config.COLORS.WHITE,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  loadingSubtext: {
    color: '#B0BEC5',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  resultImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultImage: {
    width: width - 60,
    height: 300,
    borderRadius: 12,
    borderWidth: 3,
  },
  imageCaption: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: config.COLORS.WHITE,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  resultItem: {
    marginBottom: 12,
  },
  resultText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  boldText: {
    fontWeight: 'bold',
  },
  finalDecision: {
    color: config.COLORS.PRIMARY,
    fontWeight: '600',
    marginTop: 8,
  },
  inlineConfidence: {
    marginLeft: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ageAnalysisContainer: {
    marginBottom: 20,
  },
  ageAnalysisTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: config.COLORS.WHITE,
    marginBottom: 8,
  },
  ageAnalysisCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
  },
  ageAnalysisText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  detectedAges: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#B0BEC5',
    fontSize: 12,
  },
});
