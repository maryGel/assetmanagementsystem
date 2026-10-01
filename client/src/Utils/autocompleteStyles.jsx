// autocompleteStyles.jsx
// Single source of truth for form-field styling (Autocomplete AND native
// <input>), so both look identical and only differ between view / edit mode.
//
//                 VIEW (!isEditing)            EDIT (isEditing)
//   background    slate-50  #f8fafc            white     #ffffff
//   border        slate-200 #e2e8f0            slate-300 #cbd5e1
//   hover border  (unchanged)                  slate-400 #94a3b8
//   focus         -                            blue-500  #3b82f6 + soft ring
//   text          slate-600 #475569            slate-800 #1e293b
//
// Both modes share the same height, radius, border width and horizontal
// padding, so toggling Edit never shifts the layout.

export const FIELD_HEIGHT = 38;          // px
const FIELD_RADIUS = 6;                  // px
const FIELD_PADDING_X = 12;              // px
const FIELD_FONT_SIZE = 'clamp(0.72rem, 0.55rem + 0.6vw, 1rem)';

const VIEW = { bg: '#f8fafc', border: '#e2e8f0', hover: '#e2e8f0', text: '#475569' };
const EDIT = { bg: '#ffffff', border: '#cbd5e1', hover: '#94a3b8', focus: '#3b82f6', text: '#1e293b' };

// ---------------------------------------------------------------------------
// MUI Autocomplete (apply to the <TextField> inside renderInput)
// ---------------------------------------------------------------------------
// `&&&` raises specificity so these win over Autocomplete's own size="small"
// padding rules and the disabled-state colours, without using !important.
export const getAutocompleteSx = (isEditing) => {
  const c = isEditing ? EDIT : VIEW;

  return {
    '&&& .MuiOutlinedInput-root': {
      minHeight: FIELD_HEIGHT,
      padding: `0 ${isEditing ? 40 : FIELD_PADDING_X}px 0 ${FIELD_PADDING_X}px`,
      borderRadius: `${FIELD_RADIUS}px`,
      backgroundColor: c.bg,
      fontSize: FIELD_FONT_SIZE,
      transition: 'box-shadow .15s ease, background-color .15s ease',
    },

    '&&& .MuiOutlinedInput-root .MuiAutocomplete-input': {
      padding: 0,
      color: c.text,
      // Disabled inputs otherwise fall back to a faded grey fill colour
      WebkitTextFillColor: c.text,
    },

    // Border: same width in every state, only the colour changes
    '&&& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
      borderWidth: 1,
      borderColor: c.border,
    },
    '&&& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: c.hover,
    },
    '&&& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderWidth: 1,
      borderColor: isEditing ? c.focus : c.border,
    },
    '&&& .MuiOutlinedInput-root.Mui-focused': {
      boxShadow: isEditing ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none',
    },

    // No dropdown arrow / clear button when the field is read-only
    '& .MuiAutocomplete-endAdornment': {
      display: isEditing ? 'flex' : 'none',
    },
    '& .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
      color: '#94a3b8',
    },
  };
};

// ---------------------------------------------------------------------------
// Native <input> (Tailwind classes - written out in full so JIT picks them up)
// ---------------------------------------------------------------------------
const fieldBase =
  'w-full min-w-0 flex-1 h-[38px] px-3 rounded-md border outline-none transition-colors ' +
  'text-[clamp(0.72rem,0.55rem+0.6vw,1rem)]';

const fieldView =
  'border-slate-200 bg-slate-50 text-slate-600 cursor-default ' +
  '[-webkit-text-fill-color:#475569] disabled:opacity-100';

const fieldEdit =
  'border-slate-300 bg-white text-slate-800 hover:border-slate-400 ' +
  'focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/15';

export const fieldClass = (isEditing) =>
  `${fieldBase} ${isEditing ? fieldEdit : fieldView}`;

// Fields that are never editable on this form (Category, Location, ...):
// always the read-only look, in both view and edit mode.
export const staticFieldClass = `${fieldBase} ${fieldView}`;

// Plain (non-input) read-only values such as "Php" or "Straight Line"
export const staticTextClass =
  'flex items-center min-h-[38px] px-3 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-slate-700';

export const fieldLabelClass =
  'self-center p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-slate-600 whitespace-nowrap';