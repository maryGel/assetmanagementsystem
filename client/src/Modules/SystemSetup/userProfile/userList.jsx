import { DataGrid } from '@mui/x-data-grid';
import { Box } from '@mui/material';

const columns = [
  { field: 'user', headerName: 'Username', flex: 1, minWidth: 90 },
  { field: 'fname', headerName: 'First Name', flex: 1, minWidth: 110 },
  { field: 'xlevel', headerName: 'Access Level', flex: 1.3, minWidth: 140 },
];

export default function UseList({
  users,
  page,
  setPage,
  limit,
  total,
  loading,
  setSelectedUser,
  selectedUser,
  isEditing,
  onPageSizeChange,
  setOpenAccess
}) {

  const rows = users.map((u) => ({
    id: u.user, // Use username as unique ID
    ...u,
  }));

  const handleRowClick = (params) => {
      console.log('[userList] Row clicked:', params.row); // Add this
      console.log('[userList] Username:', params.row.user); // Add this
      setSelectedUser(params.row.user); // Make sure it's params.row.user, not params.row
      setOpenAccess(false);
  };

  const handlePaginationModelChange = (newModel) => {
    setPage(newModel.page + 1); // Convert from 0-index to 1-index
    if (onPageSizeChange && newModel.pageSize !== limit) {
      onPageSizeChange(newModel.pageSize);
    }
  };

  return (
    <div className='w-full h-[auto]'>
      <Box
        sx={{
          pointerEvents: isEditing ? 'none' : 'auto',
          opacity: isEditing ? 0.6 : 1,
          height: '100%',
          width: '100%'
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={total}
          loading={loading}
          paginationMode="server"
          pageSizeOptions={[5, 10, 20, 50]}
          paginationModel={{
            page: page - 1, // Convert to 0-index for DataGrid
            pageSize: limit,
          }}
          onPaginationModelChange={handlePaginationModelChange}
          onRowClick={handleRowClick}
          rowSelectionModel={selectedUser ? [selectedUser.user] : []}
          disableRowSelectionOnClick={isEditing}
          hideFooterSelectedRowCount
          sx={{
            fontSize: { xs: '0.78rem', md: '0.875rem' },
            '& .MuiDataGrid-columnHeaders': {
              fontSize: { xs: '0.78rem', md: '0.875rem' },
            },
            '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
              outline: 'none',
            },
            '& .MuiDataGrid-row.Mui-selected': {
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.12)',
              }
            },
            '& .MuiDataGrid-row': {
              cursor: isEditing ? 'default' : 'pointer',
            },
          }}
        />
      </Box>
    </div>
  );
}