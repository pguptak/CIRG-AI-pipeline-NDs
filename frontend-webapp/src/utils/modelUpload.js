// Model Upload Utilities for Large Files (300MB+ each)

import config from '../config';

/**
 * Upload large model files to cloud storage
 * Supports: AWS S3, Google Cloud Storage, Azure Blob Storage
 */

// AWS S3 Configuration
const S3_CONFIG = {
  bucket: process.env.REACT_APP_S3_BUCKET || 'your-model-bucket',
  region: process.env.REACT_APP_S3_REGION || 'us-east-1',
  accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY,
};

// Google Cloud Storage Configuration
const GCS_CONFIG = {
  bucket: process.env.REACT_APP_GCS_BUCKET || 'your-model-bucket',
  projectId: process.env.REACT_APP_GCS_PROJECT_ID,
};

/**
 * Upload model to AWS S3
 * @param {File} modelFile - The model file to upload
 * @param {string} modelName - Name of the model
 * @returns {Promise<Object>} - Upload result with URL
 */
export const uploadToS3 = async (modelFile, modelName) => {
  try {
    // For large files, use multipart upload
    const formData = new FormData();
    formData.append('file', modelFile);
    formData.append('modelName', modelName);
    formData.append('type', 'model');

    const response = await fetch(`${config.API_BASE_URL}/upload-model-s3`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload model to S3');
    }

    const result = await response.json();
    return {
      success: true,
      url: result.modelUrl,
      modelId: result.modelId,
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload model to cloud storage');
  }
};

/**
 * Upload model to Google Cloud Storage
 * @param {File} modelFile - The model file to upload
 * @param {string} modelName - Name of the model
 * @returns {Promise<Object>} - Upload result with URL
 */
export const uploadToGCS = async (modelFile, modelName) => {
  try {
    const formData = new FormData();
    formData.append('file', modelFile);
    formData.append('modelName', modelName);
    formData.append('type', 'model');

    const response = await fetch(`${config.API_BASE_URL}/upload-model-gcs`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload model to GCS');
    }

    const result = await response.json();
    return {
      success: true,
      url: result.modelUrl,
      modelId: result.modelId,
    };
  } catch (error) {
    console.error('GCS Upload Error:', error);
    throw new Error('Failed to upload model to cloud storage');
  }
};

/**
 * Upload model to Azure Blob Storage
 * @param {File} modelFile - The model file to upload
 * @param {string} modelName - Name of the model
 * @returns {Promise<Object>} - Upload result with URL
 */
export const uploadToAzure = async (modelFile, modelName) => {
  try {
    const formData = new FormData();
    formData.append('file', modelFile);
    formData.append('modelName', modelName);
    formData.append('type', 'model');

    const response = await fetch(`${config.API_BASE_URL}/upload-model-azure`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload model to Azure');
    }

    const result = await response.json();
    return {
      success: true,
      url: result.modelUrl,
      modelId: result.modelId,
    };
  } catch (error) {
    console.error('Azure Upload Error:', error);
    throw new Error('Failed to upload model to cloud storage');
  }
};

/**
 * Upload multiple models in parallel
 * @param {Array} modelFiles - Array of model files
 * @param {Array} modelNames - Array of model names
 * @param {string} storageType - 's3', 'gcs', or 'azure'
 * @returns {Promise<Array>} - Array of upload results
 */
export const uploadMultipleModels = async (modelFiles, modelNames, storageType = 's3') => {
  const uploadPromises = modelFiles.map((file, index) => {
    const modelName = modelNames[index] || `model_${index + 1}`;
    
    switch (storageType) {
      case 's3':
        return uploadToS3(file, modelName);
      case 'gcs':
        return uploadToGCS(file, modelName);
      case 'azure':
        return uploadToAzure(file, modelName);
      default:
        return uploadToS3(file, modelName);
    }
  });

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Multiple model upload failed:', error);
    throw new Error('Failed to upload one or more models');
  }
};

/**
 * Get upload progress for large files
 * @param {XMLHttpRequest} xhr - XMLHttpRequest object
 * @param {Function} onProgress - Progress callback
 */
export const trackUploadProgress = (xhr, onProgress) => {
  xhr.upload.addEventListener('progress', (event) => {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      onProgress(percentComplete);
    }
  });
};

/**
 * Validate model file before upload
 * @param {File} file - The model file to validate
 * @returns {Object} - Validation result
 */
export const validateModelFile = (file) => {
  const maxSize = 500 * 1024 * 1024; // 500MB limit
  const allowedTypes = [
    'application/octet-stream',
    'application/x-pickle',
    'model/pkl',
    'model/h5',
    'model/onnx',
    'model/pt',
    'model/pth',
  ];

  if (!file) {
    return { success: false, message: 'No file selected' };
  }

  if (file.size > maxSize) {
    return { 
      success: false, 
      message: `File size too large. Maximum allowed: ${formatFileSize(maxSize)}` 
    };
  }

  // Check file extension for model files
  const fileName = file.name.toLowerCase();
  const isModelFile = fileName.endsWith('.pkl') || 
                     fileName.endsWith('.h5') || 
                     fileName.endsWith('.onnx') || 
                     fileName.endsWith('.pt') || 
                     fileName.endsWith('.pth') ||
                     fileName.endsWith('.model') ||
                     fileName.endsWith('.bin');

  if (!isModelFile && !allowedTypes.includes(file.type)) {
    return { 
      success: false, 
      message: 'Invalid file type. Please upload a valid model file (.pkl, .h5, .onnx, .pt, .pth)' 
    };
  }

  return { success: true, message: 'Model file is valid' };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted file size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}; 