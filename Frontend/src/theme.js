import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: ['Inter', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'].join(','),
  },
  shape: {
    borderRadius: 12,
  },
  palette: {
    primary: {
      main: '#1e293b',
    },
    background: {
      default: '#fff',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: '"Inter", "Segoe UI", "Roboto", "Arial", "sans-serif"',
          backgroundColor: "#fff",
          color: "#191b22",
          margin: 0,
          padding: 0,
        }
      }
    }
  }
});

export default theme;
