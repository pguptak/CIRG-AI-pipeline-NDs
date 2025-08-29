// config.js - CORRECTED VERSION
const config = {
  // Backend API Base URL - Animal Filter API as entry point
  API_BASE_URL: process.env.REACT_APP_API_URL || 'https://animal-human-filter-667306373563.europe-west2.run.app',
  // API Endpoints - FIXED TO MATCH YOUR WORKING API
  ENDPOINTS: {
    ANALYZE: '/filter_face/',  // ✅ CORRECTED: This is your working endpoint
    HEALTH: '/health',
    KEEPALIVE: '/keepalive',
  },
  // Upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024,  // 10 MB limit
    ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ACCEPT: 'image/*',
  },
  // UI and Animation Tweaks - Optimized for your service cascade
  UI: {
    ANIMATION_DURATION: 300,
    LOADING_TIMEOUT: 300000,     // 5 minutes for severe cold start cascade
    AUTO_REFRESH_INTERVAL: 5000,
    COLD_START_WARNING_TIME: 15000, // Show warning after 15 seconds
    RETRY_DELAY: 12000, // 12 seconds between retries
    MAX_RETRIES: 2, // Limit retries to prevent endless loops
  },
  // Cold start messages
  COLD_START: {
    AGE_SERVICE: 'Age classification service is waking up (Render free tier)...',
    AUTISM_SERVICE: 'Autism analysis service is initializing (Google Cloud Run)...',
    GENERAL_WARNING: 'Free tier services may take 2-3 minutes to wake up from sleep.',
    SERVICE_CASCADE: 'Multiple AI services are starting up. This can take 2-3 minutes on free tier hosting.',
  },
  // Model Results & Display Config
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
  // Enhanced error messages for your specific service architecture
  ERRORS: {
    NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
    UPLOAD_ERROR: 'Failed to upload image. Please try again.',
    ANALYSIS_ERROR: 'Failed to analyze image. Please try again.',
    FILE_TOO_LARGE: 'File size is too large. Please select an image under 10MB.',
    INVALID_FILE_TYPE: 'Invalid file type. Please select a valid image file (JPG, PNG, GIF, WebP).',
    BACKEND_ERROR: 'Backend service is currently unavailable. Please try again later.',
    TIMEOUT_ERROR: 'Analysis timed out. This often happens when services are waking up from sleep. Please try again.',
    ANIMAL_DETECTED: 'Animal face detected. Please upload a photo containing only human faces.',
    NO_FACE_DETECTED: 'No human face detected. Please ensure a clear human face is visible.',
    ADULT_ONLY: 'Only adults detected. Autism analysis is only available for children under 18.',
    INVALID_IMAGE: 'Invalid image. Please upload a clear photo of a human face.',
    SERVER_OVERLOAD: 'Server is currently overloaded. Please try again in a few moments.',
    RATE_LIMIT: 'Too many requests. Please wait a moment before trying again.',
    CORRUPT_IMAGE: 'Image appears to be corrupted. Please try uploading a different image.',
    UNSUPPORTED_FORMAT: 'Image format not supported. Please use JPG, PNG, GIF, or WebP.',
    SERVICE_CASCADE_ERROR: 'Multiple AI services are starting up simultaneously. This can take 2-3 minutes on free tier hosting.',
    AUTISM_SERVICE_ERROR: 'The autism detection service is currently unavailable. This often happens during cold starts.',
  },
  // Success messages
  SUCCESS: {
    UPLOAD_SUCCESS: 'Image uploaded successfully!',
    ANALYSIS_SUCCESS: 'Analysis completed successfully!',
    CHILD_DETECTED: 'Child detected. Autism analysis performed.',
    RETRY_SUCCESS: 'Analysis completed after retry.',
  },
  // Updated to match your main API base URL
  AGE_API_BASE_URL: process.env.REACT_APP_API_URL || 'https://animal-human-filter-667306373563.europe-west2.run.app',
};
export default config;
