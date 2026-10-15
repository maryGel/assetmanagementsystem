import { useState, useRef } from 'react';
import { createTheme, styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import { DialogContent, DialogTitle, DialogContentText, DialogActions, Button  } from '@mui/material';

import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

export const customTheme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5', // Indigo-600
    },
    action: {
      disabledBackground: '#E5E7EB',
      disabled: '#9CA3AF',
    },
  },
  components: {
    MuiTextField: {
      defaultProps: {
        variant: 'standard',
      },
      styleOverrides: {
        root: {
          padding: 0,
          '& .MuiInputBase-input': {
            fontSize: '14px',
            padding: '1px 0',
            lineHeight: 'inherit',
          },
        },
      },
    },
  },
});

export const resizeColumn = {
  position: 'absolute',
  top: 0,
  right: 0,
  height: '100%',
  width: 8,
  cursor: 'col-resize',
  transform: 'translateX(50%)',
  zIndex: 10,
};

export const RenderSortIcon = ({columnKey, sortConfig}) => {
  if (!sortConfig || !sortConfig.key) {
    return <UnfoldMoreIcon sx={{ fontSize: 16, opacity: 0.4 }} />;
  }

  if (sortConfig.key !== columnKey){
    return <UnfoldMoreIcon fontSize='inherit' sx={{ fontSize : 16, opacity: 0.4 }} /> ;
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {sortConfig.direction === 'asc'
        ? <ArrowUpwardIcon fontSize='inherit' />
        : <ArrowDownwardIcon fontSize='inherit' />
      }
    </span>
  )
};

export const RenderDialog = ({cancel, confirm}) => {

  return (
    <>
      <DialogTitle sx={{ fontSize : 16, opacity: 0.8 }}>Confirm Empty Row</DialogTitle>
        <DialogContent>
          <DialogContentText  >
            This row is empty. Saving will remove this row. Do you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel}>Cancel</Button>
          <Button color="error" onClick={confirm}>Yes, Remove</Button>
        </DialogActions>
    </>

  )
};

export const bootstrapDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
  },
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1),
  },
}));

export default function useColumnWidths() {
  
  const [columnWidths, setColumnWidths] = useState({
    id: 50,
    Code: 250,
    Name: 500,
  });  

  const theaderStyle = (field) => ({
    width: columnWidths[field],
    minWidth: columnWidths[field]
  })

  const tbodyStyle = (field) => ({
    width: columnWidths[field],
    minWidth: columnWidths[field],
    maxWidth: columnWidths[field],
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  });

  const resizingRef = useRef({
    field: null,
    startX: 0,
    startWidth: 0,
    dragging: false,
  });

  const onMouseMove = (e) => {
    if (!resizingRef.current.dragging) return;
    const { field, startX, startWidth } = resizingRef.current;
    const delta = e.clientX - startX;
    const newWidth = Math.max(60, Math.round(startWidth + delta)); // min width 60px
    setColumnWidths(prev => ({ ...prev, [field]: newWidth }));
    // Prevent text selection while dragging
    e.preventDefault();
  };

  const onMouseUp = () => {
    if (resizingRef.current.dragging) {
      resizingRef.current = { field: null, startX: 0, startWidth: 0, dragging: false };
      document.body.style.userSelect = ''; // restore selection
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
  };

  const handleResizeMouseDown = (field, e) => {
    // left button only
    if (e.button !== 0) return;
    e.preventDefault();
    resizingRef.current = {
      field,
      startX: e.clientX,
      startWidth: columnWidths[field] || 100,
      dragging: true,
    };
    // prevent page text selection during drag
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return {handleResizeMouseDown, theaderStyle, tbodyStyle}
}




