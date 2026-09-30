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
import { useApproval } from '../../../hooks/refApproval';
import { useEditableTable } from '../../../Utils/useEditableTable';
import { transTypes } from '../../../Utils/moduleList';

// Table utils
import { customTheme, resizeColumn, RenderSortIcon, RenderDialog } from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';


// ----------------------------------------------------------------------------
//           A P P R O V A L  H I E R A R C H Y  
// ----------------------------------------------------------------------------

export default function RefAppHierarchy({ openTab, useProps }) {
  const {
    refApprovals,
    createApproval,
    updateApproval,
    deleteApproval,
    refreshApprovals,
    loading,
    error,
  } = useApproval(useProps);

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
    syncData(refApprovals || []);
  }, [refApprovals]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
  const handleAddRow = () => {
    if (editingRowId !== null) return;

    const newRow = {
      id: `tmp-${crypto.randomUUID()}`,
      APP_CODE: '',
      MODULE: '',
      APP_LEVEL: '',
      SIGNATORY: '',
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

      const isEmpty = !editedRow.MODULE.trim() && !editedRow.APP_CODE.trim() && !editedRow.APP_LEVEL.trim() && !editedRow.SIGNATORY.trim();

      if (isEmpty) {
        setConfirmDeleteEmptyOpen(true);
        return;
      }

      if (!editedRow.MODULE?.trim() || !editedRow.APP_CODE?.trim()) {
        showSnackbar('Please fill in required field: Signatory ', 'error');
        return;
      }

      const isDuplicate = data.some(row =>
        row.id !== editedRow.id &&
        (row.MODULE.trim().toLowerCase() === editedRow.MODULE.trim().toLowerCase() &&
            row.APP_CODE.trim().toLowerCase() === editedRow.APP_CODE.trim().toLowerCase() &&
            row.APP_LEVEL.trim().toLowerCase() === editedRow.APP_LEVEL.trim().toLowerCase() &&
            row.SIGNATORY.trim().toLowerCase() === editedRow.SIGNATORY.trim().toLowerCase() 
        )
      );

      if (isDuplicate) {
        showSnackbar('Signatory already exists!', 'error');
        return;
      }

      // Execute Saving
      try {
        if (editedRow.isNew) {
          const tempId = editedRow.ID;
          await createApproval(editedRow.APP_CODE, editedRow.MODULE, editedRow.APP_LEVEL, editedRow.SIGNATORY);
          showSnackbar('New Approval Hierarchy has been created!');
        
        } else {
          await updateApproval(editedRow.id, editedRow.APP_CODE, editedRow.MODULE, editedRow.APP_LEVEL, editedRow.SIGNATORY);
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
        await deleteApproval(editedRow.id);
      }

      cancelEdit();
      showSnackbar('Approval Hierarchy has been removed!');
    } catch (err) {
      showSnackbar('Delete failed: ' + err.message, 'error');
    }

    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.MODULE.trim() && !editedRow.APP_CODE.trim() && !editedRow.APP_LEVEL.trim() && !editedRow.SIGNATORY.trim();

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
    item.MODULE?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.APP_CODE?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.SIGNATORY?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading Approval Hierarchy data</div>;

  return (
    <> 
      {openTab === 'Approval Hierarchy' &&
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
              <h1 className="text-lg font-semibold text-gray-800">Approval Hierarchy</h1>
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
                    refreshApprovals();
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
                        onClick={() => handleSort('APP_CODE')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Approval Code</span>
                          <RenderSortIcon columnKey='APP_CODE'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('APP_CODE', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                       {/* Label */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('MODULE')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> Module </span>
                          <RenderSortIcon columnKey='MODULE'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('MODULE', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      {/* Signatory Name */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('APP_LEVEL')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Approval Level</span>
                          <RenderSortIcon columnKey='APP_LEVEL'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('APP_LEVEL', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      {/* Position */}
                       <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('SIGNATORY')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> Signatory </span>
                          <RenderSortIcon columnKey='SIGNATORY'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('SIGNATORY', e)}
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
                        <td className="p-1 pl-2" style={tbodyStyle('APP_CODE')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.APP_CODE}
                              onChange={(e) => updateCell(row.id, 'APP_CODE', e.target.value)}
                              className="w-full p-1 border-b"
                              />
                          : row.APP_CODE}
                        </td>
                        {/* First Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('MODULE')}>
                          {editingRowId === row.id? (
                              <Autocomplete
                                value={row.MODULE || ''}
                                options={transTypes}
                                onChange={(e, newValue) => {
                                  updateCell(row.id, 'MODULE', newValue || "")
                                }}
                                className="w-full p-1 border-b"
                                renderInput={(params) => (<TextField {...params} size="small" />)}
                              />
                            ) : (
                              row.MODULE
                            )}
                        </td>
                        {/* Middle Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('APP_LEVEL')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.APP_LEVEL}
                              onChange={(e) => updateCell(row.id, 'APP_LEVEL', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.APP_LEVEL}
                        </td>
                        {/* Last Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('SIGNATORY')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.SIGNATORY}
                              onChange={(e) => updateCell(row.id, 'SIGNATORY', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.SIGNATORY}
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
