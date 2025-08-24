# Autism Detection AI

A modern React application for AI-powered autism screening through image analysis. This application provides a user-friendly interface for uploading images and receiving detailed analysis results.

## Features

### 🎨 Modern Material-UI Design
- **Responsive Layout**: Side-by-side panels on desktop, stacked on mobile
- **Professional Styling**: Clean, modern Material-UI design with gradient backgrounds
- **Card-based Interface**: Two main panels for upload and results
- **Visual Feedback**: Loading states, hover effects, and smooth transitions
- **Snackbar Notifications**: Real-time feedback for user actions

### 📁 File Upload System
- **Drag & Drop**: Intuitive file upload with visual feedback
- **File Validation**: Supports JPG, PNG, GIF with 10MB size limit
- **Image Preview**: Shows selected image before analysis
- **Multiple Upload Methods**: Click to browse, drag and drop, or webcam capture
- **Webcam Integration**: Capture images directly from camera

### 🔍 Analysis Features
- **AI Integration**: Connects to autism detection API
- **Real-time Processing**: Shows loading states during analysis
- **Comprehensive Results**: Displays predictions for eyes, nose, and lips regions
- **Confidence Scoring**: Color-coded confidence levels (green ≥70%, yellow ≥40%, red <40%)

### 📊 Results Display
- **Annotated Images**: Shows analysis results with visual annotations
- **Detailed Tables**: Region-specific predictions with confidence scores
- **Final Decision**: Prominent display of overall assessment with color coding
- **Age Detection**: Shows detected age(s) from analysis
- **Confidence Chips**: Color-coded confidence levels for easy interpretation

### ⚠️ Error Handling
- **Comprehensive Validation**: File type, size, and format checking
- **Network Error Handling**: Graceful handling of API failures
- **User-friendly Messages**: Clear, actionable error messages
- **Snackbar Notifications**: Modern notification system for errors and success
- **Timeout Handling**: Automatic timeout for long-running requests

### 📱 Responsive Design
- **Mobile Optimized**: Full functionality on mobile devices
- **Adaptive Layout**: Panels stack vertically on small screens
- **Touch-friendly**: Optimized for touch interactions

## API Integration

The application integrates with the autism detection API at:
```
https://age-api-zzc8.onrender.com/process
```

### Supported Response Types

1. **Child Autism Screened** (`status: "child_autism_screened"`)
   - Shows annotated result image
   - Displays region-specific predictions (eyes, nose, lips) with confidence scores
   - Shows final decision (e.g., "autistic Moderate")
   - Lists detected age(s) with bounding box coordinates
   - Displays age summary with children/adults count

2. **Adult Invalid** (`status: "adult_invalid"`)
   - Shows age-annotated image
   - Displays "You are an adult. Invalid." message
   - Lists detected age(s)

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm or yarn package manager

### Installation

1. **Clone or download the project files**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Open your browser** and navigate to `http://localhost:3000`

### Building for Production

To create a production build:

```bash
npm run build
```

This creates an optimized build in the `build` folder.

## Usage

1. **Upload an Image**:
   - Click the upload area or drag and drop an image
   - Supported formats: JPG, PNG, GIF
   - Maximum file size: 10MB

2. **Analyze the Image**:
   - Click the "Analyze" button to process the image
   - Wait for the AI analysis to complete

3. **View Results**:
   - Results appear in the right panel
   - View annotated images and detailed predictions
   - Check confidence levels and final decision

4. **Reset** (Optional):
   - Click "Reset" to clear current selection and results

## Technical Details

### Architecture
- **React 18**: Modern React with hooks
- **Material-UI**: Professional UI components and theming
- **Functional Components**: All components use functional style
- **CSS Grid**: Responsive layout system
- **FormData API**: File upload handling
- **Webcam Integration**: Real-time camera capture

### State Management
- **useState**: Local component state
- **useRef**: File input reference
- **useCallback**: Optimized event handlers

### Error Handling
- **File Validation**: Type, size, and format checking
- **Network Errors**: API connection issues
- **Response Validation**: Malformed API responses
- **User Feedback**: Clear error messages

### Performance
- **Image Optimization**: Automatic resizing and compression
- **Lazy Loading**: Efficient resource loading
- **Memory Management**: Proper cleanup of object URLs

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Development

### Project Structure
```
src/
├── App.js          # Main application component
├── index.js        # Application entry point
└── index.css       # Global styles

public/
└── index.html      # HTML template
```

### Key Components

- **App**: Main application component with all logic
- **Alert**: Error message display component
- **LoadingSpinner**: Loading state indicator
- **PredictionTable**: Results table component
- **AgeSummary**: Age detection results display

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues or questions, please check the error messages in the application or review the browser console for technical details. 