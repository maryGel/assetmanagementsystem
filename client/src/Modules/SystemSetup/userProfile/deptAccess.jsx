import { useMemo, useState } from "react";
import {
  Box,
  TextField,
  Typography,
  Stack,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Button
} from "@mui/material";

//Custom hooks
import { useRefDepartment } from '../../../hooks/refDepartment';

function filterList(items, q) {
  if (!q) return items;
  const query = q.toLowerCase();
  return items.filter(item =>
    item.Department?.toLowerCase().includes(query) ||
    item.label?.toLowerCase().includes(query)
  );
}

{/*--------------------------------------------------
       D E P T    C O M P O N E N T
  --------------------------------------------------*/}

// MULTI_DEPT is a single pipe-delimited string of department NAMES on
// user0000inv, e.g. "BANQUET DB|BANQUET SS|CAFETERIA DB". Matching is
// done case-insensitively against each item's Department field, since
// this stores names rather than ids/codes.
export default function DeptAccess({ isEditing, selectedUser, isCreating, formData, onUserChange }) {
  const [query, setQuery] = useState("");

  // Use the hook with selected user
  const { refDeptData, loading, error } = useRefDepartment(selectedUser?.user);

  // Transform the data if needed - handle different possible structures
  const departmentList = useMemo(() => {
    if (!refDeptData) return [];
    if (Array.isArray(refDeptData)) return refDeptData;
    return [];
  }, [refDeptData]);

  // Stable id per row - no Math.random() fallback, so ids don't change
  // between renders (that would break the `checked` lookups).
  const getItemId = (item) => item.id || item.deptId || item.Department;

  const allIds = useMemo(
    () => departmentList.map(getItemId),
    [departmentList]
  );

  // While editing, the draft lives in formData (kept in sync via
  // onUserChange as boxes are ticked). When not editing, fall back to
  // the persisted value on selectedUser so the list shows real saved
  // state read-only.
  const rawMultiDept = isEditing
    ? (formData?.MULTI_DEPT ?? '')
    : (selectedUser?.MULTI_DEPT ?? '');

  const grantedNames = useMemo(() => {
    return new Set(
      String(rawMultiDept)
        .split('|')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );
  }, [rawMultiDept]);

  // Single source of truth for what's checked - derived from formData /
  // selectedUser, not separate local state.
  const checked = useMemo(() => {
    const ids = new Set();
    departmentList.forEach((item) => {
      if (grantedNames.has((item.Department || '').trim().toUpperCase())) {
        ids.add(getItemId(item));
      }
    });
    return ids;
  }, [departmentList, grantedNames]);

  const visibleData = useMemo(() => filterList(departmentList, query), [departmentList, query]);

  const allSelected = allIds.length > 0 && allIds.every((id) => checked.has(id));

  // Toggles a single department and writes the new pipe-delimited
  // MULTI_DEPT string straight back into formData.
  const toggleDept = (item) => {
    if (!isEditing) return;

    const itemId = getItemId(item);
    const name = (item.Department || '').trim();
    const isChecked = checked.has(itemId);

    const currentNames = departmentList
      .filter((d) => checked.has(getItemId(d)))
      .map((d) => (d.Department || '').trim());

    const nextNames = isChecked
      ? currentNames.filter((n) => n.toUpperCase() !== name.toUpperCase())
      : [...currentNames, name];

    onUserChange({ MULTI_DEPT: nextNames.join('|') });
  };

  const handleSelectToggle = () => {
    if (!isEditing) return;
    onUserChange(
      { MULTI_DEPT: allSelected ? '' : departmentList.map((d) => (d.Department || '').trim()).join('|') }
    );
  };

  const handleSearchChange = (event) => {
    setQuery(event.target.value);
  };

  const handleItemClick = (item) => {
    toggleDept(item);
  };

  const handleCheckboxClick = (e, item) => {
    e.stopPropagation(); // Prevent event bubbling to the ListItem
    toggleDept(item);
  };

  // Loading state
  if (loading) {
    return (
      <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
        <Typography>Loading department data...</Typography>
      </Paper>
    );
  }

  // Error state
  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
        <Typography color="error">Error loading departments: {error}</Typography>
      </Paper>
    );
  }

  // Check if we have data
  if (!departmentList || departmentList.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
        <Typography>No departments available</Typography>
      </Paper>
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
      <Typography variant="subtitle1"  fontWeight="bold" mb={1}>
        Department Access Control
      </Typography>

      <Stack direction="row" justifyContent="space-between" alignItems="center" pb={2}>
        <TextField
          label="Search"
          variant="outlined"
          size="small"
          value={query}
          onChange={handleSearchChange}
          disabled={!isEditing}
          sx={{width: 300}}
        />

        {isEditing && (
          <Button
            variant="body2"
            size="small"
            onClick={handleSelectToggle}
            disabled={!isEditing || visibleData.length === 0}
            sx={{textTransform: 'none' }}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>
        )}
      </Stack>

      <Box
        sx={{
          border: "1px solid #ccc",
          borderRadius: 1,
          p: 1,
          height: 'auto',
          overflow: "auto",
          backgroundColor: !isEditing ? 'grey.50' : 'transparent',
        }}
      >
        <List dense>
          {visibleData.length > 0 ? (
            visibleData.map((item) => {
              const itemId = getItemId(item);
              const isChecked = checked.has(itemId);

              return (
                <ListItem
                  key={itemId}
                  onClick={() => handleItemClick(item)}
                  sx={{
                    py: 0.5,
                    cursor: isEditing ? 'pointer' : 'default',
                    '&:hover': isEditing ? { backgroundColor: 'rgba(0, 0, 0, 0.04)' } : {},
                    backgroundColor: isChecked && isEditing ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                  }}
                >
                  <ListItemIcon  sx={{ minWidth: 36 }}>
                    <Checkbox
                      size="small"
                      edge="start"
                      checked={isChecked}
                      disabled={!isEditing}
                      onClick={(e) => handleCheckboxClick(e, item)}
                      sx={{
                        py: 0, px: 0.5,
                        color: !isEditing ? 'gray' : 'primary.main',
                        '&.Mui-checked': {
                          color: !isEditing ? 'gray' : 'primary.main',
                        },
                        '&.Mui-disabled': {
                          color: !isEditing ? 'gray' : 'primary.main',
                          opacity: 0.8,
                        },
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.Department}
                    primaryTypographyProps={{
                      sx: {
                        color: !isEditing ? 'gray' : (isChecked ? 'primary.main' : 'text.primary'),
                        fontSize: 'medium',
                        fontWeight: isChecked && isEditing ? 500 : 400,
                      }
                    }}
                  />
                </ListItem>
              );
            })
          ) : (
            <ListItem>
              <ListItemText
                primary="No departments match your search"
                primaryTypographyProps={{ color: 'text.secondary' }}
              />
            </ListItem>
          )}
        </List>
      </Box>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Total: {departmentList.length} | Visible: {visibleData.length} | Selected: {checked.size}
        </Typography>
        {!isEditing && (
          <Typography variant="caption" color="text.secondary">
            (Read Only)
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}