import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Alert
} from '@mui/material';
import Webcam from 'react-webcam';
import axios from 'axios';

const ASDImageInput = () => {
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prediction, setPrediction] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const captureFromWebcam = () => {
    const screenshot = webcamRef.current.getScreenshot();
    fetch(screenshot)
      .then(res => res.blob())
      .then(blob => {
        const fileFromBlob = new File([blob], 'webcam-capture.jpg', { type: 'image/jpeg' });
        setImageFile(fileFromBlob);
        setPreview(screenshot);
      });
  };

  const submitImage = async () => {
    if (!imageFile) {
      alert('Please upload or capture an image first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      const response = await axios.post(`${BACKEND_URL}/predict/`, formData);
      setPrediction(response.data.prediction || 'No prediction received');
      setExplanation(response.data.explanation || '');
    } catch (err) {
      console.error(err);
      alert('Prediction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Autism Detection</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Upload a facial image or capture one using webcam to detect autism spectrum markers.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Button
            variant="contained"
            component="label"
            sx={{ mr: 2 }}
          >
            Upload Image
            <input
              type="file"
              hidden
              accept="image/*"
              onChange={handleFileUpload}
            />
          </Button>

          <Button
            variant="outlined"
            onClick={captureFromWebcam}
          >
            Capture from Webcam
          </Button>

          <Webcam
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            width={320}
            style={{ marginTop: '20px', borderRadius: '8px' }}
          />
        </CardContent>
      </Card>

      {preview && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="h6">Image Preview</Typography>
          <img
            src={preview}
            alt="Preview"
            style={{ maxWidth: '100%', borderRadius: '10px', marginTop: '10px' }}
          />
        </Box>
      )}

      <Button
        variant="contained"
        color="primary"
        onClick={submitImage}
        disabled={loading}
        fullWidth
        sx={{ mb: 3 }}
      >
        {loading ? 'Processing...' : 'Predict'}
      </Button>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {prediction && (
        <Card sx={{ mb: 2, p: 2, bgcolor: '#f9f9f9' }}>
          <Typography variant="h6">Prediction: {prediction}</Typography>
          {explanation && (
            <Typography variant="body2" color="text.secondary">
              Explanation: {explanation}
            </Typography>
          )}
        </Card>
      )}
    </Box>
  );
};

export default ASDImageInput;
