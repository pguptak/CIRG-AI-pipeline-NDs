// src/utils/api.js

import axios from 'axios';
import config from '../config';

/**
 * Analyze an image by sending it to the backend.
 * @param {File} imageFile - The image file to be analyzed.
 * @returns {Promise} - A promise that resolves with the API response.
 */
export async function analyzeImage(imageFile) {
  const formData = new FormData();
  formData.append('file', imageFile);

  const url = `${config.API_BASE_URL}${config.ENDPOINTS.ANALYZE}`;
  
  try {
    const response = await axios.post(url, formData, {
      timeout: config.UI.LOADING_TIMEOUT
    });
    return response;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.detail || config.ERRORS.ANALYSIS_ERROR);
    } else {
      throw new Error(config.ERRORS.NETWORK_ERROR);
    }
  }
}

/**
 * Download a file from a given URL.
 * @param {string} url - The URL of the file.
 * @param {string} filename - The name for the downloaded file.
 */
export function downloadFile(url, filename) {
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format file size for display.
 * @param {number} bytes - File size in bytes.
 * @returns {string} - Human-readable file size.
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Determine confidence color based on thresholds.
 * @param {number} confidence - Confidence value (0–1).
 * @returns {'success'|'warning'|'error'} - Color level for UI.
 */
export function getConfidenceColor(confidence) {
  if (confidence >= config.RESULTS.CONFIDENCE_THRESHOLDS.HIGH) {
    return config.RESULTS.CHIP_COLORS.HIGH;
  } else if (confidence >= config.RESULTS.CONFIDENCE_THRESHOLDS.MEDIUM) {
    return config.RESULTS.CHIP_COLORS.MEDIUM;
  } else {
    return config.RESULTS.CHIP_COLORS.LOW;
  }
}
