import { useState, useEffect } from 'react';
import { 
  TextField, 
  Snackbar, 
  Alert,
  Dialog,
  Button
} from '@mui/material';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// Custom Utils
import { CustomBtn } from '../../../Utils/groupbtns';
import { useUsers } from '../../../hooks/useUsers';
import { CustomDialog } from '../../../Utils/customDialog'

// Components
import UseList from '../userProfile/userList';
import UserInfo from '../userProfile/userInfo';
import PermissionTree from '../userProfile/permissionTree';

// Prepare payload for API submission
const formatUserData = (data) => {
  return {
    user: (data?.user || '').trim(),
    password: data?.password || '',
    fname: data?.fname || '',
    mname: data?.mname || '',
    lname: data?.lname || '',
    xPosi: data?.xPosi || '',
    xDept: data?.xDept || '',
    Admin: data?.Admin ?? 0,
    Log: data?.Log ?? 0,
    xlevel: data?.xlevel || '',
    Approver: data?.Approver ?? 0,
    xSection: data?.xSection || '',
    MULTI_DEPT: data?.MULTI_DEPT || '',
    MULTI_APP: data?.MULTI_APP || ''
  };
};

export default function UserAccessPage() {
  const {
    users,
    selectedUser,
    formData,
    page,
    setPage,
    search,
    setSearch,
    limit,
    total,
    loading,
    saving,
    error,
    
    // UI State
    isEditing,
    isCreating,
    hasUnsavedChanges,    // ← Now being used!
    cancelDialogOpen,
    saveDialogOpen,
    snackbar,
    
    // Functions
    setSelectedUser,
    startCreate,
    startEdit,
    updateForm,
    cancelEdit,
    confirmCancel,
    openSaveDialog,
    closeSaveDialog,
    closeCancelDialog,
    closeSnackbar,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers();

  const [ openAccess, setOpenAccess] =useState(false);


  // ... H a n d l e r s ...  

  const handleEditButton = () => {
    if (selectedUser) {
      startEdit();
    } else {
      // You might want to show a snackbar here
      console.log('Please select a user to edit');
    }
  };

  const handleCreateButton = () => {
    startCreate();
  };

  const handleDeleteButton = async () => {
    if (!selectedUser) return;
    
    if (window.confirm(`Are you sure you want to delete user ${selectedUser.user}?`)) {
      await deleteUser(selectedUser.user);
    }
  };

  const handleConfirmSave = async () => {
      closeSaveDialog();
      
      const payload = formatUserData(formData);
      let result;
    
      try {
          if (isCreating) {
              result = await createUser(payload);
          } else {
              result = await updateUser(selectedUser.user, payload);
          }

          if (result && result.success) {
            
          }
      } catch (err) {
          console.error("Save failed:", err);
      }
  };

  // Warn user before closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);


  return (
    <div className='h-auto p-5 border rounded-lg bg-gray-50 m-7 border-spacing-1'>
      {/* Header with Search and Buttons */}
      <div className='flex items-center justify-between mb-4'>
        <div className='ml-.5'>
            <TextField
              label="Search"
              size="small"
              className='w-56 bg-white rounded-md'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>

        <div className='flex gap-2'>
          {isEditing && (
            <CustomBtn
              variant='saveBtn'
              iconType='save'
              title='Save Changes'
              onClick={openSaveDialog}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </CustomBtn>
          )}

          {(selectedUser || isCreating) && (
            <CustomBtn
              variant={isEditing ? 'cancelBtn' : 'editBtn'}
              iconType={isEditing ? 'cancel' : 'edit'}
              title={isEditing ? 'Cancel Edit' : 'Edit user'}
              onClick={isEditing ? cancelEdit : handleEditButton}
              disabled={saving}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </CustomBtn>
          )}

          {isEditing && !isCreating && (
            <CustomBtn
              variant='deleteBtn'
              iconType='delete'
              title='Delete user'
              onClick={handleDeleteButton}
              disabled={saving}
            >
              Delete
            </CustomBtn>
          )}

            <CustomBtn
              variant='createBtn'
              iconType='add'
              title='Create new user'
              onClick={handleCreateButton}
              disabled={isEditing || saving}
            >
              Create
            </CustomBtn>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className='grid grid-cols-[35rem_1fr] border border-spacing-2 bg-white rounded-lg p-2 mb-4'>
        <div className='p-2'>
          <UseList
            users={users}
            page={page}
            setPage={setPage}
            limit={limit}
            total={total}
            loading={loading}
            setSelectedUser={setSelectedUser}
            selectedUser={selectedUser}
            isEditing={isEditing}
            setOpenAccess={setOpenAccess}
          />
        </div>
        <div className='p-2'>
          <UserInfo 
            userData={formData}
            isEditing={isEditing}
            onUserChange={updateForm}
            isCreating={isCreating}
          />
        </div>

       
      </div>
        <div className='flex justify-end'>
          <Button
            sx = {{background: '#eceff1', padding: 1.5, textTransform: 'none'}}
            onClick = {()=> setOpenAccess(prev => !prev)}
          > 
            See Assigned Access  {openAccess ?  <KeyboardArrowDownIcon/> : <KeyboardArrowRightIcon/> }
          </Button>
        </div>
        
        {(openAccess) && 
          <div className='mt-3'>
              <PermissionTree 
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              isEditing={isEditing}
              isCreating={isCreating}
              formData={formData}
              onUserChange={updateForm}
              />
          </div>
        }

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Cancel Dialog - Now using hasUnsavedChanges from reducer */}      
      <Dialog
        open={cancelDialogOpen}
        onClose={closeCancelDialog}
        aria-labelledby="cancel-dialog-title"
      >
      <CustomDialog
        title = {'Discard Changes?'}
        text = {'You have unsaved changes, are you sure you want to cancel?'}
        cancel = {closeCancelDialog}
        cancelText = {'Continue Editing'}
        confirm = {confirmCancel}    
        confirmText = {'Proceed'} 
      />
      </Dialog>

      {/* Save Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={closeSaveDialog}
        aria-labelledby="save-dialog-title"
      >
      <CustomDialog 
        title = {isCreating ? 'Create New User?' : 'Save Changes?'}
        text = {isCreating 
            ? 'Are you sure you want to create this new user?'
            : 'Are you sure you want to save these changes?'
        }
        cancel = {closeSaveDialog}
        cancelText = {'Back'}
        confirm = {handleConfirmSave}    
        confirmText = {'Yes, Save'} 
      />
      </Dialog>

      {/* Optional: Visual indicator for unsaved changes */}
      {hasUnsavedChanges && (
        <div className="fixed flex items-center gap-2 px-4 py-2 text-yellow-800 bg-yellow-100 rounded-lg shadow-lg bottom-4 right-4">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
          <span className="text-sm font-medium">Unsaved changes</span>
        </div>
      )}
    </div>
  );
}