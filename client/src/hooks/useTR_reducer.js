import { useReducer, useCallback } from 'react';

// Hooks
import { useTR_h } from './useTR_h';
import { useTR_d } from './useTR_d';

// Axios Instance
import { api } from '../api/axios';

const initialState = {
  // Transfer Form View State
  selectedTR: null,
  trDetails: [],
  trItemsLimit: 10,
  trItemsTotal: 0,
  trItemsPages: 1,
  currentPage: 1,
  searchItems: '',
  isLoading: false,
  error: null,

  // Selected TR State
  createTRHeader: null,
  createTRDetails: [],
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
function trReducer(state, action) {
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

   case 'SET_TRFORM': {
    const trItemsTotal = action.payload.details?.length || 0;

    return {
      ...state,

      selectedTR: action.payload.data,
      trDetails: action.payload.details.map((row, index) => ({
        ...row,
        id: row.id || `detail_${row.TR_No}_${row.FAC_NO}_${Date.now()}_${index}`
      })),

      // IMPORTANT: reset working buffer
      createTRHeader: null,
      createTRDetails: [],

      isEditing: false,
      isCreating: false,

      trItemsTotal,
      trItemsPages: Math.max(1, Math.ceil(trItemsTotal / state.trItemsLimit)),

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
        createTRHeader: {
          ...action.payload.data,
        },
        createTRDetails: action.payload.details.map((row, index) => ({
          ...row,
          id: row.id || `detail_${row.TR_No}_${row.FAC_NO}_${Date.now()}_${index}`,
        })),
        hasUnsavedChanges: false,
      };

    case 'START_CREATE': {
      // Use the pre-generated TR number if available
      const newTR_No = action.payload?.generatedTR_No || '';
      const custodian = action.payload?.custodian || ''; 
      const todayObj = new Date();

      const today = `${todayObj.getFullYear()}-${String(
        todayObj.getMonth() + 1
      ).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      // const today = new Date().toISOString().split('T')[0];
      
      console.log('START_CREATE - Setting TR_No:', newTR_No);
      return {
        ...state,
        isCreating: true,
        isEditing: false,
        // selectedTR: null,
        // trDetails: [],

        createTRHeader: {
          TR_No: newTR_No,
          Custodian: custodian,
          xpost: '',
          xDate: today,
          Department: '',
          Remarks: '',
          Holder: '',
          Location: '',
        },
        createTRDetails: [
          {
            id: Date.now(),
            TR_No: newTR_No,
            FAC_NO: '',
            FAC_name: '',
            qty: 1,
            // xDate: today,
            xpost: 0,
            UOM: '',
            brand: '',
            serial_no: '',
            Date_Aq: '',
            Amount_aq: '',
            New_Department: '',
            Holder: '',
            location: '',
            Orig_Department: '',
            New_Holder: '',
            New_Location: '',
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
        TR_No: '',
        FAC_NO: '',
        FAC_name: '',
        qty: 1,
        // xDate: today,
        xpost: 0,
        UOM: '',
        brand: '',
        serial_no: '',
        Date_Aq: '',
        Amount_aq: '',
        New_Department: '',
        Holder: '',
        location: '',
        Orig_Department: '',
        New_Holder: '',
        New_Location: '',
      };

      return {
        ...state,
        createTRDetails: [...state.createTRDetails, newRow],
        hasUnsavedChanges: true,
      };
      

    // FIXED: UPDATE_DETAIL_ROW to handle both create and edit modes
      case 'UPDATE_DETAIL_ROW':
        const { id, field, value } = action;
        
        console.log('Reducer - Updating row with id:', id);
        console.log('Reducer - Available row IDs:', state.createTRDetails.map(r => String(r.id)));
        
        const updatedDetails = state.createTRDetails.map((row) => {
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
        createTRDetails: updatedDetails,
        hasUnsavedChanges: true,
      };

    // FIXED: REMOVE_DETAIL_ROW to handle both create and edit modes
    case 'REMOVE_DETAIL_ROW':

      // For EDIT mode
      if (state.createTRDetails.length <= 1) {
        return state;
      }
      return {
        ...state,
        createTRDetails: state.createTRDetails.filter(
          (row) => row.id !== action.id
        ),
        hasUnsavedChanges: true,
      };

    case 'UPDATE_CREATE_HEADER':
      return {
        ...state,
        createTRHeader: {
          ...state.createTRHeader,
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
        createTRHeader: null,
        createTRDetails: [],
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
        createTRHeader: null,
        createTRDetails: [],
        hasUnsavedChanges: false,
        error: null,
        // Keep the selectedTR as the newly created one
        selectedTR: action.payload?.newTRNo ? state.createTRHeader : null,
        trDetails: action.payload?.newTRNo ? state.createTRDetails: null,
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

// ==================== TR HOOK ====================
export const useTRData = (onSaveSuccess) => {

  const [state, dispatch] = useReducer(trReducer, initialState);

  const {
    trHeaders,
    trHRefresh,
  } = useTR_h();

  const { trDetails, trDRefresh } = useTR_d();

  // =========================
  // GET TR DATA
  // =========================

  const getTRData = useCallback(async (TR_No) => {
    if (!TR_No) return;
    dispatch({ type: 'LOADING' });

    try {
      const header = trHeaders.find((tr) => tr.TR_No === TR_No);
      const details = trDetails.filter((item) => item.TR_No === TR_No);

      dispatch({
        type: 'SET_TRFORM',
        payload: {
          data: header,
          details,
        },
      });
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'ERROR',
        payload: 'Failed to fetch TR data',
      });
    }

  }, [trHeaders, trDetails]);

  // =========================
  // CREATE TR
  // =========================

  const createTR = useCallback(async () => {
    if (!state.createTRHeader?.TR_No) {
      console.error('TR_No is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Transfer Form number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      
      const { id, ...headerData } = state.createTRHeader;
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
      const res = await api.post('/tr_hRoute', headerData);
      console.log('Header saved:', res.data);
      
      const detailPayload = state.createTRDetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          TR_No: state.createTRHeader.TR_No,
          qty: Number(cleanItem.qty) || 1,
          xpost: 0,
        };
      });
      
      console.log('Details Payload:', detailPayload);
      
      await api.post('/tr_dRoute', detailPayload);
      
      // ========== INCREMENT XTRNum AFTER SUCCESSFUL TR CREATION ==========
      console.log('Starting XTRNum increment process...');
      
      try {
        // Get current config
        const configRes = await api.get('/companyConfig');
        console.log('Full config response:', configRes.data);
        
        const currentConfig = configRes.data[0];
        console.log('Current config object:', currentConfig);
        
        // Log all available fields to see what we have
        console.log('Available fields in config:', Object.keys(currentConfig));
        
        // Get current XTRNum
        const currentXTRNum = Number(currentConfig?.XTRNum || 0);
        console.log('Current XTRNum value:', currentXTRNum);
        
        // Calculate next number
        const nextXTRNum = currentXTRNum + 1;
        console.log('Next XTRNum will be:', nextXTRNum);
        
        // Update the XTRNum in the database
        const updateResponse = await api.put('/companyConfig/xtr', { XTRNum: nextXTRNum });
        console.log('Update response:', updateResponse.data);
        console.log('XTRNum incremented successfully from', currentXTRNum, 'to', nextXTRNum);
        
      } catch (incError) {
        console.error('FAILED to increment XTRNum - Full error:', incError);
        console.error('Error response data:', incError.response?.data);
        console.error('Error status:', incError.response?.status);
        // Don't fail the TR creation if increment fails, just log the error
      }
      // ========== END OF INCREMENT LOGIC ==========
      
      await trHRefresh();
      await trDRefresh();
      
        // ========== DISPLAY THE NEWLY CREATED TR ==========
      const newTRNo = state.createTRHeader.TR_No;
      console.log('Newly created TR_No:', newTRNo);
      
      // Fetch and display the new TR
      await getTRData(newTRNo);
      
      dispatch({ type: 'SAVE_SUCCESS' });
      console.log('TR Created Successfully and loaded:', newTRNo);
      
      // Show success message with TR number
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newTRNo: newTRNo,
          message: `Transfer Form ${newTRNo} created successfully!`
        }
      });

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(newTRNo);
      }
      console.log('FETCHED HEADER:', header);
      console.log('FETCHED DETAILS:', details);
        
    } catch (error) {
      console.error('Save Error:', error);
      console.error('Error Response:', error.response?.data);
      
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to create TR'
      });
    }
  }, [state.createTRHeader, state.createTRDetails, trHRefresh, trDRefresh, getTRData]);

  // =========================
  // UPDATE TR
  // =========================

  // Update existing TR (not create)
  const updateTR = useCallback(async () => {
    if (!state.createTRHeader?.TR_No) {
      console.error('TR_No is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Transfer Form number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      // Format header data - preserve dates WITHOUT modification
      const { id, ...headerData } = state.createTRHeader;
      
      // CRITICAL FIX: Don't transform xDate at all - send exactly as is
      // The date should already be in YYYY-MM-DD format from the database
      
      console.log('Updating Header - preserving date:', headerData.xDate);
      console.log('Date type:', typeof headerData.xDate);
      
      // UPDATE Header using PUT
      await api.put(`/tr_hRoute/${state.createTRHeader.TR_No}`, headerData);
      
      // Format details - PRESERVE dates exactly as they are
      const detailPayload = state.createTRDetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          TR_No: state.createTRHeader.TR_No,
          // DON'T transform dates - they're already in correct format// Send exactly as is
          qty: Number(cleanItem.qty) || 1,
          xpost: cleanItem.xpost || 0,
        };
      });
      
      // console.log('Updating Details with preserved dates:', detailPayload.map(d => ({ xDate: d.xDate, TargetDate: d.TargetDate })));
      
      // UPDATE Details - replace all details for this TR
      await api.put(`/tr_dRoute/${state.createTRHeader.TR_No}`, detailPayload);
      
      await trHRefresh();
      await trDRefresh();
      
      // Refresh the displayed TR
      await getTRData(state.createTRHeader.TR_No);
      
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newTRNo: state.createTRHeader.TR_No,
          message: `Transfer Form ${state.createTRHeader.TR_No} updated successfully!`
        }
      });
      
    } catch (error) {
      console.error('Update Error:', error);
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to update TR'
      });
    }
  }, [state.createTRHeader, state.createTRDetails, trHRefresh, trDRefresh, getTRData]);

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

  const startCreate = useCallback((companyConfig, custodian = '') => {

  // Ensure we have valid companyConfig
  if (!companyConfig) {
    console.error('Company config is required for creating TR');
    return;
  }
  
  // Generate the TR number immediately
  const autoNumbering = Number(companyConfig?.xAutoJO ?? 0);
  const prefix = companyConfig?.CInitial || '';
  const lastNumber = Number(companyConfig?.XTRNum || 0);
  
  let newTR_No = '';
  
  if (autoNumbering === 1) {
    newTR_No = `${prefix}-TR-${String(lastNumber + 1).padStart(7, '0')}`;
  }
  
  dispatch({ 
    type: 'START_CREATE', 
    payload: {
      ...companyConfig,
      generatedTR_No: newTR_No,  // Pass the generated number
      custodian: custodian,
    }
  });
}, [dispatch]);

  const startEdit = (TR_No) => {
    const selectTR = trHeaders.find(tr => tr.TR_No === TR_No);
    const selectedDetails = trDetails.filter(tr => tr.TR_No === TR_No);
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

    if (state.selectedTR?.TR_No) {
      getTRData(state.selectedTR.TR_No);
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
      TR_No: state.isCreating ? state.createTRHeader?.TR_No || '' : state.selectedTR?.TR_No || '',
      FAC_NO: '',
      FAC_name: '',
      qty: 1,
      // xDate: today,
      xpost: 0,
      UOM: '',
      brand: '',
      serial_no: '',
      Date_Aq: '',
      Amount_aq: '',
      New_Department: '',
      Holder: '',
      location: '',
      Orig_Department: '',
      New_Holder: '',
      New_Location: '',
    };
    
    // Use the same action type for both create and edit
    // The reducer will handle it based on state.selectedTR
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


  // saving TR - used for both create and update
  const confirmSave = async () => {
    closeSaveDialog();
    
    if (state.isCreating) {
      await createTR();
      if (onSaveSuccess && typeof onSaveSuccess === 'function') {
        const newTRNo = state.createTRHeader?.TR_No;
        if (newTRNo) {
          onSaveSuccess(newTRNo);
        }
      }
    } else if (state.isEditing) {
      await updateTR();
    }
  };

  // delete the TR row - used for both create and update (but only if it's not posted for approval)
  const confirmDelete = (rowId) => {
    // Perform the actual deletion
    if (state.createTRDetails.length <= 1) {
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

  // Add this function to your useTRData hook
const forceRefreshTR = useCallback(async (TR_No) => {
  if (!TR_No) return;
  
  try {
    // Refresh the hooks first
    await trHRefresh();
    await trDRefresh();
    
    // Then fetch the updated data
    await getTRData(TR_No);
    
    return true;
  } catch (error) {
    console.error('Force refresh failed:', error);
    return false;
  }
}, [trHRefresh, trDRefresh, getTRData]);



  // =========================
  // RETURN
  // =========================

  return {
    state,
    dispatch,

    trHeaders,
    trDetails,

    getTRData,
    forceRefreshTR,

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