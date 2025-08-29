// src/utils/api.js
import axios from 'axios';
import config from '../config';

/**
 * Analyze an image through the pipeline with comprehensive error handling and larger error messages
 * @param {File} imageFile - The image file to be analyzed
 * @param {number} retryCount - Current retry attempt
 * @returns {Promise} - Promise that resolves with API response data
 */
export async function analyzeImage(imageFile, retryCount = 0) {
  // Validate file before sending
  const validationError = validateImageFile(imageFile);
  if (validationError) {
    throw new Error(validationError);
  }

  const formData = new FormData();
  formData.append('file', imageFile);
  const url = `${config.API_BASE_URL}${config.ENDPOINTS.ANALYZE}`;

  try {
    console.log(`🚀 Attempting image analysis (attempt ${retryCount + 1}/${config.UI.MAX_RETRIES + 1})`);
    
    const response = await axios.post(url, formData, {
      timeout: config.UI.LOADING_TIMEOUT, // 5 minutes for cold start cascade
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      validateStatus: function (status) {
        return status < 500; // Resolve only if status is less than 500
      }
    });

    // Handle different HTTP status codes
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Analysis successful');
      return response.data;
    } else if (response.status === 400) {
      // Handle 400 errors (Animal Filter API rejections)
      const errorData = response.data;
      const errorMessage = getDetailedErrorMessage(errorData, 400);
      throw new Error(errorMessage);
    } else if (response.status === 413) {
      throw new Error(config.ERRORS.FILE_TOO_LARGE);
    } else if (response.status === 415) {
      throw new Error(config.ERRORS.UNSUPPORTED_FORMAT);
    } else if (response.status === 429) {
      throw new Error(config.ERRORS.RATE_LIMIT);
    } else {
      const errorMessage = `Server Error (${response.status}): ${response.data?.message || response.data?.detail || 'The analysis service is currently experiencing issues'}`;
      throw new Error(errorMessage);
    }

  } catch (error) {
    console.error(`❌ Analysis attempt ${retryCount + 1} failed:`, error.message);
    
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 400) {
        // Animal Filter API rejection - don't retry
        const detailedError = getDetailedErrorMessage(errorData, status);
        throw new Error(detailedError);
      } else if (status === 413) {
        throw new Error(config.ERRORS.FILE_TOO_LARGE);
      } else if (status === 415) {
        throw new Error(config.ERRORS.UNSUPPORTED_FORMAT);
      } else if (status === 429) {
        throw new Error(config.ERRORS.RATE_LIMIT);
      } else if (status >= 500) {
        // Server error - retry if attempts remaining
        if (retryCount < config.UI.MAX_RETRIES) {
          console.log(`🔄 Service cascade error (${status}), retrying in ${config.UI.RETRY_DELAY}ms...`);
          await sleep(config.UI.RETRY_DELAY);
          return analyzeImage(imageFile, retryCount + 1);
        }
        throw new Error('Multiple AI services are experiencing startup issues. This commonly occurs with free-tier hosting when services need to wake up from sleep mode. Please wait 2-3 minutes and try again.');
      } else {
        throw new Error(getDetailedErrorMessage(errorData, status));
      }
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // Timeout error - retry if attempts remaining
      if (retryCount < config.UI.MAX_RETRIES) {
        console.log(`⏰ Timeout after ${config.UI.LOADING_TIMEOUT}ms, retrying in ${config.UI.RETRY_DELAY}ms...`);
        await sleep(config.UI.RETRY_DELAY);
        return analyzeImage(imageFile, retryCount + 1);
      }
      throw new Error('Analysis timeout exceeded. The AI services may be initializing from a cold start. This can take 2-5 minutes on free hosting. Please try again shortly.');
    } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    } else {
      // Unknown error - provide helpful message
      throw new Error(error.message || 'An unexpected error occurred during analysis. Please try again with a different image.');
    }
  }
}

/**
 * Get detailed error messages for better user experience
 * @param {Object} errorData - Error response data
 * @param {number} status - HTTP status code
 * @returns {string} - Detailed error message
 */
