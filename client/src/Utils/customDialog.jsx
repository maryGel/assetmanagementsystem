import { DialogContent, DialogTitle, DialogContentText, DialogActions, Button  } from '@mui/material';


export const CustomDialog = ({cancel, confirm, title, text, cancelText, confirmText, confirmColor = 'error'}) => {

  return (
    <>
      <DialogTitle sx={{ fontSize : 16, opacity: 0.8 }}>{title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize : 15}} >
            {text}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            sx ={{fontSize: 14, textTransform: 'none'}}
            onClick={cancel}>{cancelText}</Button>
          <Button 
            color={confirmColor}
            sx ={{fontSize: 14, textTransform: 'none'}}
            onClick={confirm}>{confirmText}</Button>
        </DialogActions>
    </>
  )
};