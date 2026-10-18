import { useReducer, useCallback } from 'react';
import { api } from '../api/axios';

export const RS_STATUS = { DRAFT: 0, POSTED: 3 };

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// A row is valid when qtyToReturn is a number > 0 and not more than the borrowed Qty
export const isQtyValid = (row) => {
  const q = Number(row.qtyToReturn);
  return row.qtyToReturn !== '' && q > 0 && q <= Number(row.Qty);
};

/*
  mode:
    'search' = default. Filters come from returnitem; GO lists existing return slips.
    'create' = filters come from assestaccd/assestacch; Generate lists borrowed assets to check and save.
    'view'   = one saved/posted return slip (opened from the search list or right after saving).
*/
export const initialState = {
  mode: 'search',

  // Filter options + selected filters (items: { ItemNo, ItemName } | null, employee: string | null)
  items: [],
  employees: [],
  lookupsLoading: false,
  filters: { item: null, employee: null },

  // Search mode results
  searchRows: [],
  searched: false,

  // Create mode table (with checkboxes)
  rows: [],
  generated: false,

  generating: false,

  // View mode
  rsNo: null,
  slipLines: [],

  saving: false,
  posting: false,
  error: null,

  saveDialogOpen: false,
  postDialogOpen: false,

  snackbar: { open: false, message: '', severity: 'success' },
};

const noFilters = { item: null, employee: null };

export function rsReducer(state, action) {
  switch (action.type) {
    case 'LOOKUPS_START':
      return { ...state, lookupsLoading: true, error: null };

    case 'LOOKUPS_SUCCESS':
      return {
        ...state,
        lookupsLoading: false,
        items: action.payload.items || [],
        employees: action.payload.employees || [],
      };

    case 'SET_FILTER':
      // Changing a filter invalidates whatever was generated / searched
      return {
        ...state,
        filters: { ...state.filters, [action.name]: action.value },
        rows: [],
        generated: false,
        searchRows: [],
        searched: false,
        error: null,
      };

    case 'CLEAR_FILTERS':
      return { ...state, filters: noFilters, rows: [], generated: false, searchRows: [], searched: false };

    case 'GENERATE_START':
      return { ...state, generating: true, error: null, rows: [], generated: false, searchRows: [], searched: false };

    // Create mode: borrowed assets, each row gets a checkbox + user inputs
    case 'GENERATE_SUCCESS':
      return {
        ...state,
        generating: false,
        generated: true,
        rows: action.payload.map((r, i) => ({
          ...r,
          id: `${r.AAFNo}_${r.ItemNo}_${i}`,
          selected: false,
          returnDate: todayStr(),           // user input, default today
          qtyToReturn: String(r.Qty ?? ''), // user input, number only
        })),
      };

    // Search mode: existing return slip lines
    case 'SEARCH_SUCCESS':
      return { ...state, generating: false, searched: true, searchRows: action.payload };

    case 'START_CREATE':
      return { ...initialState, mode: 'create' };

    case 'CANCEL_CREATE':
      return { ...initialState, mode: 'search' };

    case 'TOGGLE_ROW':
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === action.id ? { ...r, selected: !r.selected } : r)),
      };

    case 'TOGGLE_ALL': {
      const allSelected = state.rows.length > 0 && state.rows.every((r) => r.selected);
      return { ...state, rows: state.rows.map((r) => ({ ...r, selected: !allSelected })) };
    }

    case 'UPDATE_ROW': {
      const value = action.field === 'qtyToReturn'
        ? String(action.value).replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1') // numbers only
        : action.value;
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === action.id ? { ...r, [action.field]: value } : r)),
      };
    }

    case 'SAVE_START':
      return { ...state, saving: true, error: null };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        saving: false,
        mode: 'view',
        rsNo: action.payload.rsNo,
        slipLines: action.payload.lines,
        filters: noFilters,
        rows: [],
        generated: false,
        searchRows: [],
        searched: false,
        saveDialogOpen: false,
        snackbar: { open: true, message: action.payload.message, severity: 'success' },
      };

    case 'SET_SLIP':
      return { ...state, mode: 'view', rsNo: action.payload.rsNo, slipLines: action.payload.lines };

    // Back to the search list; filters and results are kept
    case 'CLOSE_VIEW':
      return { ...state, mode: 'search', rsNo: null, slipLines: [] };

    case 'POST_START':
      return { ...state, posting: true, error: null };

    case 'POST_SUCCESS':
      return {
        ...state,
        posting: false,
        postDialogOpen: false,
        slipLines: state.slipLines.map((l) => ({ ...l, xPosted: RS_STATUS.POSTED })),
        snackbar: { open: true, message: action.payload.message, severity: 'success' },
      };

    case 'ERROR':
      return {
        ...state,
        lookupsLoading: false,
        generating: false,
        saving: false,
        posting: false,
        saveDialogOpen: false,
        postDialogOpen: false,
        error: action.payload,
        snackbar: { open: true, message: action.payload, severity: 'error' },
      };

    case 'SHOW_SNACKBAR':
      return {
        ...state,
        snackbar: { open: true, message: action.payload.message, severity: action.payload.severity || 'success' },
      };

    case 'HIDE_SNACKBAR':
      return { ...state, snackbar: { ...state.snackbar, open: false } };

    case 'OPEN_SAVE_DIALOG':
      return { ...state, saveDialogOpen: true };
    case 'CLOSE_SAVE_DIALOG':
      return { ...state, saveDialogOpen: false };
    case 'OPEN_POST_DIALOG':
      return { ...state, postDialogOpen: true };
    case 'CLOSE_POST_DIALOG':
      return { ...state, postDialogOpen: false };

    default:
      return state;
  }
}

