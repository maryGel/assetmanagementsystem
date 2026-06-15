import { useReducer, useCallback } from 'react';

// Hooks
import { useAssetLostH } from './useAssetLostH';
import { useAssetLostD } from './useAssetLostD';

// Axios Instance
import { api } from '../api/axios';

const initialState = {
  // Asset Lost View State
  selectedAL: null,
  assetLostDetails: [],
  aaItemsLimit: 10,
  alItemsTotal: 0,
  alItemsPages: 1,
  currentPage: 1,
  searchItems: '',
  isLoading: false,
  error: null,

  // Selected AL State
  createALHeader: null,
  createALDetails: [],
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
function aaReducer(state, action) {
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

   case 'SET_ALForm': {
    const alItemsTotal = action.payload.details?.length || 0;

    return {
      ...state,

      selectedAL: action.payload.data,
      assetLostDetails: action.payload.details.map((row, index) => ({
        ...row,
        id: row.id || `detail_${row.AAFNo}_${row.ItemNo}_${Date.now()}_${index}`
      })),

      // IMPORTANT: reset working buffer
      createALHeader: null,
      createALDetails: [],

      isEditing: false,
      isCreating: false,

      alItemsTotal,
      alItemsPages: Math.max(1, Math.ceil(alItemsTotal / state.aaItemsLimit)),

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
        createALHeader: {
          ...action.payload.data,
        },
        createALDetails: action.payload.details.map((row, index) => ({
          ...row,
          id: row.id || `detail_${row.AAFNo}_${row.ItemNo}_${Date.now()}_${index}`,
        })),
        hasUnsavedChanges: false,
      };

    case 'START_CREATE': {
      // Use the pre-generated AL number if available
      const newAAFNo = action.payload?.generatedAA_No || '';
      const userName = action.payload?.userName || ''; 
      const todayObj = new Date();

      const today = `${todayObj.getFullYear()}-${String(
        todayObj.getMonth() + 1
      ).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
      // const today = new Date().toISOString().split('T')[0];
      
      console.log('START_CREATE - Setting AAFNo:', newAAFNo);
      return {
        ...state,
        isCreating: true,
        isEditing: false,

        createALHeader: {
          AAFNo: newAAFNo,
          Custodian: userName,
          xPosted: '',
          xDate: today,
          Dep: '',
          EmpID: '',
          EmpName: '',
          xREMARKS: ''
        },
        createALDetails: [
          {
            id: Date.now(),
            AAFNo: newAAFNo,
            ItemNo: '',
            ItemName: '',
            Qty: 1,
            DteAqui: today,
            xPosted: 0,
            Units: '',
            SERIAL: '',
            Supplier: '',
            unitcost: '',
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
        AAFNo: '',
        ItemNo: '',
        ItemName: '',
        Qty: 1,
        DteAqui: '',
        xPosted: 0,
        Units: '',
        SERIAL: '',
        Supplier: '',
        unitcost: '',
      };

      return {
        ...state,
        createALDetails: [...state.createALDetails, newRow],
        hasUnsavedChanges: true,
      };
      

    // FIXED: UPDATE_DETAIL_ROW to handle both create and edit modes
      case 'UPDATE_DETAIL_ROW':
        const { id, field, value } = action;
        
        console.log('Reducer - Updating row with id:', id);
        console.log('Reducer - Available row IDs:', state.createALDetails.map(r => String(r.id)));
        
        const updatedDetails = state.createALDetails.map((row) => {
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
        createALDetails: updatedDetails,
        hasUnsavedChanges: true,
      };

    // FIXED: REMOVE_DETAIL_ROW to handle both create and edit modes
    case 'REMOVE_DETAIL_ROW':

      // For EDIT mode
      if (state.createALDetails.length <= 1) {
        return state;
      }
      return {
        ...state,
        createALDetails: state.createALDetails.filter(
          (row) => row.id !== action.id
        ),
        hasUnsavedChanges: true,
      };

    case 'UPDATE_CREATE_HEADER':
      return {
        ...state,
        createALHeader: {
          ...state.createALHeader,
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
        createALHeader: null,
        createALDetails: [],
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
        createALHeader: null,
        createALDetails: [],
        hasUnsavedChanges: false,
        error: null,
        // Keep the selectedAL as the newly created one
        selectedAL: action.payload?.newALNo ? state.createALHeader : null,
        assetLostDetails: action.payload?.newALNo ? state.createALDetails: null,
        snackbar: {
          open: true,
          message: action.payload?.message || 'Asset Lost saved successfully!',
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

// ==================== AL HOOK ====================
export const useALData = (onSaveSuccess) => {

  const [state, dispatch] = useReducer(aaReducer, initialState);

  const { assetLostHeaders, aLostHRefresh } = useAssetLostH();

  const { assetLostDetails, aLostDRefresh } = useAssetLostD();

  // =========================
  // GET AL DATA
  // =========================

  const getALData = useCallback(async (AAFNo) => {
    if (!AAFNo) return;
    dispatch({ type: 'LOADING' });

    try {
      const header = assetLostHeaders.find((ad) => ad.AAFNo === AAFNo);
      const details = assetLostDetails.filter((item) => item.AAFNo === AAFNo);

      dispatch({
        type: 'SET_ALForm',
        payload: {
          data: header,
          details,
        },
      });
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'ERROR',
        payload: 'Failed to fetch AL data',
      });
    }

  }, [assetLostHeaders, assetLostDetails]);

  // =========================
  // CREATE AL
  // =========================

  const createAL = useCallback(async () => {
    if (!state.createALHeader?.AAFNo) {
      console.error('AAFNo is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Asset Lost number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      
      const { id, ...headerData } = state.createALHeader;
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
      const res = await api.post('/assetLostHRoute', headerData);
      console.log('Header saved:', res.data);
      
      const detailPayload = state.createALDetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          AAFNo: state.createALHeader.AAFNo,
          xDate: safeDate(cleanItem.xDate),
          Qty: Number(cleanItem.Qty) || 1,
          xPosted: 0,
        };
      });
      
      console.log('Details Payload:', detailPayload);
      
      await api.post('/assetLostDRoute', detailPayload);
      
      // ========== INCREMENT XALNum AFTER SUCCESSFUL AL CREATION ==========
      console.log('Starting XALNum increment process...');
      
      try {
        // Get current config
        const configRes = await api.get('/companyConfig');
        console.log('Full config response:', configRes.data);
        
        const currentConfig = configRes.data[0];
        console.log('Current config object:', currentConfig);
        
        // Log all available fields to see what we have
        console.log('Available fields in config:', Object.keys(currentConfig));
        
        // Get current XALNum
        const currentXTRNum = Number(currentConfig?.XALNum || 0);
        console.log('Current XALNum value:', currentXTRNum);
        
        // Calculate next number
        const nextXTRNum = currentXTRNum + 1;
        console.log('Next XALNum will be:', nextXTRNum);
        
        // Update the XALNum in the database
        const updateResponse = await api.put('/companyConfig/xal', { XALNum: nextXTRNum });
        console.log('Update response:', updateResponse.data);
        console.log('XALNum incremented successfully from', currentXTRNum, 'to', nextXTRNum);
        
      } catch (incError) {
        console.error('FAILED to increment XALNum - Full error:', incError);
        console.error('Error response data:', incError.response?.data);
        console.error('Error status:', incError.response?.status);
        // Don't fail the AL creation if increment fails, just log the error
      }
      // ========== END OF INCREMENT LOGIC ==========
      
      await aLostHRefresh();
      await aLostDRefresh();
      
        // ========== DISPLAY THE NEWLY CREATED AL ==========
      const newALNo = state.createALHeader.AAFNo;
      console.log('Newly created AAFNo:', newALNo);
      
      // Fetch and display the new AL
      await getALData(newALNo);
      
      dispatch({ type: 'SAVE_SUCCESS' });
      console.log('AL Created Successfully and loaded:', newALNo);
      
      // Show success message with AL number
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newALNo: newALNo,
          message: `Asset Lost ${newALNo} created successfully!`
        }
      });

      if (onSuccess && typeof onSuccess === 'function') {
        onSuccess(newALNo);
      }
      console.log('FETCHED HEADER:', header);
      console.log('FETCHED DETAILS:', details);
        
    } catch (error) {
      console.error('Save Error:', error);
      console.error('Error Response:', error.response?.data);
      
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to create AL'
      });
    }
  }, [state.createALHeader, state.createALDetails, aLostHRefresh, aLostDRefresh, getALData]);

  // =========================
  // UPDATE AL
  // =========================

  // Update existing AL (not create)
  const updateAL = useCallback(async () => {
    if (!state.createALHeader?.AAFNo) {
      console.error('AAFNo is missing');
      dispatch({
        type: 'ERROR',
        payload: 'Asset Lost number is required'
      });
      return;
    }

    dispatch({ type: 'SAVE_START' });

    try {
      // Format header data - preserve dates WITHOUT modification
      const { id, ...headerData } = state.createALHeader;
      
      // CRITICAL FIX: Don't transform xDate at all - send exactly as is
      // The date should already be in YYYY-MM-DD format from the database
      
      console.log('Updating Header - preserving date:', headerData.xDate);
      console.log('Date type:', typeof headerData.xDate);
      
      // UPDATE Header using PUT
      await api.put(`/assetLostHRoute/${state.createALHeader.AAFNo}`, headerData);
      
      // Format details - PRESERVE dates exactly as they are
      const detailPayload = state.createALDetails.map((item) => {
        const { id, ...cleanItem } = item;
        return {
          ...cleanItem,
          AAFNo: state.createALHeader.AAFNo,
          xDate: safeDate(cleanItem.xDate),
          Qty: Number(cleanItem.Qty) || 1,
          xPosted: cleanItem.xPosted || 0,
        };
      });
      
      // console.log('Updating Details with preserved dates:', detailPayload.map(d => ({ xDate: d.xDate, TargetDate: d.TargetDate })));
      
      // UPDATE Details - replace all details for this AL
      await api.put(`/assetLostDRoute/${state.createALHeader.AAFNo}`, detailPayload);
      
      await aLostHRefresh();
      await aLostDRefresh();
      
      // Refresh the displayed AL
      await getALData(state.createALHeader.AAFNo);
      
      dispatch({ 
        type: 'SAVE_SUCCESS',
        payload: {
          newALNo: state.createALHeader.AAFNo,
          message: `Asset Lost ${state.createALHeader.AAFNo} updated successfully!`
        }
      });
      
    } catch (error) {
      console.error('Update Error:', error);
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || 'Failed to update AL'
      });
    }
  }, [state.createALHeader, state.createALDetails, aLostHRefresh, aLostDRefresh, getALData]);

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
    console.error('Company config is required for creating AL');
    return;
  }
  
  // Generate the AL number immediately
  const autoNumbering = Number(companyConfig?.xAutoJO ?? 0);
  const prefix = companyConfig?.CInitial || '';
  const lastNumber = Number(companyConfig?.XALNum || 0);
  
  let newAAFNo = '';
  
  if (autoNumbering === 1) {
    newAAFNo = `${prefix}-AL-${String(lastNumber + 1).padStart(7, '0')}`;
  }
  
  dispatch({ 
    type: 'START_CREATE', 
    payload: {
      ...companyConfig,
      generatedAA_No: newAAFNo,  // Pass the generated number
      userName: userName,
    }
  });
}, [dispatch]);

  const startEdit = (AAFNo) => {
    const selectAA = assetLostHeaders.find(aa => aa.AAFNo === AAFNo);
    const selectedDetails = assetLostDetails.filter(aa => aa.AAFNo === AAFNo);
    dispatch({ 
      type: 'START_EDIT',
      payload: {
        data: selectAA,
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

    if (state.selectedAL?.AAFNo) {
      getALData(state.selectedAL.AAFNo);
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
      AAFNo: state.isCreating ? state.createALHeader?.AAFNo || '' : state.selectedAL?.AAFNo || '',
      ItemNo: '',
      ItemName: '',
      Qty: 1,
      xDate: today,
      xPosted: 0,
      Units: '',
      SERIAL: '',
      Supplier: '',
      unitcost: '',
    };
    
    // Use the same action type for both create and edit
    // The reducer will handle it based on state.selectedAL
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


  // saving AL - used for both create and update
  const confirmSave = async () => {
    closeSaveDialog();
    
    if (state.isCreating) {
      await createAL();
      if (onSaveSuccess && typeof onSaveSuccess === 'function') {
        const newALNo = state.createALHeader?.AAFNo;
        if (newALNo) {
          onSaveSuccess(newALNo);
        }
      }
    } else if (state.isEditing) {
      await updateAL();
    }
  };

  // delete the AL row - used for both create and update (but only if it's not posted for approval)
  const confirmDelete = (rowId) => {
    // Perform the actual deletion
    if (state.createALDetails.length <= 1) {
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

  // Add this function to your useALData hook
const forceRefreshAL = useCallback(async (AAFNo) => {
  if (!AAFNo) return;
  
  try {
    // Refresh the hooks first
    await aLostHRefresh();
    await aLostDRefresh();
    
    // Then fetch the updated data
    await getALData(AAFNo);
    
    return true;
  } catch (error) {
    console.error('Force refresh failed:', error);
    return false;
  }
}, [aLostHRefresh, aLostDRefresh, getALData]);



  // =========================
  // RETURN
  // =========================

  return {
    state,
    dispatch,

    assetLostHeaders,
    assetLostDetails,

    getALData,
    forceRefreshAL,

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