import { useReducer, useCallback } from 'react';

// Hooks
import { useJO_h } from './useJO_h';
import { useJO_d } from './useJO_d';

// Axios Instance
import { api } from '../api/axios';

const initialState = {
  // Job Order View State
  selectedJO: null,
  joDetails: [],
  joItemsLimit: 10,
  joItemsTotal: 0,
  joItemsPages: 1,
  currentPage: 1,
  searchItems: '',
  isLoading: false,
  error: null,

  // Selected JO State
  createJOHeader: null,
  createJODetails: [],
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
function joReducer(state, action) {
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

   case 'SET_JOFORM': {
    const joItemsTotal = action.payload.details?.length || 0;

    return {
      ...state,

      selectedJO: action.payload.data,
      joDetails: action.payload.details.map((row, index) => ({
        ...row,
        id: row.id || `detail_${row.JO_No}_${row.FAC_NO}_${Date.now()}_${index}`
      })),

      // IMPORTANT: reset working buffer
      createJOHeader: null,
      createJODetails: [],

      isEditing: false,
      isCreating: false,

      joItemsTotal,
      joItemsPages: Math.max(1, Math.ceil(joItemsTotal / state.joItemsLimit)),

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
        createJOHeader: {
          ...action.payload.data,
        },
        createJODetails: action.payload.details.map((row, index) => ({
          ...row,
          id: row.id || `detail_${row.JO_No}_${row.FAC_NO}_${Date.now()}_${index}`,
        })),
        hasUnsavedChanges: false,
      };

    case 'START_CREATE': {
      // Use the pre-generated JO number if available
      const newJO_No = action.payload?.generatedJO_No || '';
      const requestedBy = action.payload?.requestedBy || ''; 
      const todayObj = new Date();

      const today = `${todayObj.getFullYear()}-${String(
        todayObj.getMonth() + 1
      ).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      // const today = new Date().toISOString().split('T')[0];
      
      console.log('START_CREATE - Setting JO_No:', newJO_No);
      return {
        ...state,
        isCreating: true,
        isEditing: false,
        // selectedJO: null,
        // joDetails: [],

        createJOHeader: {
          JO_No: newJO_No,
          Remarks: '',
          Sector_name: '',
          Sector_Code: '',
          xDate: today,
          xpost: 0,
          Deparment_name: '',
          Department_Code: '',
          requested_by: requestedBy,
        },
        createJODetails: [
          {
            id: Date.now(),
            JO_No: newJO_No,
            FAC_NO: '',
            FAC_name: '',
            qty: 1,
            xDate: today,
            xpost: 0,
            UOM: '',
            brand: '',
            serialNo: '',
            workDet: '',
            TargetDate: '',
            Status: 'OPEN',
            ItemLocation: '',
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
        JO_No: '',
        FAC_NO: '',
        FAC_name: '',
        qty: 1,
        xDate: today,
        xpost: 0,
        UOM: '',
        brand: '',
        serialNo: '',
        workDet: '',
        TargetDate: '',
        Status: 'OPEN',
        ItemLocation: '',
      };

      return {
        ...state,
        createJODetails: [...state.createJODetails, newRow],
        hasUnsavedChanges: true,
      };
      

    // FIXED: UPDATE_DETAIL_ROW to handle both create and edit modes
      case 'UPDATE_DETAIL_ROW':
        const { id, field, value } = action;
        
        console.log('Reducer - Updating row with id:', id);
        console.log('Reducer - Available row IDs:', state.createJODetails.map(r => String(r.id)));
        
        const updatedDetails = state.createJODetails.map((row) => {
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
        createJODetails: updatedDetails,
        hasUnsavedChanges: true,
      };

    // FIXED: REMOVE_DETAIL_ROW to handle both create and edit modes
    case 'REMOVE_DETAIL_ROW':

      // For EDIT mode
      if (state.createJODetails.length <= 1) {
        return state;
      }
      return {
        ...state,
        createJODetails: state.createJODetails.filter(
          (row) => row.id !== action.id
        ),
        hasUnsavedChanges: true,
      };

    case 'UPDATE_CREATE_HEADER':
      return {
        ...state,
        createJOHeader: {
          ...state.createJOHeader,
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
        createJOHeader: null,
        createJODetails: [
        ],
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
        createJOHeader: null,
        createJODetails: [],
        hasUnsavedChanges: false,
        error: null,
        // Keep the selectedJO as the newly created one
        selectedJO: action.payload?.newJONo ? state.createJOHeader : null,
        joDetails: action.payload?.newJONo ? state.createJODetails: null,
        snackbar: {
          open: true,
          message: action.payload?.message || 'Job Order saved successfully!',
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

// ==================== FIXED HOOK ====================
export const useJOData = (onSaveSuccess) => {

  const [state, dispatch] = useReducer(joReducer, initialState);

  const {
    joHeaders,
    joRefresh,
  } = useJO_h();

  const { joDetails, joDetailsRefresh } = useJO_d();

  // =========================
  // GET JO DATA
  // =========================

  const getJOData = useCallback(async (JO_No) => {
    if (!JO_No) return;
    dispatch({ type: 'LOADING' });

    try {
      const header = joHeaders.find((jo) => jo.JO_No === JO_No);
      const details = joDetails.filter((item) => item.JO_No === JO_No);

      dispatch({
        type: 'SET_JOFORM',
        payload: {
          data: header,
          details,
        },
      });
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'ERROR',
        payload: 'Failed to fetch JO data',
      });
    }

  }, [joHeaders, joDetails]);

  // =========================
  // CREATE JO
  // =========================

  const createJO = useCallback(async () => {
    if (!state.createJOHeader?.JO_No) {
      console.error('JO_No is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Job Order number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      // const safeDate = (dateString) => {
      //   if (!dateString) return null;
        
      //   // If it's already in YYYY-MM-DD format, return as is
      //   if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      //     return dateString;
      //   }
        
      //   const date = new Date(dateString);
      //   if (isNaN(date.getTime())) return null;
        
      //   // Use UTC to avoid timezone shift
      //   const year = date.getUTCFullYear();
      //   const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      //   const day = String(date.getUTCDate()).padStart(2, '0');
        
      //   return `${year}-${month}-${day}`;
      // };
      
      const { id, ...headerData } = state.createJOHeader;
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
      const res = await api.post('/jo_hRoute', headerData);
      console.log('Header saved:', res.data);
      
      const detailPayload = state.createJODetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          JO_No: state.createJOHeader.JO_No,
          xDate: safeDate(cleanItem.xDate),
          TargetDate: cleanItem.TargetDate ? safeDate(cleanItem.TargetDate) : null,
          qty: Number(cleanItem.qty) || 1,
          xpost: 0,
        };
      });
      
      console.log('Details Payload:', detailPayload);
      
      await api.post('/jo_dRoute', detailPayload);
      
      // ========== INCREMENT XJONum AFTER SUCCESSFUL JO CREATION ==========
      console.log('Starting XJONum increment process...');
      
      try {
        // Get current config
        const configRes = await api.get('/companyConfig');
        console.log('Full config response:', configRes.data);
        
        const currentConfig = configRes.data[0];
        console.log('Current config object:', currentConfig);
        
        // Log all available fields to see what we have
        console.log('Available fields in config:', Object.keys(currentConfig));
        
        // Get current XJONum
        const currentXJONum = Number(currentConfig?.XJONum || 0);
        console.log('Current XJONum value:', currentXJONum);
        
        // Calculate next number
        const nextXJONum = currentXJONum + 1;
        console.log('Next XJONum will be:', nextXJONum);
        
        // Update the XJONum in the database
        const updateResponse = await api.put('/companyConfig/xjo', { XJONum: nextXJONum });
        console.log('Update response:', updateResponse.data);
        console.log('XJONum incremented successfully from', currentXJONum, 'to', nextXJONum);
        
      } catch (incError) {
        console.error('FAILED to increment XJONum - Full error:', incError);
        console.error('Error response data:', incError.response?.data);
        console.error('Error status:', incError.response?.status);
        // Don't fail the JO creation if increment fails, just log the error
      }
      // ========== END OF INCREMENT LOGIC ==========
      
      await joRefresh();
      await joDetailsRefresh();
      
        // ========== DISPLAY THE NEWLY CREATED JO ==========
      const newJONo = state.createJOHeader.JO_No;
      console.log('Newly created JO_No:', newJONo);
      
      // Fetch and display the new JO
      await getJOData(newJONo);
      
      dispatch({ type: 'SAVE_SUCCESS' });
      console.log('JO Created Successfully and loaded:', newJONo);
      
      // Show success message with JO number
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newJONo: newJONo,
          message: `Job Order ${newJONo} created successfully!`
        }
      });

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(newJONo);
      }
      console.log('FETCHED HEADER:', header);
      console.log('FETCHED DETAILS:', details);
        
    } catch (error) {
      console.error('Save Error:', error);
      console.error('Error Response:', error.response?.data);
      
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to create JO'
      });
    }
  }, [state.createJOHeader, state.createJODetails, joRefresh, joDetailsRefresh, getJOData]);

  // =========================
  // UPDATE JO
  // =========================

  // Update existing JO (not create)
  const updateJO = useCallback(async () => {
    if (!state.createJOHeader?.JO_No) {
      console.error('JO_No is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Job Order number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      // Format header data - preserve dates WITHOUT modification
      const { id, ...headerData } = state.createJOHeader;
      
      // CRITICAL FIX: Don't transform xDate at all - send exactly as is
      // The date should already be in YYYY-MM-DD format from the database
      
      console.log('Updating Header - preserving date:', headerData.xDate);
      console.log('Date type:', typeof headerData.xDate);
      
      // UPDATE Header using PUT
      await api.put(`/jo_hRoute/${state.createJOHeader.JO_No}`, headerData);
      
      // Format details - PRESERVE dates exactly as they are
      const detailPayload = state.createJODetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          JO_No: state.createJOHeader.JO_No,
          // DON'T transform dates - they're already in correct format
          xDate: cleanItem.xDate,  // Send exactly as is
          TargetDate: cleanItem.TargetDate,  // Send exactly as is
          qty: Number(cleanItem.qty) || 1,
          xpost: cleanItem.xpost || 0,
        };
      });
      
      console.log('Updating Details with preserved dates:', detailPayload.map(d => ({ xDate: d.xDate, TargetDate: d.TargetDate })));
      
      // UPDATE Details - replace all details for this JO
      await api.put(`/jo_dRoute/${state.createJOHeader.JO_No}`, detailPayload);
      
      await joRefresh();
      await joDetailsRefresh();
      
      // Refresh the displayed JO
      await getJOData(state.createJOHeader.JO_No);
      
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newJONo: state.createJOHeader.JO_No,
          message: `Job Order ${state.createJOHeader.JO_No} updated successfully!`
        }
      });
      
    } catch (error) {
      console.error('Update Error:', error);
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to update JO'
      });
    }
  }, [state.createJOHeader, state.createJODetails, joRefresh, joDetailsRefresh, getJOData]);

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

  const startCreate = useCallback((companyConfig, requestedBy = '') => {

  // Ensure we have valid companyConfig
  if (!companyConfig) {
    console.error('Company config is required for creating JO');
    return;
  }
  
  // Generate the JO number immediately
  const autoNumbering = Number(companyConfig?.xAutoJO ?? 0);
  const prefix = companyConfig?.CInitial || '';
  const lastNumber = Number(companyConfig?.XJONum || 0);
  
  let newJO_No = '';
  
  if (autoNumbering === 1) {
    newJO_No = `${prefix}-JO-${String(lastNumber + 1).padStart(7, '0')}`;
  }
  
  dispatch({ 
    type: 'START_CREATE', 
    payload: {
      ...companyConfig,
      generatedJO_No: newJO_No,  // Pass the generated number
      requestedBy: requestedBy 
    }
  });
}, [dispatch]);

  const startEdit = (JO_No) => {
    const selectJO = joHeaders.find(jo => jo.JO_No === JO_No);
    const selectedDetails = joDetails.filter(jo => jo.JO_No === JO_No);
    dispatch({ 
      type: 'START_EDIT',
      payload: {
        data: selectJO,
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

    if (state.selectedJO?.JO_No) {
      getJOData(state.selectedJO.JO_No);
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
      JO_No: state.isCreating ? state.createJOHeader?.JO_No || '' : state.selectedJO?.JO_No || '',
      FAC_NO: '',
      FAC_name: '',
      qty: 1,
      UOM: '',
      workDet: '',
      TargetDate: '',
      Status: 'OPEN',
      brand: '',
      serialNo: '',
      ItemLocation: '',
      xDate: today,
      xpost: 0,
    };
    
    // Use the same action type for both create and edit
    // The reducer will handle it based on state.selectedJO
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


  // saving JO - used for both create and update
  const confirmSave = async () => {
    closeSaveDialog();
    
    if (state.isCreating) {
      await createJO();
      if (onSaveSuccess && typeof onSaveSuccess === 'function') {
        const newJONo = state.createJOHeader?.JO_No;
        if (newJONo) {
          onSaveSuccess(newJONo);
        }
      }
    } else if (state.isEditing) {
      await updateJO();
    }
  };

  // delete the JO row - used for both create and update (but only if it's not posted for approval)
  const confirmDelete = (rowId) => {
    // Perform the actual deletion
    if (state.createJODetails.length <= 1) {
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

  // Add this function to your useJOData hook
const forceRefreshJO = useCallback(async (JO_No) => {
  if (!JO_No) return;
  
  try {
    // Refresh the hooks first
    await joRefresh();
    await joDetailsRefresh();
    
    // Then fetch the updated data
    await getJOData(JO_No);
    
    return true;
  } catch (error) {
    console.error('Force refresh failed:', error);
    return false;
  }
}, [joRefresh, joDetailsRefresh, getJOData]);



  // =========================
  // RETURN
  // =========================

  return {
    state,
    dispatch,

    joHeaders,
    joDetails,

    getJOData,
    forceRefreshJO,

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