const errMsg = (error, fallback) => error.response?.data?.error || error.message || fallback;

// ==================== RETURN SLIP HOOK ====================
export const useReturnSlip = () => {
  const [state, dispatch] = useReducer(rsReducer, initialState);

  // kind 'search' -> options from returnitem, kind 'create' -> options from assestaccd
  const loadLookups = useCallback(async (kind) => {
    dispatch({ type: 'LOOKUPS_START' });
    try {
      const url = kind === 'create' ? '/returnitemRoute/lookups' : '/returnitemRoute/slip-lookups';
      const res = await api.get(url);
      dispatch({ type: 'LOOKUPS_SUCCESS', payload: res.data });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: errMsg(error, 'Failed to load filter options') });
    }
  }, []);

  const loadSearchLookups = useCallback(() => loadLookups('search'), [loadLookups]);

  const setFilter = useCallback((name, value) => dispatch({ type: 'SET_FILTER', name, value }), []);
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);

  // ----- SEARCH MODE: GO -----
  const goSearch = useCallback(async () => {
    dispatch({ type: 'GENERATE_START' });
    try {
      const res = await api.get('/returnitemRoute/slips', {
        params: { empname: state.filters.employee || '', itemNo: state.filters.item?.ItemNo || '' },
      });
      dispatch({ type: 'SEARCH_SUCCESS', payload: res.data });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: errMsg(error, 'Failed to search return slips') });
    }
  }, [state.filters]);

  const openSlip = useCallback(async (rsNo) => {
    try {
      const res = await api.get(`/returnitemRoute/${encodeURIComponent(rsNo)}`);
      dispatch({ type: 'SET_SLIP', payload: { rsNo, lines: res.data } });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: errMsg(error, 'Failed to load return slip') });
    }
  }, []);

  // Back from a slip to the search list (re-runs the search so statuses are fresh)
  const closeSlip = useCallback(() => {
    dispatch({ type: 'CLOSE_VIEW' });
    loadLookups('search');
    if (state.searched) goSearch();
  }, [state.searched, goSearch, loadLookups]);

  // ----- CREATE MODE -----
  const startCreate = useCallback(() => {
    dispatch({ type: 'START_CREATE' });
    loadLookups('create');
  }, [loadLookups]);

  const cancelCreate = useCallback(() => {
    dispatch({ type: 'CANCEL_CREATE' });
    loadLookups('search');
  }, [loadLookups]);

  // Generate borrowed assets for the selected employee and/or asset
  const generate = useCallback(async () => {
    const { item, employee } = state.filters;
    if (!item && !employee) {
      dispatch({ type: 'SHOW_SNACKBAR', payload: { message: 'Select an asset or an employee first', severity: 'warning' } });
      return;
    }

    dispatch({ type: 'GENERATE_START' });
    try {
      const res = await api.get('/returnitemRoute/borrowed', {
        params: { empname: employee || '', itemNo: item?.ItemNo || '' },
      });
      dispatch({ type: 'GENERATE_SUCCESS', payload: res.data });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: errMsg(error, 'Failed to generate borrowed assets') });
    }
  }, [state.filters]);

  // Save the checked rows as a new return slip (xPosted = 0). The API generates RSNo from XRSNum.
  const save = useCallback(async () => {
    const selected = state.rows.filter((r) => r.selected);
    if (selected.length === 0) {
      dispatch({ type: 'ERROR', payload: 'Select at least one asset to return' });
      return;
    }
    if (selected.some((r) => !isQtyValid(r))) {
      dispatch({ type: 'ERROR', payload: 'Qty Return must be greater than 0 and not more than Qty' });
      return;
    }

    dispatch({ type: 'SAVE_START' });
    try {
      // empname / dep are filled in by the API from assestacch
      const payload = selected.map((r) => ({
        AAFNo: r.AAFNo,
        ItemNo: r.ItemNo,
        ItemName: r.ItemName,
        Units: r.Units,
        Qty: Number(r.Qty),
        returnDate: r.returnDate,
        qtyToReturn: Number(r.qtyToReturn),
        serial: r.serial,
        location: r.location,
      }));

      const postRes = await api.post('/returnitemRoute', payload);
      const rsNo = postRes.data.RSNo;

      const linesRes = await api.get(`/returnitemRoute/${encodeURIComponent(rsNo)}`);
      dispatch({
        type: 'SAVE_SUCCESS',
        payload: { rsNo, lines: linesRes.data, message: `Return Slip ${rsNo} saved` },
      });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: errMsg(error, 'Failed to save return slip') });
    }
  }, [state.rows]);

  // ----- VIEW MODE: post (xPosted 0 -> 3) -----
  const post = useCallback(async () => {
    if (!state.rsNo) return;
    dispatch({ type: 'POST_START' });
    try {
      await api.post(`/returnitemRoute/${encodeURIComponent(state.rsNo)}/post`);
      dispatch({ type: 'POST_SUCCESS', payload: { message: `Return Slip ${state.rsNo} posted` } });
    } catch (error) {
      dispatch({ type: 'ERROR', payload: errMsg(error, 'Failed to post return slip') });
    }
  }, [state.rsNo]);

  const toggleRow = (id) => dispatch({ type: 'TOGGLE_ROW', id });
  const toggleAll = () => dispatch({ type: 'TOGGLE_ALL' });
  const updateRow = (id, field, value) => dispatch({ type: 'UPDATE_ROW', id, field, value });
  const hideSnackbar = () => dispatch({ type: 'HIDE_SNACKBAR' });

  const openSaveDialog = () => dispatch({ type: 'OPEN_SAVE_DIALOG' });
  const closeSaveDialog = () => dispatch({ type: 'CLOSE_SAVE_DIALOG' });
  const openPostDialog = () => dispatch({ type: 'OPEN_POST_DIALOG' });
  const closePostDialog = () => dispatch({ type: 'CLOSE_POST_DIALOG' });

  const confirmSave = async () => {
    dispatch({ type: 'CLOSE_SAVE_DIALOG' });
    await save();
  };
  const confirmPost = async () => {
    dispatch({ type: 'CLOSE_POST_DIALOG' });
    await post();
  };

  return {
    state,
    dispatch,
    loadSearchLookups,
    setFilter,
    clearFilters,
    goSearch,
    openSlip,
    closeSlip,
    startCreate,
    cancelCreate,
    generate,
    toggleRow,
    toggleAll,
    updateRow,
    hideSnackbar,
    openSaveDialog,
    closeSaveDialog,
    openPostDialog,
    closePostDialog,
    confirmSave,
    confirmPost,
  };
};