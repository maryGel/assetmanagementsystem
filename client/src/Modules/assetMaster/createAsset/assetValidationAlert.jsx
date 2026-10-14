import React from 'react';
import { Alert, Typography } from '@mui/material';

const ValidationAlert = ({ errors, type = 'error' }) => {
  if (!errors) return null;
  
  // Handle string errors
  if (typeof errors === 'string') {
    return (
      <Alert severity={type} sx={{ mb: 2 }}>
        {errors}
      </Alert>
    );
  }
  
  // Handle array of errors
  if (Array.isArray(errors) && errors.length > 0) {
    return (
      <Alert severity={type} sx={{ mb: 2 }}>
        {errors.length === 1 ? (
          <Typography>{errors[0]}</Typography>
        ) : (
          <>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
              Fill out the missing fields:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </>
        )}
      </Alert>
    );
  }
  
  return null;
};

export default ValidationAlert;