// src/components/StartupScreen.js
import React, { useState, useEffect } from 'react';
import { Box, Typography, LinearProgress, Alert, IconButton } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const StartupScreen = ({ onComplete, isAnalysis = false, showColdStartWarning = false, onCancel = null }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  // Different steps for analysis vs app startup
  const startupSteps = isAnalysis ? [
    { time: getCurrentTime(), message: "INCOMING IMAGE REQUEST DETECTED ...", delay: 1000 },
    { time: getCurrentTime(), message: "ANIMAL FILTER SERVICE CHECKING ...", delay: 2000 },
    { time: getCurrentTime(), message: "WAKING UP RENDER FREE TIER SERVICE ...", delay: 8000 },
    { time: getCurrentTime(), message: "ALLOCATING COMPUTE RESOURCES ON RENDER ...", delay: 5000 },
    { time: getCurrentTime(), message: "AGE CLASSIFICATION SERVICE RESPONDING ...", delay: 4000 },
    { time: getCurrentTime(), message: "INITIALIZING GOOGLE CLOUD RUN INSTANCE ...", delay: 6000 },
    { time: getCurrentTime(), message: "AUTISM DETECTION MODELS LOADING ...", delay: 7000 },
    { time: getCurrentTime(), message: "FINALIZING ANALYSIS PIPELINE ...", delay: 3000 },
    { time: getCurrentTime(), message: "STEADY HANDS. YOUR ANALYSIS IS ALMOST READY ...", delay: 2000 }
  ] : [
    { time: getCurrentTime(), message: "INCOMING HTTP REQUEST DETECTED ...", delay: 1000 },
    { time: getCurrentTime(), message: "SERVICE WAKING UP ...", delay: 2000 },
    { time: getCurrentTime(), message: "ALLOCATING COMPUTE RESOURCES ...", delay: 3000 },
    { time: getCurrentTime(), message: "PREPARING INSTANCE FOR INITIALIZATION ...", delay: 2000 },
    { time: getCurrentTime(), message: "STARTING THE INSTANCE ...", delay: 3000 },
    { time: getCurrentTime(), message: "ENVIRONMENT VARIABLES INJECTED ...", delay: 1000 },
    { time: getCurrentTime(), message: "FINALIZING STARTUP ...", delay: 2000 },
    { time: getCurrentTime(), message: "STEADY HANDS. YOUR APP IS LIVE ...", delay: 1000 }
  ];

  const asciiArt = "
    ╔══════════════════════════════════════════════════════════════════════=╗
    ║                                                                       ║
    ║     █████╗ ██╗    ███████╗ █████╗  ██████╗███████╗                    ║
    ║    ██╔══██╗██║    ██╔════╝██╔══██╗██╔════╝██╔════╝                    ║
    ║    ███████║██║    █████╗  ███████║██║     █████╗                      ║
    ║    ██╔══██║██║    ██╔══╝  ██╔══██║██║     ██╔══╝                      ║
    ║    ██║  ██║██║    ██║     ██║  ██║╚██████╗███████╗                    ║
    ║    ╚═╝  ╚═╝╚═╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝╚══════╝                    ║
    ║                                                                       ║
    ║           █████╗ ███╗   ██╗ █████╗ ██╗  ██╗   ██╗███████╗██╗███████╗  ║
    ║          ██╔══██╗████╗  ██║██╔══██╗██║  ╚██╗ ██╔╝██╔════╝██║██╔════╝  ║
    ║          ███████║██╔██╗ ██║███████║██║   ╚████╔╝ ███████╗██║███████╗  ║
    ║          ██╔══██║██║╚██╗██║██╔══██║██║    ╚██╔╝  ╚════██║██║╚════██║  ║
    ║          ██║  ██║██║ ╚████║██║  ██║███████╗██║   ███████║██║███████║  ║
    ║          ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝╚═╝╚══════╝  ║
    ║                                                                       ║
    ╚══════════════════════════════════════════════════════════════════════╝
  ";

  // Show warning after delay
  useEffect(() => {
    if (showColdStartWarning && isAnalysis) {
      const warningTimer = setTimeout(() => {
        setShowWarning(true);
      }, 15000);
      return () => clearTimeout(warningTimer);
    }
  }, [showColdStartWarning, isAnalysis]);

  // Step progression logic
  useEffect(() => {
    if (isPaused) return;

    if (currentStep >= startupSteps.length) {
      const completeTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 1000);
      return () => clearTimeout(completeTimer);
    }

    const currentStepData = startupSteps[currentStep];
    if (currentStepData) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setProgress(prev => Math.min(prev + (100 / startupSteps.length), 100));
      }, currentStepData.delay);

      return () => clearTimeout(timer);
    }
  }, [currentStep, onComplete, startupSteps, isPaused]);

  const handleCancel = () => {
    setIsPaused(true);
    if (onCancel) onCancel();
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0f0f0f',
        color: '#00ff00',
        fontFamily: 'Courier New, monospace',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
        position: isAnalysis ? 'fixed' : 'static',
        top: isAnalysis ? 0 : 'auto',
        left: isAnalysis ? 0 : 'auto',
        right: isAnalysis ? 0 : 'auto',
        bottom: isAnalysis ? 0 : 'auto',
        zIndex: isAnalysis ? 9999 : 'auto',
      }}
    >
      {/* Cancel Button for Analysis */}
      {isAnalysis && onCancel && (
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <IconButton 
            onClick={handleCancel}
            sx={{ color: '#00ff00' }}
            aria-label="Cancel analysis"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      )}

      {/* ASCII Art Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography
          component="pre"
          sx={{
            fontSize: { xs: '0.4rem', sm: '0.6rem', md: '0.8rem' },
            lineHeight: 1,
            color: '#00ff00',
            fontWeight: 'bold',
            overflow: 'hidden'
          }}
        >
          {asciiArt}
        </Typography>
      </Box>

      {/* Cold Start Warning */}
      {showWarning && isAnalysis && (
        <Alert 
          severity="info" 
          sx={{ 
            mb: 3, 
            bgcolor: '#1a1a1a', 
            color: '#00ff00',
            border: '1px solid #00ff00',
            maxWidth: '600px',
            '& .MuiAlert-icon': { color: '#00ff00' }
          }}
        >
          <Typography sx={{ fontFamily: 'Courier New, monospace', fontSize: '0.9rem' }}>
            ⚠️ FREE TIER COLD START DETECTED<br/>
            Render & Google Cloud services are waking up.<br/>
            This may take 30-60 seconds on first request.
          </Typography>
        </Alert>
      )}

      {/* Startup Messages */}
      <Box sx={{ width: '100%', maxWidth: 900, mb: 4, minHeight: '300px' }}>
        {startupSteps.slice(0, currentStep).map((step, index) => (
          <Typography
            key={index}
            sx={{
              fontSize: '0.9rem',
              mb: 1,
              opacity: index === currentStep - 1 ? 1 : 0.7,
              color: index === currentStep - 1 ? '#00ff00' : '#888',
              transition: 'all 0.3s ease'
            }}
          >
            {step.time} {step.message}
          </Typography>
        ))}
        
        {/* Blinking cursor */}
        {currentStep < startupSteps.length && !isPaused && (
          <Typography
            sx={{
              fontSize: '0.9rem',
              color: '#00ff00',
              animation: 'blink 1s infinite',
              '@keyframes blink': {
                '0%, 50%': { opacity: 1 },
                '51%, 100%': { opacity: 0 }
              }
            }}
          >
            ▋
          </Typography>
        )}
      </Box>

      {/* Progress Bar */}
      <Box sx={{ width: '100%', maxWidth: 600, mb: 2 }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: '#333',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#00ff00',
              borderRadius: 4
            }
          }}
        />
      </Box>

      <Typography sx={{ fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>
        {isAnalysis ? 
          'Initializing Multi-Service AI Pipeline...' : 
          'Initializing AI Face Analysis System...'
        }
      </Typography>

      {/* Service Status */}
      {isAnalysis && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '0.7rem', color: '#666', mb: 1 }}>
            Services Status:
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: currentStep >= 3 ? '#00ff00' : '#888' }}>
            🔄 Render (Age Classification): {currentStep >= 3 ? 'ACTIVE' : 'WAKING UP...'}
          </Typography>
          <Typography sx={{ fontSize: '0.7rem', color: currentStep >= 6 ? '#00ff00' : '#888' }}>
            ☁️ Google Cloud (Autism Analysis): {currentStep >= 6 ? 'ACTIVE' : 'INITIALIZING...'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default StartupScreen;
