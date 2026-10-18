// Shared header look for tables and tab bars, so every page uses the same blue.

export const HEADER_BG = '#01579b';
export const HEADER_FG = '#ffffff';

// Apply to <TableCell> inside <TableHead>: blue background, white text,
// white sort arrows and checkboxes.
export const headerCellSx = {
  backgroundColor: HEADER_BG,
  color: HEADER_FG,
  fontWeight: 'bold',
  '& .MuiTableSortLabel-root, & .MuiTableSortLabel-root:hover, & .MuiTableSortLabel-root.Mui-active': {
    color: HEADER_FG,
  },
  '& .MuiTableSortLabel-icon': { color: `${HEADER_FG} !important` },
  '& .MuiCheckbox-root, & .MuiCheckbox-root.Mui-checked, & .MuiCheckbox-root.MuiCheckbox-indeterminate': {
    color: HEADER_FG,
  },
};