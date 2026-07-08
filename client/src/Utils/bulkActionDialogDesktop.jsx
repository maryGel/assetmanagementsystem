// components/BulkActionDialogDesktop.jsx
import ReactDOM from 'react-dom';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Typography,
  Box,
  Chip,
  Alert,
  Divider,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const BulkActionDialogDesktop = ({
  isOpen,
  onClose,
  onConfirm,
  actionType, 
  itemCount,
  itemNames = [],
  loading = false,
  remarks = '',
  onRemarksChange,
  error = null
}) => {
  if (!isOpen) return null;

  const isApprove = actionType === 'approve';
  
  const config = {
    title: isApprove ? 'Bulk Approval' : 'Bulk Rejection',
    buttonText: isApprove ? 'Confirm Approval' : 'Confirm Rejection',
    buttonColor: isApprove ? 'success' : 'error',
    placeholder: isApprove 
      ? 'Please enter your approval remarks for all selected documents...'
      : 'Please enter your rejection remarks for all selected documents...',
    alertSeverity: isApprove ? 'info' : 'warning',
    alertMessage: isApprove 
      ? `You are about to approve ${itemCount} document${itemCount > 1 ? 's' : ''}`
      : `You are about to reject ${itemCount} document${itemCount > 1 ? 's' : ''}`
  };

  return ReactDOM.createPortal(
    <Dialog
      open={isOpen}
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          minHeight: 'auto',
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5
        }}>
          {config.icon}
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            {config.title}
          </Typography>
        </Box>
        <IconButton 
          onClick={onClose} 
          disabled={loading}
          size="small"
          sx={{ 
            color: 'text.secondary',
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* Status - Number of documents selected */}
        <Alert 
          severity={config.alertSeverity}
          sx={{ mb: 3 }}
          icon={isApprove ? <CheckCircleIcon /> : <CancelIcon />}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {config.alertMessage}
          </Typography>
        </Alert>

        {/* Document List Chips */}
        {itemNames.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Selected Documents:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {itemNames.map((name, index) => (
                <Chip
                  key={index}
                  label={name}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    borderRadius: 1,
                    fontSize: '0.75rem'
                  }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Remarks Input */}
        <TextField
          autoFocus
          multiline
          rows={4}
          fullWidth
          label="Remarks"
          placeholder={config.placeholder}
          value={remarks}
          onChange={(e) => onRemarksChange(e.target.value)}
          disabled={loading}
          required
          error={!remarks.trim() && remarks !== ''}
          helperText={!remarks.trim() && remarks !== '' ? 'Remarks are required' : ''}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 0, gap: 1 }}>
        <Button
          onClick={onClose}
          disabled={loading}
          variant="outlined"
          sx={{ 
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 500,
            flex: 1
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={() => onConfirm(remarks)}
          disabled={loading || !remarks.trim()}
          variant="contained"
          color={config.buttonColor}
          sx={{ 
            borderRadius: 2,
            px: 3,
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            flex: 1,
            position: 'relative'
          }}
          startIcon={loading ? undefined : config.icon}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Processing...
            </>
          ) : (
            `${config.buttonText} (${itemCount})`
          )}
        </Button>
      </DialogActions>
    </Dialog>,
    document.body
  );
};

export default BulkActionDialogDesktop;