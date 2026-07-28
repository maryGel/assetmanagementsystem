// import  {useRef} from 'react';
import { TextareaAutosize as BaseTextareaAutosize } from '@mui/base/TextareaAutosize';
import { minWidth, styled } from '@mui/system';
import { TextField } from '@mui/material';
import { useRef, useEffect } from 'react';

export default function TextareaResizable() {
  const blue = {
    100: '#DAECFF',
    200: '#b6daff',
    400: '#3399FF',
    500: '#007FFF',
    600: '#0072E5',
    900: '#003A75',
  };

  const grey = {
    50: '#F3F6F9',
    100: '#E5EAF2',
    200: '#DAE2ED',
    300: '#C7D0DD',
    400: '#B0B8C4',
    500: '#9DA8B7',
    600: '#6B7A90',
    700: '#434D5B',
    800: '#303740',
    900: '#1C2025',
  };

  const Textarea = styled(BaseTextareaAutosize)(
    ({ theme }) => `
    box-sizing: border-box;
    width: 50rem;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 400;
    line-height: 1.5;
    padding: 12px;
    border-radius: 12px 12px 0;
    color: ${theme.palette.mode === 'dark' ? grey[300] : grey[900]};
    background: ${theme.palette.mode === 'dark' ? grey[900] : '#fff'};
    border: 1px solid ${theme.palette.mode === 'dark' ? grey[700] : grey[200]};
    box-shadow: 0 2px 2px ${theme.palette.mode === 'dark' ? grey[900] : grey[50]};

    &:hover {
      border-color: ${blue[400]};
    }

    &:focus {
      outline: 0;
      border-color: ${blue[400]};
      box-shadow: 0 0 0 3px ${theme.palette.mode === 'dark' ? blue[600] : blue[200]};
    }

    /* firefox */
    &:focus-visible {
      outline: 0;
    }
  `,
  );

  return <Textarea aria-label="empty textarea" />;
}

// Auto-resize TextField component
export const AutoResizeTextField = ({
  value,
  onChange,
  disabled,
  placeholder,
  ...props
}) => {
  const textareaRef = useRef(null); 

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <TextField
      {...props}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      multiline
      minRows={2}
      maxRows={4}
      inputRef={textareaRef}
      sx={{
        "& .MuiOutlinedInput-root": {
          backgroundColor: disabled ? "#f5f5f5" : "#fff",

          "& fieldset": {
            borderColor: disabled ? "#d0d0d0" : "#78909c",
            // borderWidth: disabled ? 1 : 2,
          },

          "&:hover fieldset": {
            borderColor: disabled ? "#d0d0d0" : "#78909c",
          },

          "&.Mui-focused fieldset": {
            borderColor: "#1976d2",
            borderWidth: 2,
          },
        },

        "& textarea": {
          resize: "none",
          minWidth: "10rem",
          overflow: "auto",
          fontSize: "0.85rem",
        },
      }}
    />
  );
};


