// React
import { useEffect, useState } from 'react';

// Material UI
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';
import Autocomplete from '@mui/material/Autocomplete';
import RefreshIcon from '@mui/icons-material/Refresh';

import { IconButton, ThemeProvider, TextField, TablePagination, Snackbar, Alert, Dialog} from '@mui/material';

// Custom hooks
import { useRefSignatories} from '../../../hooks/refSignatory';
import { useEditableTable } from '../../../Utils/useEditableTable';
import { transTypes } from '../../../Utils/moduleList';

// Table utils
import { customTheme, resizeColumn, RenderSortIcon, RenderDialog } from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';


// ----------------------------------------------------------------------------
//           S I G N A T O R Y  L I S T   C O M P O N E N T
// ----------------------------------------------------------------------------

export default function RefSignatory({ openTab, useProps }) {
  const {
    refSignatories,
    createSignatory,
    updateSignatory,
    deleteSignatory,
    refreshSignatories,
    loading,
    error,
  } = useRefSignatories(useProps);

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
    syncData(refSignatories || []);
  }, [refSignatories]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
  const handleAddRow = () => {
    if (editingRowId !== null) return;

    const newRow = {
      id: `tmp-${crypto.randomUUID()}`,
      xModule: '',
      xLabel: '',
      xName: '',
      xPosition: '',
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

      const isEmpty = !editedRow.xModule.trim() && !editedRow.xLabel.trim();

      if (isEmpty) {
        setConfirmDeleteEmptyOpen(true);
        return;
      }

      if (!editedRow.xModule?.trim() || !editedRow.xLabel?.trim()) {
        showSnackbar('Please fill in required field: Signatory ', 'error');
        return;
      }

      const isDuplicate = data.some(row =>
        row.id !== editedRow.id &&
        (row.xModule.trim().toLowerCase() === editedRow.xModule.trim().toLowerCase() &&
            row.xLabel.trim().toLowerCase() === editedRow.xLabel.trim().toLowerCase() &&
            row.xName.trim().toLowerCase() === editedRow.xName.trim().toLowerCase() &&
            row.xPosition.trim().toLowerCase() === editedRow.xPosition.trim().toLowerCase() 
        )
      );

      if (isDuplicate) {
        showSnackbar('Signatory already exists!', 'error');
        return;
      }

      // Execute Saving
      try {
        if (editedRow.isNew) {
          const tempId = editedRow.id;
          await createSignatory(editedRow.xModule, editedRow.xLabel, editedRow.xName, editedRow.xPosition);
          showSnackbar('New Signatory has been created!');
        
        } else {
          await updateSignatory(editedRow.id, editedRow.xModule, editedRow.xLabel, editedRow.xName, editedRow.xPosition);
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
        await deleteSignatory(editedRow.id);
      }

      cancelEdit();
      showSnackbar('Signatory has been removed!');
    } catch (err) {
      showSnackbar('Delete failed: ' + err.message, 'error');
    }

    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.xModule.trim() && !editedRow.xLabel.trim() && !editedRow.xName.trim() && !editedRow.xPosition.trim();

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
    item.xModule?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.xLabel?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.xName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.xPosition?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading Signatory data</div>;

  return (
    <> 
      {openTab === 'Assign Signatory' &&
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
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                size="small"
                sx={{width : 250 }}
              />
            </div>

            {/* Title + Buttons */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-semibold text-gray-800">List of Signatories</h1>
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

               {/* Refresh Button */}
                <IconButton
                  title='Refresh Data'
                  onClick={() => {
                    refreshSignatories();
                    setSearchQuery( "");
                    setPage(0);
                  }}
                  disabled={loading}
                  size="small"
                  sx={{ border: 1 }}
                >
                  <RefreshIcon />
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
                      {/* Module */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('xModule')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Module</span>
                          <RenderSortIcon columnKey='xModule'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('xModule', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                       {/* Label */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('xLabel')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> Label </span>
                          <RenderSortIcon columnKey='xLabel'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('xLabel', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      {/* Signatory Name */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('xName')}
                        style={theaderStyle('Name')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Signatory/Name</span>
                          <RenderSortIcon columnKey='xName'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('xName', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      {/* Position */}
                       <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('xPosition')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> Position </span>
                          <RenderSortIcon columnKey='xPosition'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('xPosition', e)}
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
                        {/* Signatory Number */}
                        <td className="p-1 pl-2" style={tbodyStyle('xModule')}>
                           {editingRowId === row.id? (
                              <Autocomplete
                                value={row.xModule || ''}
                                options={transTypes}
                                onChange={(e, newValue) => {
                                  updateCell(row.id, 'xModule', newValue || "")
                                }}
                                className="w-full p-1 border-b"
                                renderInput={(params) => (<TextField {...params} size="small" />)}
                              />
                            ) : (
                              row.xModule
                            )}
                        </td>
                        {/* First Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('xLabel')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.xLabel}
                              onChange={(e) => updateCell(row.id, 'xLabel', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.xLabel}
                        </td>
                        {/* Middle Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('xName')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.xName}
                              onChange={(e) => updateCell(row.id, 'xName', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.xName}
                        </td>
                        {/* Last Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('xPosition')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.xPosition}
                              onChange={(e) => updateCell(row.id, 'xPosition', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.xPosition}
                        </td>
                        {/* Edit Button */}
                        <td className="p-1 pl-2 text-center">
                          {editingRowId === null && (
                            <IconButton size="small" onClick={() => handleEditExistingRow(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
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
