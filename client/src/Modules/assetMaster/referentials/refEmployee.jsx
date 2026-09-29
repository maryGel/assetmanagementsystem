// React
import { useEffect, useState } from 'react';

// Material UI
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import AddIcon from '@mui/icons-material/Add';
import CancelIcon from '@mui/icons-material/Cancel';
import DownloadIcon from '@mui/icons-material/Download';

import { IconButton, ThemeProvider, TextField, TablePagination, Snackbar, Alert, Dialog} from '@mui/material';

// Custom hooks
import { useRefEmployees} from '../../../hooks/refEmployee';
import { useEditableTable } from '../../../Utils/useEditableTable';

// Table utils
import { customTheme, resizeColumn, RenderSortIcon, RenderDialog } from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';


// ----------------------------------------------------------------------------
//           M A I N T E N A N C E   L I S T   C O M P O N E N T
// ----------------------------------------------------------------------------

export default function RefEmployee({ openTab, useProps }) {
  const {
    refEmployees,
    createEmployee,
    updateRefEmployee,
    deleteRefEmployee,
    loading,
    error,
  } = useRefEmployees(useProps);

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
    syncData(refEmployees || []);
  }, [refEmployees]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
  const handleAddRow = () => {
    if (editingRowId !== null) return;

    const newRow = {
      id: `tmp-${crypto.randomUUID()}`,
      Emp_No: '',
      Emp_FName: '',
      Emp_MName: '',
      Emp_LName: '',
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

      const isEmpty = !editedRow.Emp_No.trim() && !editedRow.Emp_FName.trim();

      if (isEmpty) {
        setConfirmDeleteEmptyOpen(true);
        return;
      }

      if (!editedRow.Emp_No?.trim() || !editedRow.Emp_FName?.trim()) {
        showSnackbar('Please fill in required field: Employee Code/Name', 'error');
        return;
      }

      const isDuplicate = data.some(row =>
        row.id !== editedRow.id &&
        (row.Emp_No.trim().toLowerCase() === editedRow.Emp_No.trim().toLowerCase() ||
            row.Emp_FName.trim().toLowerCase() === editedRow.Emp_FName.trim().toLowerCase() ||
            row.Emp_MName.trim().toLowerCase() === editedRow.Emp_MName.trim().toLowerCase() ||
            row.Emp_LName.trim().toLowerCase() === editedRow.Emp_LName.trim().toLowerCase() 
        )
      );

      if (isDuplicate) {
        showSnackbar('Employee Code/Name already exists!', 'error');
        return;
      }

      // Execute Saving
      try {
        if (editedRow.isNew) {
          const tempId = editedRow.id;
          await createEmployee(editedRow.Emp_No, editedRow.Emp_FName, editedRow.Emp_MName, editedRow.Emp_LName);
          showSnackbar('New Employee has been created!');
        
        } else {
          await updateEmployee(editedRow.id, editedRow.Emp_No, editedRow.Emp_FName);
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
        await deleteEmployee(editedRow.id);
      }

      cancelEdit();
      showSnackbar('Employee has been removed!');
    } catch (err) {
      showSnackbar('Delete failed: ' + err.message, 'error');
    }

    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.Emp_No.trim() && !editedRow.Emp_FName.trim() && !editedRow.Emp_MName.trim() && !editedRow.Emp_LName.trim();

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
    item.Emp_No?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.Emp_FName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.Emp_LName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error loading Employee data</div>;

  return (
    <> 
      {openTab === 'Employee List' &&
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
              <h1 className="text-lg font-semibold text-gray-800">List of Employees</h1>
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
                      {/* Employee ID */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('Emp_No')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Employee Code</span>
                          <RenderSortIcon columnKey='Emp_No'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('Emp_No', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                       {/* First Name */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('Emp_FName')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> First Name </span>
                          <RenderSortIcon columnKey='Emp_FName'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('Emp_FName', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      {/* Middle Name */}
                      <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('Emp_MName')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'>Middle Name</span>
                          <RenderSortIcon columnKey='Emp_MName'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('Emp_MName', e)}
                            style={resizeColumn }
                            title="Resize column"
                          />
                        </div>
                      </th>
                      {/* Last Name */}
                       <th
                        className="relative p-2 font-semibold text-left border-r border-gray-200 cursor-pointer"
                        onClick={() => handleSort('Emp_LName')}
                        style={theaderStyle('Code')}
                      >
                        <div className='flex justify-between'>
                          <span className='mr-2'> Last Name </span>
                          <RenderSortIcon columnKey='Emp_LName'  sortConfig={sortConfig} /> 
                          <div
                            onMouseDown={(e) => handleResizeMouseDown('Emp_LName', e)}
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
                        {/* Employee Number */}
                        <td className="p-1 pl-2" style={tbodyStyle('Emp_No')}>
                          {editingRowId === row.id 
                            ? <input
                                  type="text"
                                  value={row.Emp_No}
                                  onChange={(e) => updateCell(row.id, 'Emp_No', e.target.value)}
                                  className="w-full p-1 border-b"
                              />
                            : row.Emp_No}
                        </td>
                        {/* First Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('Emp_FName')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.Emp_FName}
                              onChange={(e) => updateCell(row.id, 'Emp_FName', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.Emp_FName}
                        </td>
                        {/* Middle Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('Emp_MName')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.Emp_MName}
                              onChange={(e) => updateCell(row.id, 'Emp_MName', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.Emp_MName}
                        </td>
                        {/* Last Name */}
                        <td className="p-1 pl-2" style={tbodyStyle('Emp_LName')}>
                          {editingRowId === row.id 
                          ? <input
                              type="text"
                              value={row.Emp_LName}
                              onChange={(e) => updateCell(row.id, 'Emp_LName', e.target.value)}
                              className="w-full p-1 border-b"
                            />
                          : row.Emp_LName}
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
