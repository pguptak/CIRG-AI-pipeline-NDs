// src/utils/api.js

import axios from 'axios';
import config from '../config';

/**
 * Analyze an image through the pipeline with comprehensive error handling
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
      timeout: config.UI.LOADING_TIMEOUT, // 4 minutes for cold start cascade
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
      throw new Error(errorData.reason || errorData.message || config.ERRORS.INVALID_IMAGE);
    } else if (response.status === 413) {
      throw new Error(config.ERRORS.FILE_TOO_LARGE);
    } else if (response.status === 415) {
      throw new Error(config.ERRORS.UNSUPPORTED_FORMAT);
    } else if (response.status === 429) {
      throw new Error(config.ERRORS.RATE_LIMIT);
    } else {
      throw new Error(`Server error (${response.status}): ${response.data?.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error(`❌ Analysis attempt ${retryCount + 1} failed:`, error.message);

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const errorData = error.response.data;

      if (status === 400) {
        // Animal Filter API rejection - don't retry
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
      } else if (status === 413) {
        throw new Error(config.ERRORS.FILE_TOO_LARGE);
      } else if (status === 415) {
        throw new Error(config.ERRORS.UNSUPPORTED_FORMAT);
      } else if (status === 429) {
        throw new Error(config.ERRORS.RATE_LIMIT);
      } else if (status >= 500) {
        // Server error - retry if attempts remaining
        if (retryCount < config.UI.MAX_RETRIES) {
          console.log(`🔄 Service cascade error (500), retrying in ${config.UI.RETRY_DELAY}ms...`);
          await sleep(config.UI.RETRY_DELAY);
          return analyzeImage(imageFile, retryCount + 1);
        }
        throw new Error('The autism analysis service is experiencing issues. This often happens when multiple services need to wake up simultaneously. Please try again in a few minutes.');
      } else {
        throw new Error(errorData?.detail || errorData?.message || config.ERRORS.ANALYSIS_ERROR);
      }
    } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      // Timeout error - retry if attempts remaining
      if (retryCount < config.UI.MAX_RETRIES) {
        console.log(`⏰ Timeout after ${config.UI.LOADING_TIMEOUT}ms, retrying in ${config.UI.RETRY_DELAY}ms...`);
        await sleep(config.UI.RETRY_DELAY);
        return analyzeImage(imageFile, retryCount + 1);
      }
      throw new Error('Services are taking longer than expected. The age and autism detection services may be waking up from sleep. Please try again.');
    } else if (error.code === 'ERR_NETWORK') {
      throw new Error(config.ERRORS.NETWORK_ERROR);
    } else {
      // Unknown error
      throw new Error(error.message || config.ERRORS.ANALYSIS_ERROR);
    }
  }
}

/**
 * Call autism detection API directly from frontend
 * @param {File} imageFile - The image file to analyze
 * @returns {Promise} - Promise with autism detection results
 */
export async function callAutismApiDirectly(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    console.log('🧠 Calling autism API directly from frontend...');
    
    const response = await axios.post(
      'https://autism-detection2-667306373563.europe-west1.run.app/predict/',
      formData,
      {
        timeout: 120000, // 2 minutes
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
        const autismImageUrl = `https://autism-detection2-667306373563.europe-west1.run.app${response.data.annotated_image_path}`;
        response.data.annotated_image_url = autismImageUrl;
        console.log('🔗 Autism image URL:', autismImageUrl);
      }
      
      return response.data;
    } else {
      throw new Error(`Autism API returned status ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ Direct autism API call failed:', error);
    throw new Error(`Autism detection failed: ${error.message}`);
  }
}

/**
 * Validate image file before upload
 * @param {File} file - Image file to validate
 * @returns {string|null} - Error message or null if valid
 */
function validateImageFile(file) {
  if (!file) {
    return 'No file selected';
  }

  if (file.size > config.UPLOAD.MAX_FILE_SIZE) {
    return config.ERRORS.FILE_TOO_LARGE;
  }

  if (!config.UPLOAD.ALLOWED_TYPES.includes(file.type)) {
    return config.ERRORS.INVALID_FILE_TYPE;
  }

  if (file.size === 0) {
    return config.ERRORS.CORRUPT_IMAGE;
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
 * Build full image URL from relative path with FIXED routing for direct service calls
 * @param {string} url - Relative or absolute URL
 * @returns {string|null} - Full URL or null if invalid
 */
export function getFullImageUrl(url) {
  try {
    if (!url || typeof url !== 'string') return null;
    
    // If already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    // Route based on path
    let base;
    
    if (url.startsWith('/annotated/')) {
      // Direct autism service URL (bypassing broken Age API serving)
      base = 'https://autism-detection2-667306373563.europe-west1.run.app';
      console.log('🧠 Using direct autism service URL:', url);
    } else if (url.startsWith('/annotated_face/')) {
      // Face images from Animal Filter service
      base = 'https://animal-human-filter-667306373563.europe-west2.run.app';
      console.log('👤 Routing face image to Animal Filter API:', url);
    } else if (url.startsWith('/annotated_age/')) {
      // Age images from Age API
      base = 'https://age-api-667306373563.europe-west1.run.app';
      console.log('📊 Routing age image to Age API:', url);
    } else {
      // Default fallback
      base = 'https://age-api-667306373563.europe-west1.run.app';
      console.log('🔄 Using default base URL:', url);
    }
    
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
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Human-readable file size
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Determine confidence color based on thresholds with error handling
 * @param {number} confidence - Confidence value (0–100)
 * @returns {'success'|'warning'|'error'} - Color level for UI
 */
export function getConfidenceColor(confidence) {
  try {
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
  } catch (error) {
    console.error('Error determining confidence color:', error);
    return config.RESULTS.CHIP_COLORS.LOW;
  }
}

/**
 * Download a file from URL with error handling
 * @param {string} url - The URL of the file
 * @param {string} filename - The name for the downloaded file
 */
export function downloadFile(url, filename) {
  try {
    if (!url || !filename) {
      throw new Error('Invalid download parameters');
    }

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download file');
  }
}

/**
 * Check if age indicates adult (18+)
 * @param {string} ageString - Age string like "(15-20)" or "25"
 * @returns {boolean} - True if adult
 */
export function checkIfAdult(ageString) {
  try {
    if (!ageString || typeof ageString !== 'string') return false;
    
    // Extract age ranges like "(15-20)", "(25-32)", etc.
    const ageMatch = ageString.match(/\((\d+)-(\d+)\)/);
    if (ageMatch) {
      const minAge = parseInt(ageMatch[1], 10);
      return minAge >= 18;
    }
    
    // Handle single age values
    const singleAge = parseInt(ageString.replace(/\D/g, ''), 10);
    return !isNaN(singleAge) && singleAge >= 18;
  } catch (error) {
    console.error('Error checking age:', error);
    return false;
  }
}
