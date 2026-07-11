import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const showToast = useCallback((message, severity = 'info') => {
    console.log('📢 Global Toast:', { message, severity });
    setSnackbar({ 
      open: true, 
      message, 
      severity 
    });
  }, []);

  const hideToast = useCallback(() => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideToast();
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ 
          zIndex: 999999,
          position: 'fixed',
          bottom: '24px !important',
          right: '24px !important',
        }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            minWidth: '350px',
            maxWidth: '500px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: '15px',
            padding: '12px 20px',
            borderRadius: '8px',
            '& .MuiAlert-icon': {
              fontSize: '22px'
            },
            '& .MuiAlert-message': {
              padding: '4px 0'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};