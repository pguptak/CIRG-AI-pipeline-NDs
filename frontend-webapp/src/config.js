// Configuration file for Autism Detection App

const config = {
  // Backend API URL - Replace with ngrok or Render backend
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://autism-detection2-667306373563.europe-west1.run.app',
  
  // API endpoints
  ENDPOINTS: {
    ANALYZE: '/predict/',  // ✅ correct

    HEALTH: '/health',
  },
  
  
  // File upload settings
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    ACCEPT: 'image/*',
  },
  
  // UI settings
  UI: {
    ANIMATION_DURATION: 300,
    LOADING_TIMEOUT: 30000, // 30 seconds
    AUTO_REFRESH_INTERVAL: 5000, // 5 seconds
  },
  
  // Results display settings
  RESULTS: {
    CONFIDENCE_THRESHOLDS: {
      HIGH: 0.7,
      MEDIUM: 0.4,
      LOW: 0.0,
    },
    CHIP_COLORS: {
      HIGH: 'success',
      MEDIUM: 'warning',
      LOW: 'error',
    },
  },
  
  // Error messages
  ERRORS: {
    NETWORK_ERROR: 'Network error. Please check your connection and try again.',
    UPLOAD_ERROR: 'Failed to upload image. Please try again.',
    ANALYSIS_ERROR: 'Failed to analyze image. Please try again.',
    FILE_TOO_LARGE: 'File size is too large. Please select an image under 10MB.',
    INVALID_FILE_TYPE: 'Invalid file type. Please select a valid image file.',
    BACKEND_ERROR: 'Backend service is currently unavailable. Please try again later.',
  },
  
  // Success messages
  SUCCESS: {
    UPLOAD_SUCCESS: 'Image uploaded successfully!',
    ANALYSIS_SUCCESS: 'Analysis completed successfully!',
  },
};

export default config;