function getDetailedErrorMessage(errorData, status) {
  if (!errorData) {
    return `HTTP ${status}: Service unavailable. Please try again.`;
  }

  const reason = errorData.reason || errorData.message || errorData.detail || errorData.error;
  
  if (reason) {
    if (reason.toLowerCase().includes('animal')) {
      return 'Animal face detected in the image. This system only analyzes human faces. Please upload a photo containing only human subjects.';
    } else if (reason.toLowerCase().includes('face') || reason.toLowerCase().includes('no human')) {
      return 'No valid human face detected in the image. Please ensure the photo contains a clear, front-facing human face with good lighting.';
    } else if (reason.toLowerCase().includes('multiple') || reason.toLowerCase().includes('many')) {
      return 'Multiple faces detected. Please upload an image with only one person for accurate analysis.';
    } else if (reason.toLowerCase().includes('blurry') || reason.toLowerCase().includes('quality')) {
      return 'Image quality is too low for analysis. Please upload a clearer, higher-resolution image.';
    } else if (reason.toLowerCase().includes('dark') || reason.toLowerCase().includes('lighting')) {
      return 'Poor lighting detected. Please upload an image with better lighting where the face is clearly visible.';
    } else {
      return reason;
    }
  }

  // Fallback messages based on status
  switch (status) {
    case 400:
      return 'Invalid image format or content. Please upload a clear photo of a human face.';
    case 401:
      return 'Authentication failed. Please refresh the page and try again.';
    case 403:
      return 'Access denied. You may not have permission to use this service.';
    case 404:
      return 'Analysis service not found. The service may be temporarily unavailable.';
    case 408:
      return 'Request timeout. The service took too long to respond.';
    case 422:
      return 'Invalid image data. Please ensure the file is a valid image format.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    case 500:
      return 'Internal server error. The analysis service is experiencing technical difficulties.';
    case 502:
      return 'Service gateway error. The analysis service is temporarily unavailable.';
    case 503:
      return 'Service unavailable. The analysis service may be undergoing maintenance.';
    case 504:
      return 'Gateway timeout. The analysis service is taking longer than expected to respond.';
    default:
      return `Service error (${status}). Please try again or contact support if the problem persists.`;
  }
}

/**
 * Call autism detection API directly from frontend with enhanced error handling
 * @param {File} imageFile - The image file to analyze
 * @returns {Promise} - Promise with autism detection results
 */
export async function callAutismApiDirectly(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    console.log('🧠 Calling autism API directly from frontend...');
    
    const response = await axios.post(
      'https://autism-detection-backend-667306373563.europe-west1.run.app/predict/',
      formData,
      {
        timeout: 180000, // 3 minutes for autism analysis
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
      
      // Construct full URL for autism annotated image
      if (response.data.annotated_image_path) {
        const autismImageUrl = `https://autism-detection-backend-667306373563.europe-west1.run.app${response.data.annotated_image_path}`;
        response.data.annotated_image_url = autismImageUrl;
        console.log('🔗 Autism image URL:', autismImageUrl);
      }
      
      return response.data;
    } else if (response.status === 400) {
      throw new Error('Invalid image for autism analysis. Please ensure the image contains a clear human face.');
    } else if (response.status === 422) {
      throw new Error('Autism analysis failed. The image may not contain detectable facial features required for screening.');
    } else {
      throw new Error(`Autism analysis service returned error ${response.status}. Please try again.`);
    }
    
  } catch (error) {
    console.error('❌ Direct autism API call failed:', error);
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Autism analysis timeout. The AI model is processing complex facial features. Please try again.');
    } else if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error during autism analysis. Please check your connection and try again.');
    } else if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 400) {
        throw new Error('Invalid image for autism analysis. Please upload a clear photo of a child\'s face.');
      } else if (status === 422) {
        throw new Error('Autism screening failed. The image may not meet the requirements for facial feature analysis.');
      } else if (status >= 500) {
        throw new Error('Autism analysis service is temporarily unavailable. This often happens during cold starts. Please try again in 1-2 minutes.');
      } else {
        throw new Error(`Autism analysis error: ${errorData?.message || errorData?.detail || 'Service temporarily unavailable'}`);
      }
    } else {
      throw new Error(`Autism analysis failed: ${error.message || 'Unknown error occurred'}`);
    }
  }
}

/**
 * Validate image file before upload with detailed error messages
 * @param {File} file - Image file to validate
 * @returns {string|null} - Detailed error message or null if valid
 */
function validateImageFile(file) {
  if (!file) {
    return 'No image file selected. Please choose an image to analyze.';
  }
  
  if (file.size === 0) {
    return 'The selected file is empty or corrupted. Please choose a different image.';
  }
  
  if (file.size > config.UPLOAD.MAX_FILE_SIZE) {
    return `File size (${formatFileSize(file.size)}) exceeds the maximum limit of ${formatFileSize(config.UPLOAD.MAX_FILE_SIZE)}. Please compress your image or choose a smaller file.`;
  }
  
  if (!config.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
    return `File type '${file.type}' is not supported. Please upload a valid image file: JPG, PNG, GIF, or WebP.`;
  }
  
  // Check for minimum file size (very small files might be corrupted)
  if (file.size < 1024) { // Less than 1KB
    return 'The image file is too small and may be corrupted. Please upload a larger, clearer image.';
  }
  
  // Check file extension matches MIME type
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  if (fileExtension && !validExtensions.includes(fileExtension)) {
    return `File extension '.${fileExtension}' doesn't match supported formats. Please use: .jpg, .png, .gif, or .webp`;
  }
  
  return null;
}

