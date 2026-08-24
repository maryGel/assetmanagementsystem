// React
import { useState, useEffect } from 'react';

// Material UI - Icons & Components
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import DownloadIcon from '@mui/icons-material/Download';
import CancelIcon from '@mui/icons-material/Cancel';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';

import { IconButton, ThemeProvider, TextField, TablePagination, Snackbar, Alert, Dialog } from '@mui/material';

// Custom hooks
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefAssetGroup } from '../../../hooks/refAssetGroup';
import { useEditableTable } from '../../../Utils/useEditableTable';

// Custom table utilities & theme
import { customTheme, resizeColumn,  RenderSortIcon, RenderDialog  } from '../../../Utils/customTable';
import useColumnWidths from '../../../Utils/customTable';


// ----------------------------------------------------------------------------
//            C A T E G O R Y   L I S T   C O M P O N E N T
// ----------------------------------------------------------------------------

export default function RefCategory({useProps, openTab,}) {
  const {
    refCategoryData,
    loading,
    error,
    createRefCategory,
    updateRefCategory,
    deleteRefCategory,
  } = useRefCategory(useProps); 
  const { assetGroups, isLoading: assetGroupsLoading, error: assetGroupsError } = useRefAssetGroup();

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

  // ---- Sync API data to table -----
  useEffect(() => {
    syncData(refCategoryData || []);
  }, [refCategoryData]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ---- H a n d l e r s ----

  // ... Adding new row  ...
  const handleAddRow = () => {
      if (editingRowId !== null) return; // Safety block

      const newRow = {
        id: `tmp-${crypto.randomUUID()}`,
        xCode: '',
        category: '',
        AssetGrpCode: '',
        isNew: true
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

      const isEmpty = !editedRow.xCode.trim() && !editedRow.category.trim();
      
      if (isEmpty) {
        setConfirmDeleteEmptyOpen(true);
        return;
      }

      if (!editedRow.xCode?.trim() || !editedRow.category?.trim()) {  
          showSnackbar(`Please fill in required fields: Category Code/Name`, "error");
          return;      
      }

      const isDuplicate = data.some(row =>
          row.id !== editedRow.id && (
            row.xCode.trim().toLowerCase() === editedRow.xCode.trim().toLowerCase() ||
            row.category.trim().toLowerCase() === editedRow.category.trim().toLowerCase()
          )
      );

      if (isDuplicate) {
          showSnackbar("Category Code/Name already exists!", "error");
          return;
      }

      // Execute saving
      try {
        if (editedRow.isNew) {
          await createRefCategory(editedRow.xCode, editedRow.category, editedRow.AssetGrpCode)
          showSnackbar('New Category has been created!')
          
        } else {
          await updateRefCategory(editedRow.id, editedRow.xCode, editedRow.category, editedRow.AssetGrpCode);
          showSnackbar('Changes has been saved!')
        }

        cancelEdit();
        
      } catch (err) {
        showSnackbar('Save failed: ' + err.message, 'error');
      }
  };

  // ... Confirm Deletion
  const confirmDeleteEmpty = async () => {
    if (!editedRow) return;
    
    try {
      if (!editedRow.isNew) {
        await deleteRefCategory(editedRow.id);
      }
        cancelEdit();
        showSnackbar("Asset Group has been deleted!");
      } catch (err) {
        showSnackbar("Failed: " + err.message, "error");
    }
    
    setConfirmDeleteEmptyOpen(false);
  };

  const cancelDeleteEmpty = () => {
    setConfirmDeleteEmptyOpen(false);
  };

  
  // ... Disabling Save button if new row is empty ...
  const isNewRowEmpty = editedRow?.isNew && !editedRow.xCode.trim() && !editedRow.category.trim();

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
    item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.xCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.AssetGrpCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const paginatedRows = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) return <div className="p-4 text-gray-600">Loading data...</div>;
  if (error) return <div className="p-4 text-red-600">Error ref Cat loading data.. {error.message}</div>;    

  return (
    <>
      {openTab === 'Asset Category' &&
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

            {/* Search button */}
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
              <h1 className='text-lg font-semibold text-gray-800'>Category List</h1>
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
            
            {/* .......  C u s t o m   T a b l e  ...... */}

            <div className='overflow-x-auto border rounded-lg '>
              <table className="w-full border-collapse">

                {/* ... Table Header ... */}
                <thead>
                  <tr className='bg-gray-100 border-b'>
                    {/* Category Code */}
                    <th
                      className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                      style={theaderStyle('Code')}
                      onClick={() => handleSort('xCode')}
                    >
                      <div className='flex justify-between'>
                        <span className='mr-2'> Categoy Code </span>
                        <RenderSortIcon columnKey='xCode'  sortConfig={sortConfig} /> 
                        <div
                          onMouseDown={(e) => handleResizeMouseDown('xCode', e)}
                          style={resizeColumn }
                          title="Resize column"
                        />
                      </div>        
                    </th>
                    {/* Category Name */}
                    <th
                      className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                      style={theaderStyle('Name')}
                      onClick={() => handleSort('category')}
                    >
                      <di className='flex justify-between'>
                        <span className='mr-2'>Category Name</span>
                        <RenderSortIcon columnKey='category'  sortConfig={sortConfig} /> 
                        <div
                          onMouseDown={(e) => handleResizeMouseDown('category', e)}
                          style={resizeColumn }
                          title="Resize column"
                        />
                      </di>
                    </th>
                    {/* Asset Group */}
                    <th
                      className='relative p-2 text-sm font-semibold text-left text-gray-700 border-r border-gray-200'
                      style={{ ...theaderStyle('AssetGrpCode'), width: 400, minWidth: 400 }}
                      onClick={() => handleSort('AssetGrpCode')}
                    >
                      <div className='flex justify-between'>
                        <span className='mr-2'>Asset Group</span>
                        <RenderSortIcon columnKey='AssetGrpCode' sortConfig={sortConfig} />
                        <div
                          onMouseDown={(e) => handleResizeMouseDown('AssetGrpCode', e)}
                          style={resizeColumn}
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

                    {/* Category Code column */}
                    <td className='p-1 pl-2' style={tbodyStyle('xCode')}>
                      {editingRowId  === row.id?  (
                        <input
                          type="text"
                          value={row.xCode ?? ''}
                          onChange={(e) => updateCell(row.id, 'xCode', e.target.value)}
                          className="w-full p-1 border-b"
                        />
                      ) : (
                        row.xCode
                      )}
                    </td>
                    {/* Category Name column */}
                    <td className='p-1 pl-2'style={tbodyStyle('category')} >
                    {editingRowId === row.id? (
                        <input
                          type="text"
                          value={row.category ?? ''}
                          onChange={(e) => updateCell(row.id, 'category', e.target.value)}
                          className="w-full p-1 border-b"
                        />
                      ) : (
                        row.category
                      )}
                    </td>
                    {/* Asset Group column */}
                    <td className='p-1 pl-2' style={{ ...tbodyStyle('AssetGrpCode'), width: 400, minWidth: 400, maxWidth: 400 }}>
                      {editingRowId === row.id ? (
                        <Autocomplete
                          value={assetGroups.find((group) => group.AssetGrpCode === row.AssetGrpCode) || null}
                          options={assetGroups}
                          getOptionLabel={(group) => `${group.AssetGrpCode} — ${group.AssetGroup}`}
                          isOptionEqualToValue={(option, value) => option.AssetGrpCode === value.AssetGrpCode}
                          onChange={(e, group) => updateCell(row.id, 'AssetGrpCode', group?.AssetGrpCode || '')}
                          disabled={assetGroupsLoading || !!assetGroupsError}
                          className="w-full p-1 bg-white border-b"
                          renderInput={(params) => <TextField {...params} size="small" placeholder="Select asset group" />}
                        />
                      ) : (
                        (() => {
                          const group = assetGroups.find((item) => item.AssetGrpCode === row.AssetGrpCode);
                          return group ? `${group.AssetGrpCode} — ${group.AssetGroup}` : row.AssetGrpCode;
                        })()
                      )}
                    </td>
                      {/* Edit Button */}
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
