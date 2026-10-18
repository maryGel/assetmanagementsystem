import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Autocomplete,
  TextField,
  InputAdornment,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PageviewIcon from '@mui/icons-material/Pageview';
import AssignmentIcon from '@mui/icons-material/Assignment';

import JOFormPage from '../jobOrder/JOFOrmPage';

/**
 * Job Order dialog.
 * - "Create New Job Order" opens it straight into Create mode.
 * - Cancel inside the form returns to Display mode; the dialog stays open.
 * - The JO No. selector (top bar) lets the user switch to another JO while
 *   in Display mode. It is locked while creating/editing.
 * - X closes the dialog (asks first if there are unsaved changes).
 */
export default function JobOrderDialog({
  open,
  onClose,
  initialDocNo = null,
  startInCreate = false,
  joNumbers = [],
  onDataChanged,
}) {
  const theme = useTheme();
  // Below 900px (tablet portrait / phones) the dialog takes the whole screen
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [docNo, setDocNo] = useState(initialDocNo);
  const [mode, setMode] = useState({ isEditing: false, hasUnsavedChanges: false });

  // Reset each time the dialog is (re)opened
  useEffect(() => {
    if (open) {
      setDocNo(initialDocNo);
      setMode({ isEditing: !!startInCreate, hasUnsavedChanges: false });
    }
  }, [open, initialDocNo, startInCreate]);

  const handleModeChange = useCallback((m) => setMode(m), []);

  const handleDocNoChange = useCallback(
    (newNo) => {
      setDocNo(newNo);
      onDataChanged?.();
    },
    [onDataChanged]
  );

  const handleClose = (event, reason) => {
    if (reason === 'backdropClick') return; // avoid losing work by a stray click
    if (mode.isEditing && mode.hasUnsavedChanges) {
      const ok = window.confirm('You have unsaved changes. Close and discard them?');
      if (!ok) return;
    }
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      fullScreen={fullScreen}
      maxWidth={false}
      PaperProps={{
        sx: {
          // tablet landscape / laptop: almost full width; big monitors: capped
          width: { md: '96vw', lg: '94vw', xl: '90vw' },
          maxWidth: { md: '96vw', xl: 1680 },
          height: { xs: '100%', md: '94vh' },
          maxHeight: { md: '94vh' },
          m: { md: 1 },
          borderRadius: { xs: 0, md: 2 },
        },
      }}
    >
    <DialogTitle 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', // 👈 Pushes "Job Order" to left and the rest to the right
        gap: { xs: 1 }, 
        flexWrap: 'wrap', 
        borderBottom: 1, 
        borderColor: 'divider', 
        py: 1, 
        pl: { xs: 1.5, md: 2.5 }, 
        pr: 2, // 👈 Reduced right padding since the close button is no longer absolute
      }} 
    > 
      {/* Left Side: Title */}
      <span className="flex items-center gap-2 text-lg font-semibold text-gray-800"> 
        <AssignmentIcon sx={{ color: 'primary.main' }} /> 
        Job Order 
      </span> 

      {/* Right Side Container: Dropdown and Close Button */}
      <div className="flex items-center gap-3">
        <Tooltip 
          title={mode.isEditing ? 'Save or cancel first to view another Job Order' : ''} 
          placement="bottom" 
        > 
          {/* Changed w-1/4 to w-64 or fixed width so it looks cleaner on the right side */}
          <span className="w-96"> 
            <Autocomplete
              size="small"
              disabled={mode.isEditing}
              options={joNumbers}
              value={docNo || null}
              onChange={(e, newValue) => newValue && setDocNo(newValue)}
              sx={{
                width: { xs: '100%', sm: 260, lg: 300 },
                '& .MuiOutlinedInput-root': { backgroundColor: 'white', borderRadius: '0.6rem' },
                  '& .MuiInputBase-input': { xs: '0.8125rem', xl: '0.875rem' },
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="View Job Order No."
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <InputAdornment position="start" sx={{ ml: 0.5 }}>
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              )}
            />
          </span> 
        </Tooltip> 

        <IconButton 
          aria-label="Close" 
          onClick={() => handleClose(null, 'closeButton')} 
          sx={{ color: 'text.secondary' }} // 👈 Removed position: absolute for proper flex alignment
        > 
          <CloseIcon /> 
        </IconButton> 
      </div>
    </DialogTitle>


      <DialogContent sx={{ px: { xs: 1, sm: 1.5, md: 2 }, pt: '8px !important', pb: 1.5 }}>
        {open && (
          <JOFormPage
            embedded
            docNo={docNo}
            startInCreate={startInCreate}
            onDocNoChange={handleDocNoChange}
            onModeChange={handleModeChange}
            onDataChanged={onDataChanged}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

JobOrderDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialDocNo: PropTypes.string,
  startInCreate: PropTypes.bool,
  joNumbers: PropTypes.arrayOf(PropTypes.string),
  onDataChanged: PropTypes.func,
};