import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const AssetFileUpload = ({ asset, updateAssetData }) => {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      updateAssetData({
        uploadPicture: {
          file,
          preview: URL.createObjectURL(file)
        }
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Upload Picture (Optional)
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Upload an image of the asset. Max file size: 5MB. Supported formats: JPG, PNG, GIF, WEBP.
      </Typography>
      
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" component="label">
          Choose File
          <input
            type="file"
            hidden
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileChange}
          />
        </Button>
        
        {asset.uploadPicture.file && (
          <Typography variant="body2" sx={{ mt: 1, ml: 1 }}>
            Selected: {asset.uploadPicture.file.name}
          </Typography>
        )}
      </Box>
      
      {asset.uploadPicture.preview && (
        <Box mt={3}>
          <Typography variant="subtitle2" gutterBottom>
            Preview:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <img
              src={asset.uploadPicture.preview}
              alt="Asset Preview"
              style={{ 
                maxWidth: '300px', 
                maxHeight: '300px', 
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            />
            <Button 
              variant="outlined" 
              color="error" 
              size="small"
              onClick={() => updateAssetData({
                uploadPicture: { file: null, preview: '' }
              })}
              sx={{ mt: 1 }}
            >
              Remove Image
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AssetFileUpload;