/**
 * Sleep utility for retries
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build full image URL from relative path with enhanced routing for direct service calls
 * @param {string} url - Relative or absolute URL
 * @returns {string|null} - Full URL or null if invalid
 */
export function getFullImageUrl(url) {
  try {
    if (!url || typeof url !== 'string') {
      console.warn('❌ Invalid URL provided:', url);
      return null;
    }
    
    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('✅ Full URL detected:', url);
      return url;
    }
    
    // Route based on path with enhanced logic
    let base;
    
    if (url.includes('autism') || url.startsWith('/annotated/') || url.includes('predict')) {
      // Direct autism service URL
      base = 'https://autism-detection-backend-667306373563.europe-west1.run.app';
      console.log('🧠 Routing to autism service:', url);
    } else if (url.startsWith('/annotated_face/') || url.includes('face')) {
      // Face images from Animal Filter service
      base = 'https://animal-human-filter-667306373563.europe-west2.run.app';
      console.log('👤 Routing to face analysis service:', url);
    } else if (url.startsWith('/annotated_age/') || url.includes('age')) {
      // Age images from Age API
      base = 'https://age-api-667306373563.europe-west1.run.app';
      console.log('📊 Routing to age analysis service:', url);
    } else {
      // Default fallback to main pipeline
      base = 'https://animal-human-filter-667306373563.europe-west2.run.app';
      console.log('🔄 Using main pipeline service for:', url);
    }
    
    // Ensure proper URL construction
    if (base.endsWith('/')) base = base.slice(0, -1);
    if (!url.startsWith('/')) url = '/' + url;
    
    const finalUrl = `${base}${url}`;
    console.log('🔗 Final constructed URL:', finalUrl);
    return finalUrl;
    
  } catch (error) {
    console.error('❌ Error constructing image URL:', error);
    return null;
  }
}

/**
 * Format file size for display with better precision
 * @param {number} bytes - File size in bytes
 * @returns {string} - Human-readable file size
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb * 10) / 10} KB`;
  
  const mb = kb / 1024;
  if (mb < 1024) return `${Math.round(mb * 10) / 10} MB`;
  
  const gb = mb / 1024;
  return `${Math.round(gb * 10) / 10} GB`;
}

/**
 * Determine confidence color based on thresholds with enhanced error handling
 * @param {number} confidence - Confidence value (0–100)
 * @returns {'success'|'warning'|'error'} - Color level for UI
 */
export function getConfidenceColor(confidence) {
  try {
    if (typeof confidence !== 'number' || isNaN(confidence)) {
      console.warn('❌ Invalid confidence value:', confidence);
      return config.RESULTS.CHIP_COLORS.LOW;
    }
    
    // Handle both 0-1 and 0-100 scales
    const normalizedConfidence = confidence > 1 ? confidence : confidence * 100;
    
    if (normalizedConfidence >= config.RESULTS.CONFIDENCE_THRESHOLDS.HIGH) {
      return config.RESULTS.CHIP_COLORS.HIGH; // 'success'
    } else if (normalizedConfidence >= config.RESULTS.CONFIDENCE_THRESHOLDS.MEDIUM) {
      return config.RESULTS.CHIP_COLORS.MEDIUM; // 'warning'
    } else {
      return config.RESULTS.CHIP_COLORS.LOW; // 'error'
    }
  } catch (error) {
    console.error('❌ Error determining confidence color:', error);
    return config.RESULTS.CHIP_COLORS.LOW;
  }
}

/**
 * Download a file from URL with enhanced error handling
 * @param {string} url - The URL of the file
 * @param {string} filename - The name for the downloaded file
 */
