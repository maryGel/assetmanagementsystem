// React
import { useEffect, useState } from 'react';

// Material UI
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';

import { IconButton, ThemeProvider, TextField, TablePagination, Snackbar, Alert, Dialog} from '@mui/material';

// Custom hooks
import { useSections} from '../../../hooks/refSection';
import { useEditableTable } from '../../../Utils/useEditableTable';

// Table utils
import { customTheme, resizeColumn, RenderSortIcon, RenderDialog } from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';


// ----------------------------------------------------------------------------
//           M A I N T E N A N C E   L I S T   C O M P O N E N T
// ----------------------------------------------------------------------------

export default function RefSection({ openTab, useProps }) {
  const {
    refSections,
    createSection,
    updateSection,
    deleteSection,
    loading,
    error,
  } = useSections(useProps);

  const { handleResizeMouseDown, theaderStyle, tbodyStyle } = useColumnWidths();

  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [confirmDeleteEmptyOpen, setConfirmDeleteEmptyOpen] = useState(false);

  // ---- Editable Table Hook ----
  const {
    data,
    setData,
    editedRow,
    editingRowId,
    addRow,
    startEdit,
    updateCell,
    cancelEdit,
    syncData,
  } = useEditableTable([]);

  // ---- Sync API data to table ----
  useEffect(() => {
    syncData(refSections || []);
  }, [refSections]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
  const handleAddRow = () => {
    if (editingRowId !== null) return;

    const newRow = {
      id: `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      xcode: '',
      xdesc: '',
      isNew: true,
    };

    addRow(newRow);
    const totalRows = data.length + 1;
    const newLastPage = Math.floor((totalRows -1) / rowsPerPage);
    setPage(newLastPage);

  };

  const handleEditExistingRow = (row) => {
    if (editingRowId !== null) return;
    startEdit(row);
  };

  // ... Saving ...
  const handleSave = async () => {
      if (!editedRow) return;

      const isEmpty = !editedRow.xcode.trim() && !editedRow.xdesc.trim();

      if (isEmpty) {
        setConfirmDeleteEmptyOpen(true);
        return;
      }

      if (!editedRow.xcode?.trim() || !editedRow.xdesc?.trim()) {
        showSnackbar('Please fill in required field: Maintenance Code/Name', 'error');
        return;
      }

      const isDuplicate = data.some(row =>
        row.id !== editedRow.id &&
        (row.xcode.trim().toLowerCase() === editedRow.xcode.trim().toLowerCase() ||
          row.xdesc.trim().toLowerCase() === editedRow.xdesc.trim().toLowerCase())
      );

      if (isDuplicate) {
        showSnackbar('Maintenance Code/Name already exists!', 'error');
        return;
      }

      // Execute Saving
      try {
        if (editedRow.isNew) {
          const tempId = editedRow.id;
          await createSection(editedRow.xcode, editedRow.xdesc);
          showSnackbar('New Maintenance has been created!');
        
        } else {
          await updateSection(editedRow.id, editedRow.xcode, editedRow.xdesc);
          showSnackbar('Changes has been saved!');
        }

        cancelEdit();

      } catch (err) {
        showSnackbar('Save failed: ' + err.message, 'error');
      }
  };

  // ... Confirm Deletion ...
  const confirmDeleteEmpty = async () => {
    if (!editedRow) return;

    try {
      if (!editedRow.isNew) {
        await deleteSection(editedRow.id);
      }

      cancelEdit();
      showSnackbar('Maintenance has been removed!');
    } catch (err) {
      showSnackbar('Delete failed: ' + err.message, 'error');
    }

    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.xcode.trim() && !editedRow.xdesc.trim();

  // ---- F i l t e r  &   P a g i n a t i o n ----

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);

  // ... Sorting ...
  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    const sorted = [...data].sort((a, b) => {
      const aVal = a[columnKey]?.toString().toLowerCase() ?? '';
      const bVal = b[columnKey]?.toString().toLowerCase() ?? '';
      return direction === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
    setData(sorted);
    setSortConfig({ key: columnKey, direction });
  };

  const filteredData = data.filter(item =>
    item.id === editingRowId ||
    item.xcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.xdesc?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading Maintenance data</div>;

  return (
    <>
      {openTab === 'Maintenance' &&
        <ThemeProvider theme={customTheme}>
          <div className="w-auto h-full p-4 bg-white shadow-lg rounded-xl">

            {/* Snackbar */}
            <Snackbar
              open={snackbar.open}
              autoHideDuration={4000}
              onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Alert
                severity={snackbar.severity}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
              >
                {snackbar.message}
              </Alert>
            </Snackbar>

            {/* Search */}
            <div className="flex justify-end mb-3">
              <TextField
                label="Search"
                disabled={editedRow}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                size="small"
                sx={{width : 250 }}
              />
            </div>

            {/* Title + Buttons */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-gray-800">Maintenance Unit</h1>
              <div className="flex space-x-1">
                {/* Save */}
                {editingRowId !== null && (
                  <IconButton
                    title="Save"
                    color="primary"
                    onClick={handleSave}
                    disabled={isNewRowEmpty}
                    size="small" sx={{ border: 1 }}
                  >
                    <SaveIcon />
                  </IconButton>
                )}

                {/* Cancel */}
                {editingRowId !== null && (
                  <IconButton
                    title="Cancel"
                    color="secondary"
                    onClick={cancelEdit}
                    size="small" sx={{ border: 1 }}
                  >
                    <CancelIcon />
                  </IconButton>
                )}
                {/* Add Row */}
                <IconButton
                  title="Add Row"
                  onClick={handleAddRow}
                  disabled={editingRowId !== null}
                  size="small" sx={{ border: 1 }}
                >
                  <AddIcon />
                </IconButton>

                {/* Download */}
                <IconButton size="small" sx={{ border: 1 }}>
                  <DownloadIcon />
                </IconButton>
              </div>
            </div>

            {/* .......  C u s t o m   T a b l e  ...... */}
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full border-collapse">
                  
                {/* ... Table Header ... */}
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      {/* Maintenance ID */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('xcode')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Maintenance Code</span>
                          <RenderSortIcon columnKey='xcode'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('xcode', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                       {/* Maintenance Name */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('xdesc')}
                        style={theaderStyle('Name')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> Maintenance Name </span>
                          <RenderSortIcon columnKey='xdesc'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('xdesc', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                      
                {/* ... Table Body ... */}
                  <tbody>
                    {paginatedRows.map(row => (
                      <tr key={row.id} className={`border-b ${editingRowId === row.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>
                        <td className="p-1 pl-2" style={tbodyStyle('xcode')}>
                          {editingRowId === row.id 
                            ? <input
                                  type="text"
                                  value={row.xcode}
                                  onChange={(e) => updateCell(row.id, 'xcode', e.target.value)}
                                  className="w-full p-1 border-b"
                              />
                            : row.xcode}
                        </td>
                        <td className="p-1 pl-2" style={tbodyStyle('xdesc')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.xdesc}
                              onChange={(e) => updateCell(row.id, 'xdesc', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.xdesc}
                        </td>
                        {/* Edit Button */}
                        <td className="p-1 pl-2 text-center">
                          {editingRowId === null && (
                            <>
                              <IconButton size="small" onClick={() => handleEditExistingRow(row)}>
                                <EditIcon fontSize="small" />
                              </IconButton> 
                              <IconButton title='Set Inactive'size="small" >
                                <ToggleOffIcon fontSize="small" />
                              </IconButton>
                            </>
                          )}  
                        </td>
                      </tr>
                    ))}
                  </tbody>
              </table>

                <TablePagination
                  component="div"
                  count={data.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(e, p) => setPage(p)}
                  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                />
            </div>

            <Dialog open={confirmDeleteEmptyOpen} onClose={cancelDeleteEmpty}>
               <RenderDialog cancel={cancelDeleteEmpty}  confirm={confirmDeleteEmpty}/> 
            </Dialog>
          </div>
        </ThemeProvider>
      }
    </>
  );
}
