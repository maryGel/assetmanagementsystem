// React
import { useState, useEffect } from 'react';

// Material UI - Icons & Components
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import CancelIcon from '@mui/icons-material/Cancel';
import AddIcon from '@mui/icons-material/Add';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';

import { IconButton, ThemeProvider, TextField, TablePagination, Snackbar, Alert,  Dialog} from '@mui/material';

// Custom hooks
import { useRefLocation } from '../../../hooks/refLocation'; 
import { useEditableTable } from '../../../Utils/useEditableTable';
import { customTheme, resizeColumn, RenderSortIcon, RenderDialog} from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';

// ----------------------------------------------------------------------------
//            L O C A T I O N   L I S T   C O M P O N E N T
// ----------------------------------------------------------------------------

export default function RefLocation({useProps, openTab,}) {
  const {
    refLocData, 
    loading, 
    error,
    createRefLocation,
    updateRefLocation,
    deleteRefLocation,
    refreshRefLocation,
  } = useRefLocation(useProps)

  const {handleResizeMouseDown, theaderStyle, tbodyStyle} = useColumnWidths();
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
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


  useEffect(() => {
    syncData(refLocData || [])
  }, [refLocData]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
const handleAddRow = () => {
  if (editingRowId !== null) return; 

  const newRow = {
    id: `tmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    LocationName: '',
    isNew: true
  };

  addRow(newRow)

  const totalRows = data.length + 1;
  const newLastPage = Math.floor((totalRows -1) / rowsPerPage);
  setPage(newLastPage);
};

  const handleEditExistingRow = (id) => {
    if (editingRowId !== null) return;
    startEdit(id);
  };

  // ... Saving ...
 const handleSave = async () => {

  if (!editedRow) return;

  const isEmpty = !editedRow.LocationName.trim();

  if (isEmpty) {
    setConfirmDeleteEmptyOpen(true);
    return;
  }

  const isDuplicate = data.some(row =>
    row.id !== editedRow.id && (
      row.LocationName.trim().toLowerCase() === editedRow.LocationName.trim().toLowerCase()
    )
    );

    if (isDuplicate) {
      showSnackbar("Location already exists!", "error");
      return;
    }

    try {
      if (editedRow.isNew) {
        await createRefLocation(editedRow.LocationName);
        showSnackbar('New Location has been created!');
      } else {
        await updateRefLocation(editedRow.id, editedRow.LocationName);
        showSnackbar('Changes has been saved!');
      }

      cancelEdit();
      
    } catch (err) {
      showSnackbar('Save failed: ' + err.message, 'error');
    }
  };

  const confirmDeleteEmpty = async () => {
    if (!editedRow) return;

    try {
      if (!editedRow.isNew) {
        await deleteRefLocation(editedRow.id);
      }

      cancelEdit();
      showSnackbar("Location has been deleted!");
    } catch (err) {
      showSnackbar("Failed: " + err.message, "error");
    }

    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.LocationName.trim();

  // ---- F i l t e r  &   P a g i n a t i o n ----
  

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

    setData(sorted)
    setSortConfig({ key: columnKey, direction });
  };

  const filteredData = data.filter(item =>
    item.id === editingRowId ||
    item.LocationName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );  

  if (loading) return <div className="p-4 text-gray-600">Loading data...</div>;
  if (error) return <div className="p-4 text-red-600">Error loading data.. {error.message}</div>;

  return (
    <>
    {openTab === 'Location' &&
      <ThemeProvider theme={customTheme}>
        <div className='w-auto h-full p-4 bg-white shadow-lg rounded-xl'>

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
          <div className='flex justify-end mb-3'>
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
          <div className='flex items-center justify-between mb-4'>
            <h1 className='text-lg font-semibold text-gray-800'>Location List</h1>

            <div className="flex space-x-1">

              {/* Save */}
              {editingRowId !== null && (
                <IconButton
                  title='Save Changes'
                  color="primary"
                  onClick={handleSave}
                  disabled={isNewRowEmpty}
                  size="small"
                  sx={{ border: 1 }}
                >
                  <SaveIcon />
                </IconButton>
              )}

              {/* Cancel */}
              {editingRowId !== null && (
                <IconButton
                  title='Cancel Changes'
                  color="secondary"
                  onClick={cancelEdit}
                  className='transition duration-150 hover:bg-indigo-100'
                  size="small"
                  sx={{ border: 1 }}
                >
                  <CancelIcon />
                </IconButton>
              )}

              {/* Add Row */}
              <IconButton
                onClick={handleAddRow}
                disabled={editingRowId !== null}
                size="small"
                sx={{ border: 1 }}
              >
                <AddIcon />
              </IconButton>

              {/* Download */}
              <IconButton size="small" sx={{ border: 1 }}>
                <DownloadIcon />
              </IconButton>

            </div>
          </div>

          {/* -------------------------- Table -------------------------------- */}
          <div className='overflow-x-auto border rounded-lg'>
            <table className="w-full border-collapse">

              <thead>
                <tr className='bg-gray-100 border-b'>
                  <th
                    className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                    onClick={() => handleSort('LocationName')}
                    style={theaderStyle('Name')}
                  >
                    <div className='flex justify-between'>
                      <span className='mr-2'>Location</span>
                      <RenderSortIcon columnKey='LocationName'  sortConfig={sortConfig} />                         
                      <div
                        onMouseDown={(e) => handleResizeMouseDown('LocationName', e)}
                        style={resizeColumn }
                        title="Resize column"
                      />
                    </div>
                  </th>
                  <th className='p-2 text-sm text-center'>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map(row => (
                  <tr key={row.id} className={`border-b ${editingRowId === row.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>

                    {/* LocationName */}
                    <td className='p-1 pl-2'style={tbodyStyle('LocationName')} >
                      {editingRowId === row.id ? (
                        <input
                          type="text"
                          value={row.LocationName ?? ''}
                          onChange={(e) => updateCell(row.id, 'LocationName', e.target.value)}
                          className="w-full p-1 border-b"
                        />
                      ) : (
                        row.LocationName
                      )}
                    </td>

                    {/* Edit Action */}
                    <td className='p-1 pl-2 text-center'>
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
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10));
                  setPage(0);
                }}
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