export function downloadFile(url, filename) {
  try {
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid download URL provided');
    }
    
    if (!filename || typeof filename !== 'string') {
      filename = 'download';
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ File download initiated:', filename);
  } catch (error) {
    console.error('❌ Download failed:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }
}

/**
 * Check if age indicates adult (18+) with enhanced parsing
 * @param {string|number} ageInput - Age string like "(15-20)" or "25", or number
 * @returns {boolean} - True if adult (18+)
 */
export function checkIfAdult(ageInput) {
  try {
    if (typeof ageInput === 'number') {
      return ageInput >= 18;
    }
    
    if (!ageInput || typeof ageInput !== 'string') {
      console.warn('❌ Invalid age input:', ageInput);
      return false;
    }
    
    // Extract age ranges like "(15-20)", "(25-32)", etc.
    const rangeMatch = ageInput.match(/\(?(\d+)-(\d+)\)?/);
    if (rangeMatch) {
      const minAge = parseInt(rangeMatch[1], 10);
      const maxAge = parseInt(rangeMatch[2], 10);
      // If minimum age is 18 or higher, definitely adult
      // If maximum age is below 18, definitely child
      // If range spans 18, use minimum for conservative approach
      return minAge >= 18;
    }
    
    // Handle single age values with various formats
    const singleAgeMatch = ageInput.match(/(\d+)/);
    if (singleAgeMatch) {
      const age = parseInt(singleAgeMatch[1], 10);
      return !isNaN(age) && age >= 18;
    }
    
    console.warn('❌ Could not parse age:', ageInput);
    return false;
  } catch (error) {
    console.error('❌ Error checking age:', error);
    return false;
  }
}

/**
 * Extract age information from analysis response
 * @param {Object} analysisData - The analysis response data
 * @returns {Object} - Extracted age information
 */
export function extractAgeInfo(analysisData) {
  try {
    if (!analysisData) return { hasAgeData: false };
    
    // Try to find age data in various possible locations
    const ageData = analysisData.age_analysis_data?.age_check_summary ||
                   analysisData.age_check_summary ||
                   analysisData.age_data;
    
    if (!ageData) {
      return { hasAgeData: false };
    }
    
    return {
      hasAgeData: true,
      kidsCount: ageData.kids_count || 0,
      adultsCount: ageData.adults_count || 0,
      totalFaces: (ageData.kids_count || 0) + (ageData.adults_count || 0),
      hasFaces: ageData.has_faces || false,
      annotations: ageData.annotations || [],
      annotatedImageUrl: ageData.annotated_image_url || null
    };
  } catch (error) {
    console.error('❌ Error extracting age info:', error);
    return { hasAgeData: false };
  }
}

/**
 * Check if the analysis indicates a child is present
 * @param {Object} analysisData - The analysis response data
 * @returns {boolean} - True if child detected
 */
export function isChildDetected(analysisData) {
  try {
    const ageInfo = extractAgeInfo(analysisData);
    return ageInfo.hasAgeData && ageInfo.kidsCount > 0;
  } catch (error) {
    console.error('❌ Error checking for child:', error);
    return false;
  }
}

/**
 * Generate user-friendly error summary
 * @param {string} errorMessage - The error message
 * @returns {Object} - Error summary with title and suggestion
 */
export function getErrorSummary(errorMessage) {
  if (!errorMessage) {
    return {
      title: 'Unknown Error',
      message: 'An unexpected error occurred',
      suggestion: 'Please try again'
    };
  }
  
  const msg = errorMessage.toLowerCase();
  
  if (msg.includes('animal')) {
    return {
      title: 'Animal Detected',
      message: 'Animal face found in image',
      suggestion: 'Please upload a photo with only human faces'
    };
  } else if (msg.includes('no') && (msg.includes('face') || msg.includes('human'))) {
    return {
      title: 'No Face Detected',
      message: 'No valid human face found',
      suggestion: 'Ensure the photo shows a clear human face with good lighting'
    };
  } else if (msg.includes('multiple') || msg.includes('many')) {
    return {
      title: 'Multiple Faces',
      message: 'Multiple faces detected',
      suggestion: 'Please upload an image with only one person'
    };
  } else if (msg.includes('timeout') || msg.includes('cold start')) {
    return {
      title: 'Service Timeout',
      message: 'AI services are starting up',
      suggestion: 'Please wait 2-3 minutes and try again'
    };
  } else if (msg.includes('network') || msg.includes('connection')) {
    return {
      title: 'Network Error',
      message: 'Connection failed',
      suggestion: 'Check your internet connection and try again'
    };
  } else if (msg.includes('file') && (msg.includes('large') || msg.includes('size'))) {
    return {
      title: 'File Too Large',
      message: 'Image file exceeds size limit',
      suggestion: 'Please compress your image or choose a smaller file'
    };
  } else {
    return {
      title: 'Analysis Failed',
      message: errorMessage,
      suggestion: 'Please try again with a different image'
    };
  }
}

export default {
  analyzeImage,
  callAutismApiDirectly,
  getFullImageUrl,
  formatFileSize,
  getConfidenceColor,
  downloadFile,
  checkIfAdult,
  extractAgeInfo,
  isChildDetected,
  getErrorSummary
};
