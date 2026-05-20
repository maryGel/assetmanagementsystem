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
  snackbar: {
    open: false,
    message: '',
    severity: 'success',
  },
};

// ==================== FIXED REDUCER ====================
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
      joDetails: action.payload.details,

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

      // const isDraft = action.payload.data?.xpost === 0;
      //   if (!isDraft) {
      //   return {
      //     ...state,
      //     isEditing: false,
      //     error: "Only draft JO can be edited",
      //   };
      // }

      return {
        ...state,
        isEditing: true,
        isCreating: false,
        createJOHeader: {
          ...action.payload.data,
        },
        createJODetails: action.payload.details.map(row => ({
          ...row,
        })),
        hasUnsavedChanges: false,
      };

    case 'START_CREATE':
      return {
        ...state,
        isCreating: true,
        isEditing: false,
        // selectedJO: null,
        // joDetails: [],

        createJOHeader: {
          JO_No: '',
          Remarks: '',
          Sector_name: '',
          Sector_Code: '',
          xDate: new Date().toISOString(),
          xpost: 0,
          Deparment_name: '',
          Deaprtment_Code: '',
          requested_by: '',
        },
        createJODetails: [
          {
            id: Date.now(),
            JO_No: '',
            FAC_NO: '',
            FAC_name: '',
            qty: 1,
            xDate: new Date().toISOString(),
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

        // createJODetails: [],

        hasUnsavedChanges: false,
      };

    // FIXED: REMOVE THE DUPLICATE CODE
    case 'ADD_DETAIL_ROW':
      // Get the new row from payload or create default
      const newRow = action.payload || {
        id: Date.now(),
        JO_No: '',
        FAC_NO: '',
        FAC_name: '',
        qty: 1,
        xDate: new Date().toISOString(),
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
      
      console.log('UPDATE_DETAIL_ROW:', { id, field, value, hasSelectedJO: !!state.selectedJO });

      // For EDIT mode
      return {
        ...state,
        createJODetails: state.createJODetails.map((row) =>
          String(row.id) === String(id)
            ? { ...row, [field]: value }
            : row
        ),
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

    case 'SAVE_SUCCESS':
      return {
        ...state,
        saving: false,
        isEditing: false,
        isCreating: false,
        createJOHeader: null,
        createJODetails: [],
        hasUnsavedChanges: false,

        snackbar: {
          open: true,
          message: 'Job Order saved successfully!',
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

    default:
      return state;
  }
}

// ==================== FIXED HOOK ====================
export const useJOData = () => {

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
    dispatch({ type: 'SAVE_START' });

    try {
      // Create Header
      const headerResponse = await api.post('/jo_hRoute', state.createJOHeader);

      // Create Details
      const detailPayload = state.createJODetails.map((item) => ({
        ...item,
        JO_No: state.createJOHeader.JO_No,
      }));

      await api.post('/jo_dRoute', detailPayload);

      dispatch({ type: 'SAVE_SUCCESS' });
      joRefresh();
      joDetailsRefresh();

      console.log('JO Created Successfully');
    } catch (error) {
      console.error(error);
      dispatch({
        type: 'ERROR',
        payload: 'Failed to create JO',
      });
    }
  }, [state.createJOHeader, state.createJODetails, joRefresh, joDetailsRefresh]);

  // =========================
  // ACTION HELPERS
  // =========================

  const startCreate = () => {
    dispatch({ type: 'START_CREATE' });
  };

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
  };

  const cancelEditCreate = () => {
    dispatch({ type: 'CANCEL_EDIT_CREATE' });

    if (state.selectedJO?.JO_No) {
      getJOData(state.selectedJO.JO_No);
    }
  };

  // FIXED: addDetailRow - using only ADD_DETAIL_ROW (no non-existent types)
  const addDetailRow = () => {
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
      xDate: new Date().toISOString(),
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
      id,
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

  // =========================
  // RETURN
  // =========================

  return {
    state,
    dispatch,

    joHeaders,
    joDetails,

    getJOData,
    createJO,

    startCreate,
    startEdit,
    cancelEditCreate,

    addDetailRow,
    updateHeaderField,
    updateDetailRow,
    removeDetailRow,
  };
};