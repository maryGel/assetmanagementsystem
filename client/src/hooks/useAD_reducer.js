import { useReducer, useCallback } from 'react';

// Hooks
import { useAD_h } from './useAD_h';
import { useAD_d } from './useAD_d';

// Axios Instance
import { api } from '../api/axios';

const initialState = {
  // Transfer Form View State
  selectedAD: null,
  adDetails: [],
  adItemsLimit: 10,
  adItemsTotal: 0,
  adItemsPages: 1,
  currentPage: 1,
  searchItems: '',
  isLoading: false,
  error: null,

  // Selected AD State
  createADHeader: null,
  createADDetails: [],
  isEditing: false,
  isCreating: false,
  hasUnsavedChanges: false,

  // UI State
  saving: false,
  cancelDialogOpen: false,
  saveDialogOpen: false,
  deleteDialogOpen: false,
  snackbar: {
    open: false,
    message: '',
    severity: 'success',
  },
};



const safeDate = (value) => {
  if (!value) return null;

  // Already YYYY-MM-DD - return as is, NO transformation
  if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value; // <-- NO CHANGE, return exactly as received
  }

  // Date object - convert to local date string without timezone shift
  if (value instanceof Date) {
    // Use getFullYear, getMonth, getDate (local time) NOT UTC methods
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
};


