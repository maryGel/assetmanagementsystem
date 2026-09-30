// React
import { useState, useEffect, useMemo } from 'react';

// Material UI - Icons & Components
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import CancelIcon from '@mui/icons-material/Cancel';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';

import { IconButton, ThemeProvider, TextField, TablePagination, Snackbar, Alert, Dialog} from '@mui/material';

// Custom hooks
import { useRefItemClass } from '../../../hooks/refClass';
import { useRefCategory } from '../../../hooks/refCategory';
import { useEditableTable } from '../../../Utils/useEditableTable';

// Custom table utilities & theme
import { customTheme, resizeColumn, RenderSortIcon, RenderDialog } from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';


// ----------------------------------------------------------------------------
//                A S S E T  C L A S S  C O M P O N E N T
// ----------------------------------------------------------------------------

export default function RefItemClass({useProps, openTab,}) {
  const {
    refItemClassData,
    loading,
    error,
    createRefItemClass,
    updateRefItemClass,
    deleteRefItemClass,
    refreshItemClasses,
  } = useRefItemClass(useProps); 
  const {refCategoryData} = useRefCategory(useProps, [openTab])

  const {handleResizeMouseDown, theaderStyle, tbodyStyle} = useColumnWidths();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchQuery, setSearchQuery] = useState("");
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
    syncData(refItemClassData || [])
  }, [refItemClassData]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const assetGrp = useMemo(() => {
    return refCategoryData.map(item => item.category);
  }, [refCategoryData]);

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
  const handleAddRow = () => {
    if (editingRowId !== null) return; // Safety block

    const newRow = {
      id: `tmp-${crypto.randomUUID()}`,
      classCode: '',
      itemClass: '',
      category: '',
      isNew: true
    };

    addRow(newRow);

    const totalRows = data.length + 1;
    const newLastPage = Math.floor((totalRows - 1) / rowsPerPage);
    setPage(newLastPage);
  };

  const handleEditExistingRow = (id) => {
    if (editingRowId !== null) return;
    startEdit(id);
  };

  
  // ... Saving ...
  const handleSave = async () => {
      if (!editedRow) return;

      const isEmpty = !editedRow.classCode?.trim() && !editedRow.itemClass?.trim() && !editedRow.category?.trim();

      if (isEmpty) {
        setConfirmDeleteEmptyOpen(true);
        return;
      }

      // If any required fields are empty, show error
      if (!editedRow.classCode?.trim() || !editedRow.itemClass?.trim() || !editedRow.category?.trim()) {
        showSnackbar(`Please complete all the fields`, "error");
        return;
      }
    
    const isDuplicate = data.some(row =>
      row.id !== editedRow.id && (
      row.classCode.trim().toLowerCase() === editedRow.classCode.trim().toLowerCase() ||
      row.itemClass.trim().toLowerCase() === editedRow.itemClass.trim().toLowerCase()
      )
    );

    if (isDuplicate) {
      showSnackbar("Asset Class Code/Name already exists!", "error");
      return;
    }

    //Execute saving
    try {
      if (editedRow.isNew) {
        await createRefItemClass(editedRow.classCode, editedRow.itemClass, editedRow.category)
        showSnackbar('New asset class has been created!')
        
      } else {
        await updateRefItemClass(editedRow.id, editedRow.classCode, editedRow.itemClass, editedRow.category);
        showSnackbar('Changes has been saved!')
      }

      cancelEdit();
      
    } catch (err) {
      showSnackbar('Save failed: ' + err.message, 'error');
    }
  };

  const confirmDeleteEmpty = async () => {
    if (!editedRow) return;

    try {
      // If it's NOT new, emptying = delete row
      if (!editedRow.isNew) {
        await deleteRefItemClass(editedRow.id);
      }

      cancelEdit();
      showSnackbar("Asset Class has been deleted!");
      
    } catch (err) {
      showSnackbar("Failed: " + err.message, "error");
    }
    
    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

    
  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.classCode.trim() && !editedRow.itemClass.trim() && !editedRow.category.trim();

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
    item.itemClass?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.classCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) 
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) return <div className="p-4 text-gray-600">Loading data...</div>;
  if (error) return <div className="p-4 text-red-600">Error ref Cat loading data.. {error.message}</div>;
    
  return (
    <>
      {openTab === 'Asset Class' &&
        <ThemeProvider theme={customTheme}>
          <div className='w-auto h-full p-4 bg-white shadow-lg rounded-xl'>
            
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

            {/* Search input */}
              <div className='flex justify-end mb-3'>              
                <TextField
                  label="Search"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                  size="small"
                  sx={{width : 250 }}
                />  
              </div>
              
            {/* Title + Buttons */}
            <div className='flex items-center justify-between mb-4'>
              <h1 className='text-lg font-semibold text-gray-800'>Asset Class List</h1>
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

                  {/* Refresh Button */}
                  <IconButton
                    title='Refresh Data'
                    onClick={() => {
                      refreshItemClasses();
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

            <div className='overflow-x-auto border rounded-lg '>
              <table className="w-full border-collapse">

                 {/* ... Table Header ... */}
                <thead>
                  <tr className='bg-gray-100 border-b'>

                    {/* Asset Class Code */}
                    <th
                      className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                      style={theaderStyle('Code')}
                      onClick={() => handleSort('classCode')}
                    >
                      <div className='flex justify-between'>
                        <span className='mr-2'>Asset Class Code</span>
                        <RenderSortIcon columnKey='classCode'  sortConfig={sortConfig} />                         
                        <div
                          onMouseDown={(e) => handleResizeMouseDown('classCode', e)}
                          style={resizeColumn }
                          title="Resize column"
                        />
                      </div>
                      
                    </th>

                    {/* Asset Class Name */}

                    <th
                      className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                      style={theaderStyle('Name')}
                      onClick={() => handleSort('itemClass')}
                    >
                      <div className='flex justify-between'>
                        <span className='mr-2'>Asset Class</span>
                        <RenderSortIcon columnKey='itemClass'  sortConfig={sortConfig} />
                        <div
                          onMouseDown={(e) => handleResizeMouseDown('itemClass', e)}
                          style={resizeColumn }
                          title="Resize column"
                        />
                      </div>
                    </th>

                    {/* Category */}

                    <th
                      className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                      style={{width: 500}}
                      onClick={() => handleSort('category')}
                    >
                      <div className='flex justify-between'>
                        <span className='mr-2'>Asset Category</span>
                        <RenderSortIcon columnKey='category'  sortConfig={sortConfig} />
                        <div
                          onMouseDown={(e) => handleResizeMouseDown('itemClass', e)}
                          style={resizeColumn }
                          title="Resize column"
                        />
                        </div>
                    </th>
                    <th className='p-2 text-sm text-center'>Action</th>
                  </tr>
                </thead>


                 {/* ... Table Body ... */}

                <tbody>
                  {paginatedRows.map((row) => (
                    <tr key={row.id} className={`border-b ${editingRowId === row.id ? 'bg-blue-100' : 'hover:bg-gray-50'}`}>

                    {/* itemClass Code column */}
                    <td className='p-1 pl-2' style={tbodyStyle('classCode')}>
                      {editingRowId  === row.id?  (
                        <input
                          type="text"
                          value={row.classCode ?? ''}
                          onChange={(e) => updateCell(row.id, 'classCode', e.target.value)}
                          className="w-full p-1 border-b"
                        />
                      ) : (
                        row.classCode
                      )}
                    </td>

                    {/* itemClass Name column */}
                    <td className='p-1 pl-2'style={tbodyStyle('itemClass')} >
                    {editingRowId === row.id? (
                        <input
                          type="text"
                          value={row.itemClass ?? ''}
                          onChange={(e) => updateCell(row.id, 'itemClass', e.target.value)}
                          className="w-full p-1 border-b"
                        />
                      ) : (
                        row.itemClass
                      )}
                    </td>
                    {/* itemClass Asset category column */}
                    <td className='p-1 pl-2'style={tbodyStyle('category')} >
                    {editingRowId === row.id? (
                        <Autocomplete
                          value={row.category || ''}
                          options={assetGrp}
                          onChange={(e, newValue) => {
                            updateCell(row.id, 'category', newValue || "")
                          }}
                          className="w-full p-1 border-b"
                          renderInput={(params) => (<TextField {...params} size="small" />)}
                        />
                      ) : (
                        row.category
                      )}
                    </td>
                      {/* Edit Action */}
                      <td className='p-1 pl-2 text-center'>
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