// ==================== REDUCER ====================
function adReducer(state, action) {
  switch (action.type) {

    case 'LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        saving: false,
        error: action.payload,
      };

   case 'SET_ADFORM': {
    const adItemsTotal = action.payload.details?.length || 0;

    return {
      ...state,

      selectedAD: action.payload.data,
      adDetails: action.payload.details.map((row, index) => ({
        ...row,
        id: row.id || `detail_${row.AD_No}_${row.FAC_NO}_${Date.now()}_${index}`
      })),

      // IMPORTANT: reset working buffer
      createADHeader: null,
      createADDetails: [],

      isEditing: false,
      isCreating: false,

      adItemsTotal,
      adItemsPages: Math.max(1, Math.ceil(adItemsTotal / state.adItemsLimit)),

      isLoading: false,
      error: null,
    };
  }

    case 'START_EDIT':
      console.log('START_EDIT - Original xDate:', action.payload.data?.xDate);
      console.log('START_EDIT - Date type:', typeof action.payload.data?.xDate);
      
      return {
        ...state,
        isEditing: true,
        isCreating: false,
        createADHeader: {
          ...action.payload.data,
        },
        createADDetails: action.payload.details.map((row, index) => ({
          ...row,
          id: row.id || `detail_${row.AD_No}_${row.FAC_NO}_${Date.now()}_${index}`,
        })),
        hasUnsavedChanges: false,
      };

    case 'START_CREATE': {
      // Use the pre-generated AD number if available
      const newAD_No = action.payload?.generatedTR_No || '';
      const userName = action.payload?.userName || ''; 
      const todayObj = new Date();

      const today = `${todayObj.getFullYear()}-${String(
        todayObj.getMonth() + 1
      ).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      // const today = new Date().toISOString().split('T')[0];
      
      console.log('START_CREATE - Setting AD_No:', newAD_No);
      return {
        ...state,
        isCreating: true,
        isEditing: false,
        // selectedAD: null,
        // adDetails: [],

        createADHeader: {
          AD_No: newAD_No,
          Evaluated_By: userName,
          xpost: '',
          xDate: today,
          Department_Code: '',
          Remarks: '',
        },
        createADDetails: [
          {
            id: Date.now(),
            AD_No: newAD_No,
            FAC_NO: '',
            FAC_name: '',
            qty: 1,
            xDate: today,
            xpost: 0,
            UOM: '',
            brand: '',
            serialno: '',
            workDet: '',
            Disposal_Type: '',
            salvage_amount: '',
            },
        ],
        hasUnsavedChanges: false,
      };
    }
        
    // FIXED: REMOVE THE DUPLICATE CODE
    case 'ADD_DETAIL_ROW':
      // Get the new row from payload or create default
      const todayObj = new Date();
      const today = `${todayObj.getFullYear()}-${String(
        todayObj.getMonth() + 1
      ).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      const newRow = action.payload || {
        id: Date.now(),
        AD_No: '',
        FAC_NO: '',
        FAC_name: '',
        qty: 1,
        xDate: today,
        xpost: 0,
        UOM: '',
        brand: '',
        serialno: '',
        workDet: '',
        Disposal_Type: '',
        salvage_amount: '',
      };

      return {
        ...state,
        createADDetails: [...state.createADDetails, newRow],
        hasUnsavedChanges: true,
      };
      

    // FIXED: UPDATE_DETAIL_ROW to handle both create and edit modes
      case 'UPDATE_DETAIL_ROW':
        const { id, field, value } = action;
        
        console.log('Reducer - Updating row with id:', id);
        console.log('Reducer - Available row IDs:', state.createADDetails.map(r => String(r.id)));
        
        const updatedDetails = state.createADDetails.map((row) => {
          const rowId = String(row.id);
          const actionId = String(id);
          
          if (rowId === actionId) {
            console.log('Reducer - Matched row:', rowId, 'Updating field:', field, 'to:', value);
            return { ...row, [field]: value };
          }
          return row;
        });
      
      return {
        ...state,
        createADDetails: updatedDetails,
        hasUnsavedChanges: true,
      };

    // FIXED: REMOVE_DETAIL_ROW to handle both create and edit modes
    case 'REMOVE_DETAIL_ROW':

      // For EDIT mode
      if (state.createADDetails.length <= 1) {
        return state;
      }
      return {
        ...state,
        createADDetails: state.createADDetails.filter(
          (row) => row.id !== action.id
        ),
        hasUnsavedChanges: true,
      };

    case 'UPDATE_CREATE_HEADER':
      return {
        ...state,
        createADHeader: {
          ...state.createADHeader,
          [action.field]: action.value,
        },
        hasUnsavedChanges: true,
      };

    case 'CANCEL_EDIT_CREATE':
      return {
        ...state,
        // isLoading : false,
        isEditing: false,
        isCreating: false,
        createADHeader: null,
        createADDetails: [],
        hasUnsavedChanges: false,
      };

    case 'SAVE_START':
      return {
        ...state,
        saving: true,
        error: null,
      };

    case 'SHOW_SNACKBAR':
      console.log('SHOW_SNACKBAR dispatched:', action.payload);
      return {
        ...state,
        snackbar: {
          open: true,
          message: action.payload.message,
          severity: action.payload.severity || 'success',
        },
      };

    case 'HIDE_SNACKBAR':
      console.log('HIDE_SNACKBAR dispatched');
      return {
        ...state,
        snackbar: {
          ...state.snackbar,
          open: false,
        },
      };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        saving: false,
        isEditing: false,
        isCreating: false,
        createADHeader: null,
        createADDetails: [],
        hasUnsavedChanges: false,
        error: null,
        // Keep the selectedAD as the newly created one
        selectedAD: action.payload?.newADNo ? state.createADHeader : null,
        adDetails: action.payload?.newADNo ? state.createADDetails: null,
        snackbar: {
          open: true,
          message: action.payload?.message || 'Transfer Form saved successfully!',
          severity: 'success',
        },
      };

    case 'SET_PAGE':
      return {
        ...state,
        currentPage: action.payload,
      };

    case 'SET_SEARCH':
      return {
        ...state,
        searchItems: action.payload,
        currentPage: 1,
      };

    case 'OPEN_SAVE_DIALOG':  
      return {
        ...state,
        saveDialogOpen: true,
      };

    case 'CLOSE_SAVE_DIALOG':
      return {
        ...state,
        saveDialogOpen: false,
      };

    case 'OPEN_CANCEL_DIALOG':
      return {
        ...state,
        cancelDialogOpen: true,
      };

    case 'CLOSE_CANCEL_DIALOG':
      return {
        ...state,
        cancelDialogOpen: false,
      };

    case 'OPEN_DELETE_DIALOG':
      return {
        ...state,
        deleteDialogOpen: true,
      };

    case 'CLOSE_DELETE_DIALOG':
      return {
        ...state,
        deleteDialogOpen: false,
      };
    
    default:
      return state;
  }
}

// ==================== AD HOOK ====================
export const useADData = (onSaveSuccess) => {

  const [state, dispatch] = useReducer(adReducer, initialState);

  const {
    adHeaders,
    adHRefresh,
  } = useAD_h();

  const { adDetails, adDRefresh } = useAD_d();

  // =========================
  // GET AD DATA
  // =========================

  const getADData = useCallback(async (AD_No) => {
    if (!AD_No) return;
    dispatch({ type: 'LOADING' });

    try {
      const header = adHeaders.find((ad) => ad.AD_No === AD_No);
      const details = adDetails.filter((item) => item.AD_No === AD_No);

      dispatch({
        type: 'SET_ADFORM',
        payload: {
          data: header,
          details,
        },
      });
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'ERROR',
        payload: 'Failed to fetch AD data',
      });
    }

  }, [adHeaders, adDetails]);

  // =========================
  // CREATE AD
  // =========================

  const createAD = useCallback(async () => {
    if (!state.createADHeader?.AD_No) {
      console.error('AD_No is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Transfer Form number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      
      const { id, ...headerData } = state.createADHeader;
      // IMPORTANT: Only format the date if it's a new creation
      // For editing, preserve the original date format
      if (state.isCreating) {
        headerData.xDate = safeDate(headerData.xDate) || new Date().toISOString().split('T')[0];
      } else {
        // For editing, keep the original date without reformatting
        // Only ensure it's in YYYY-MM-DD format if it's a Date object
        if (headerData.xDate && typeof headerData.xDate === 'object') {
          headerData.xDate = safeDate(headerData.xDate);
        }
        // Otherwise, leave it as is
      }
      
      console.log('Header Data:', headerData);
      console.log('Is Editing Mode:', state.isEditing);
      
      // Create Header
      const res = await api.post('/ad_hRoute', headerData);
      console.log('Header saved:', res.data);
      
      const detailPayload = state.createADDetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          AD_No: state.createADHeader.AD_No,
          xDate: safeDate(cleanItem.xDate),
          qty: Number(cleanItem.qty) || 1,
          xpost: 0,
        };
      });
      
      console.log('Details Payload:', detailPayload);
      
      await api.post('/ad_dRoute', detailPayload);
      
      // ========== INCREMENT XADNum AFTER SUCCESSFUL AD CREATION ==========
      console.log('Starting XADNum increment process...');
      
      try {
        // Get current config
        const configRes = await api.get('/companyConfig');
        console.log('Full config response:', configRes.data);
        
        const currentConfig = configRes.data[0];
        console.log('Current config object:', currentConfig);
        
        // Log all available fields to see what we have
        console.log('Available fields in config:', Object.keys(currentConfig));
        
        // Get current XADNum
        const currentXTRNum = Number(currentConfig?.XADNum || 0);
        console.log('Current XADNum value:', currentXTRNum);
        
        // Calculate next number
        const nextXTRNum = currentXTRNum + 1;
        console.log('Next XADNum will be:', nextXTRNum);
        
        // Update the XADNum in the database
        const updateResponse = await api.put('/companyConfig/xad', { XADNum: nextXTRNum });
        console.log('Update response:', updateResponse.data);
        console.log('XADNum incremented successfully from', currentXTRNum, 'to', nextXTRNum);
        
      } catch (incError) {
        console.error('FAILED to increment XADNum - Full error:', incError);
        console.error('Error response data:', incError.response?.data);
        console.error('Error status:', incError.response?.status);
        // Don't fail the AD creation if increment fails, just log the error
      }
      // ========== END OF INCREMENT LOGIC ==========
      
      await adHRefresh();
      await adDRefresh();
      
        // ========== DISPLAY THE NEWLY CREATED AD ==========
      const newADNo = state.createADHeader.AD_No;
      console.log('Newly created AD_No:', newADNo);
      
      // Fetch and display the new AD
      await getADData(newADNo);
      
      dispatch({ type: 'SAVE_SUCCESS' });
      console.log('AD Created Successfully and loaded:', newADNo);
      
      // Show success message with AD number
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newADNo: newADNo,
          message: `Transfer Form ${newADNo} created successfully!`
        }
      });

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(newADNo);
      }
      console.log('FETCHED HEADER:', header);
      console.log('FETCHED DETAILS:', details);
        
    } catch (error) {
      console.error('Save Error:', error);
      console.error('Error Response:', error.response?.data);
      
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to create AD'
      });
    }
  }, [state.createADHeader, state.createADDetails, adHRefresh, adDRefresh, getADData]);

  // =========================
  // UPDATE AD
  // =========================

  // Update existing AD (not create)
  const updateAD = useCallback(async () => {
    if (!state.createADHeader?.AD_No) {
      console.error('AD_No is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Transfer Form number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      // Format header data - preserve dates WITHOUT modification
      const { id, ...headerData } = state.createADHeader;
      
      // CRITICAL FIX: Don't transform xDate at all - send exactly as is
      // The date should already be in YYYY-MM-DD format from the database
      
      console.log('Updating Header - preserving date:', headerData.xDate);
      console.log('Date type:', typeof headerData.xDate);
      
      // UPDATE Header using PUT
      await api.put(`/ad_hRoute/${state.createADHeader.AD_No}`, headerData);
      
      // Format details - PRESERVE dates exactly as they are
      const detailPayload = state.createADDetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          AD_No: state.createADHeader.AD_No,
          // DON'T transform dates - they're already in correct format// Send exactly as is
          qty: Number(cleanItem.qty) || 1,
          xpost: cleanItem.xpost || 0,
        };
      });
      
      // console.log('Updating Details with preserved dates:', detailPayload.map(d => ({ xDate: d.xDate, TargetDate: d.TargetDate })));
      
      // UPDATE Details - replace all details for this AD
      await api.put(`/ad_dRoute/${state.createADHeader.AD_No}`, detailPayload);
      
      await adHRefresh();
      await adDRefresh();
      
      // Refresh the displayed AD
      await getADData(state.createADHeader.AD_No);
      
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newADNo: state.createADHeader.AD_No,
          message: `Transfer Form ${state.createADHeader.AD_No} updated successfully!`
        }
      });
      
    } catch (error) {
      console.error('Update Error:', error);
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to update AD'
      });
    }
  }, [state.createADHeader, state.createADDetails, adHRefresh, adDRefresh, getADData]);

  // =========================
  // ACTION HELPERS
  // =========================

  const showSnackbar = (message, severity = 'success') => {
    dispatch({
      type: 'SHOW_SNACKBAR',
      payload: { message, severity }
    });
  };

  const hideSnackbar = () => {
    dispatch({ type: 'HIDE_SNACKBAR' });
  };

  const startCreate = useCallback((companyConfig, userName = '') => {

  // Ensure we have valid companyConfig
  if (!companyConfig) {
    console.error('Company config is required for creating AD');
    return;
  }
  
  // Generate the AD number immediately
  const autoNumbering = Number(companyConfig?.xAutoJO ?? 0);
  const prefix = companyConfig?.CInitial || '';
  const lastNumber = Number(companyConfig?.XADNum || 0);
  
  let newAD_No = '';
  
  if (autoNumbering === 1) {
    newAD_No = `${prefix}-AD-${String(lastNumber + 1).padStart(7, '0')}`;
  }
  
  dispatch({ 
    type: 'START_CREATE', 
    payload: {
      ...companyConfig,
      generatedTR_No: newAD_No,  // Pass the generated number
      userName: userName,
    }
  });
}, [dispatch]);

  const startEdit = (AD_No) => {
    const selectTR = adHeaders.find(ad => ad.AD_No === AD_No);
    const selectedDetails = adDetails.filter(ad => ad.AD_No === AD_No);
    dispatch({ 
      type: 'START_EDIT',
      payload: {
        data: selectTR,
        details: selectedDetails,
      }
    });
    showSnackbar('Editing mode activated', 'info');
    return {
      // ... existing returns ...
      showSnackbar,
      hideSnackbar,
    };
  };

  const cancelEditCreate = () => {
    dispatch({ type: 'CANCEL_EDIT_CREATE' });

    if (state.selectedAD?.AD_No) {
      getADData(state.selectedAD.AD_No);
    }
  };

  // FIXED: addDetailRow - using only ADD_DETAIL_ROW (no non-existent types)
  const addDetailRow = () => {
    const todayObj = new Date();
    const today = `${todayObj.getFullYear()}-${String(
      todayObj.getMonth() + 1
    ).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    const newRow = {
      id: Date.now(),
      AD_No: state.isCreating ? state.createADHeader?.AD_No || '' : state.selectedAD?.AD_No || '',
      FAC_NO: '',
      FAC_name: '',
      qty: 1,
      xDate: today,
      xpost: 0,
      UOM: '',
      brand: '',
      serialno: '',
      workDet: '',
      Disposal_Type: '',
      salvage_amount: '',
    };
    
    // Use the same action type for both create and edit
    // The reducer will handle it based on state.selectedAD
    dispatch({ type: 'ADD_DETAIL_ROW', payload: newRow });
  };

  const updateHeaderField = (field, value) => {
    dispatch({
      type: 'UPDATE_CREATE_HEADER',
      field,
      value,
    });
  };

  // FIXED: updateDetailRow - using UPDATE_DETAIL_ROW
  const updateDetailRow = (id, field, value) => {
    console.log('updateDetailRow called:', { id, field, value, isCreating: state.isCreating });
    
    dispatch({
      type: 'UPDATE_DETAIL_ROW',
      id: String(id),
      field,
      value,
    });
  };

  // FIXED: removeDetailRow
  const removeDetailRow = (id) => {
    dispatch({
      type: 'REMOVE_DETAIL_ROW',
      id,
    });
  };

  const openSaveDialog = () => {
    dispatch({ type: 'OPEN_SAVE_DIALOG' });
  };

  const closeSaveDialog = () => {
    dispatch({ type: 'CLOSE_SAVE_DIALOG' });
  };

  const openCancelDialog = () => {
    dispatch({ type: 'OPEN_CANCEL_DIALOG' });
  };

  const closeCancelDialog = () => {
    dispatch({ type: 'CLOSE_CANCEL_DIALOG' });
  };

  const openDeleteDialog = () => {
    dispatch({ type: 'OPEN_DELETE_DIALOG' });
  };

  const closeDeleteDialog = () => {
    dispatch({ type: 'CLOSE_DELETE_DIALOG' });
  };


  // saving AD - used for both create and update
  const confirmSave = async () => {
    closeSaveDialog();
    
    if (state.isCreating) {
      await createAD();
      if (onSaveSuccess && typeof onSaveSuccess === 'function') {
        const newADNo = state.createADHeader?.AD_No;
        if (newADNo) {
          onSaveSuccess(newADNo);
        }
      }
    } else if (state.isEditing) {
      await updateAD();
    }
  };

  // delete the AD row - used for both create and update (but only if it's not posted for approval)
  const confirmDelete = (rowId) => {
    // Perform the actual deletion
    if (state.createADDetails.length <= 1) {
      closeDeleteDialog();
      showSnackbar('At least one row is required', 'warning');
      return;
    }
    
    removeDetailRow(rowId);
    closeDeleteDialog();
    showSnackbar('Row deleted successfully', 'success');
  };

  const confirmCancel = () => {
    closeCancelDialog();
    cancelEditCreate();
  };

  // Add this function to your useADData hook
const forceRefreshAD = useCallback(async (AD_No) => {
  if (!AD_No) return;
  
  try {
    // Refresh the hooks first
    await adHRefresh();
    await adDRefresh();
    
    // Then fetch the updated data
    await getADData(AD_No);
    
    return true;
  } catch (error) {
    console.error('Force refresh failed:', error);
    return false;
  }
}, [adHRefresh, adDRefresh, getADData]);



  // =========================
  // RETURN
  // =========================

  return {
    state,
    dispatch,

    adHeaders,
    adDetails,

    getADData,
    forceRefreshAD,

    startCreate,
    startEdit,
    cancelEditCreate,

    addDetailRow,
    updateHeaderField,
    updateDetailRow,
    removeDetailRow,

    // dialogs
    openSaveDialog,      
    closeSaveDialog,     
    openCancelDialog,    
    closeCancelDialog, 
    openDeleteDialog,
    closeDeleteDialog,

    confirmSave,  
    confirmDelete,   
    confirmCancel,   

    showSnackbar,
    hideSnackbar,
  };
};