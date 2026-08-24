import { useEffect, useReducer, useCallback } from 'react';
import { api } from '../api/axios'

const initialState = {
  assets: [],
  allAssets: [],
  singleAsset: null,
  status: 'idle',
  error: null,
  displayedAssets: [],
  filters: {
    search: '',
    categories: [],
    itemClasses: [],
    locations: [],
    departments: [],
    assetNos: []
  },
  page: 0,
  pageSize: 10,
  total: 0,
};

function assetReducer(state, action) {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    
    case 'LOADING_SINGLE':
      return { ...state, status: 'loadingSingle', error: null }

    case 'MUTATING':
      return { ...state, status: 'mutating', error: null };
    
    case 'ERROR':
      return { ...state, status: 'error', error: action.payload };
    
    case 'SUCCESS':
      return { ...state, status: 'idle', error: null };
  
    case 'SET_DATA':
      return {
        ...state,
        assets: action.payload.data || [],
        displayedAssets: action.payload.data || [],
        total: action.payload.total || 0,
        status: 'idle',
        error: null
      };
    
    case 'SET_ALL_ASSETS':
      return {
        ...state,
        allAssets: action.payload
      };

    case 'SET_SINGLE_ASSET':
      return {
        ...state,
        singleAsset: action.payload,
        status: 'idle',
        error: null
      }

    case 'CLEAR_SINGLE_ASSET':
      return {
        ...state,
        singleAsset: null,
        status: 'idle',
        error: null
      }
    
    case 'ADD_ASSET':
      return {
        ...state,
        assets: [action.payload, ...state.assets],
        allAssets: [action.payload, ...state.allAssets],
        total: state.total + 1,
      }
    
    case 'UPDATE_ASSET':
      return {
        ...state,
        assets: state.assets.map(a => a.FacNO === action.payload.FacNO ? action.payload : a),
        allAssets: state.allAssets.map(a => a.FacNO === action.payload.FacNO ? action.payload : a),
      }
    
    case 'SELECT_ASSET':
      return { ...state, selectedAsset: action.payload };

    case 'SET_PAGE':
      return {
        ...state,
        page: action.payload
      };
    
    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.payload, page: 0 };
    
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: action.payload,
        page: 0
      };
    
    default:
      return state;
  }
}

export const useAssetMasterData = () => {
  const [state, dispatch] = useReducer(assetReducer, initialState);

  // Fetch ALL assets once when component mounts
  useEffect(() => {
    const fetchAllAssets = async () => {
      try {
        console.log('Fetching all assets for dropdown...');
        // fetchAll=true skips LIMIT/OFFSET so every row comes back, and
        // `columns` trims the payload to just what the dropdown/filter UI
        // and dashboard rollups actually use — pulling every column
        // (Picpath, Description, Remarks, suppName, etc.) on 15,000+ rows
        // was slow enough to blow past the request timeout.
        // timeout is bumped for this one call as a safety net; it can be
        // removed once the trimmed payload proves consistently fast.
        const response = await api.get('/itemlist', { 
          params: {
            fetchAll: true,
            columns: 'FacNO,FacName,CATEGORY,ItemClass,Department,ItemLocation,xStatus,AAmount,Abre,serialNo,AssetGrpCode'
          },
          timeout: 30000
        });
        console.log('All assets fetched:', response.data.data?.length, 'of', response.data.total);
        dispatch({ type: 'SET_ALL_ASSETS', payload: response.data.data || [] });
      } catch (error) {
        console.error('Error fetching all assets:', error);
      }
    };
    
    fetchAllAssets();
  }, []);

  // Fetch filtered assets when filters OR page OR pageSize changes
  const fetchAssets = useCallback(async () => {
    // Check if there are any active filters
    const hasActiveFilters = 
      state.filters.search !== "" ||
      (state.filters.categories?.length || 0) > 0 ||
      (state.filters.itemClasses?.length || 0) > 0 ||
      (state.filters.locations?.length || 0) > 0 ||
      (state.filters.departments?.length || 0) > 0 ||
      (state.filters.assetNos?.length || 0) > 0;
    
    // If no filters, clear data and don't fetch
    if (!hasActiveFilters) {
      console.log('No active filters, clearing table');
      dispatch({ 
        type: 'SET_DATA', 
        payload: { data: [], total: 0 } 
      });
      return;
    }
    
    try {
      dispatch({ type: 'LOADING' });

      const params = {
        page: state.page + 1,
        pageSize: state.pageSize,
      };
      
      // Add filters if they exist
      if (state.filters.search) {
        params.search = state.filters.search;
      }
      if (state.filters.categories && state.filters.categories.length > 0) {
        params.category = state.filters.categories.join(',');
      }
      if (state.filters.itemClasses && state.filters.itemClasses.length > 0) {
        params.itemClass = state.filters.itemClasses.join(',');
      }
      if (state.filters.locations && state.filters.locations.length > 0) {
        params.location = state.filters.locations.join(',');
      }
      if (state.filters.departments && state.filters.departments.length > 0) {
        params.department = state.filters.departments.join(',');
      }
      if (state.filters.assetNos && state.filters.assetNos.length > 0) {
        params.assetNos = state.filters.assetNos.join(',');
      }

      console.log('Fetching filtered assets with params:', params);
      const res = await api.get('/itemlist', { params });
      
      console.log('Filtered response:', {
        dataCount: res.data.data?.length,
        total: res.data.total
      });
      
      dispatch({
        type: 'SET_DATA',
        payload: {
          data: res.data.data,
          total: res.data.total,
        }
      });

      dispatch({ type: 'SUCCESS' });
    } catch (error) {
      console.error('Error fetching assets:', error);
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || error.message,
      });
    }
  }, [state.page, state.pageSize, state.filters]);

  // Trigger fetch when filters, page, or pageSize changes
  useEffect(() => {
    console.log('Fetch triggered due to change in:', {
      page: state.page,
      pageSize: state.pageSize,
      filters: state.filters
    });
    fetchAssets();
  }, [fetchAssets, state.page, state.pageSize, state.filters]);

  // Rest of your functions remain the same...
  const fetchAssetByFacN0 = useCallback(async (facNo) => {
    try {
      if (!facNo) {
        dispatch({ type: 'CLEAR_SINGLE_ASSET' });
        return null;
      }

      dispatch({ type: 'LOADING_SINGLE' });

      const cleanFacNo = facNo.replace(/\s/g, '').toUpperCase();
      const res = await api.get(`/itemlist/${cleanFacNo}`)

      dispatch({
        type: 'SET_SINGLE_ASSET',
        payload: res.data
      });
      return res.data;

    } catch (error) { 
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || error.message,
      });
      throw error;
    }
  }, []);

  const clearSingleAsset = useCallback(() => {
    dispatch({ type: 'CLEAR_SINGLE_ASSET' });
  }, []);

  const createAsset = async (payload) => {
    try {
      dispatch({ type: 'MUTATING' });
      
      const res = await api.post('/itemlist', payload)
      dispatch({
        type: 'ADD_ASSET',
        payload: { id: res.data.assetID, ...payload },
      });

      dispatch({ type: 'SUCCESS' })
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || error.message,
      });
      throw error;
    }
  };

  const updateAsset = async (facNo, payload) => {
    try {
      dispatch({ type: 'MUTATING' });

      const res = await api.put(`/itemlist/${facNo}`, payload);
      dispatch({
        type: 'UPDATE_ASSET',
        payload: { FacNO: facNo, ...payload }
      })

      dispatch({ type: 'SUCCESS' });
    } catch (error) {
      dispatch({
        type: 'ERROR',
        payload: error.response?.data?.error || error.message,
      });
      throw error;
    }
  }

  const deleteAsset = async (id) => {
    try {
      dispatch({ type: 'MUTATING' });

      await api.delete(`/deleteAsset/${id}`);

      dispatch({ type: 'REMOVE_ASSET', payload: id });
      dispatch({ type: 'SUCCESS' });
    } catch (err) {
      dispatch({
        type: 'ERROR',
        payload: err.response?.data?.error || err.message,
      });
      throw err;
    }
  };

  return {
    assets: state.assets,
    allAssets: state.allAssets,
    singleAsset: state.singleAsset,
    total: state.total,
    page: state.page,
    pageSize: state.pageSize,
    selectedAsset: state.selectedAsset,
    filters: state.filters,
    
    status: state.status,
    error: state.error,
    
    isLoading: state.status === 'loading',
    isMutating: state.status === 'mutating',
    isLoadingSingle: state.status === 'loadingSingle',
    
    setPage: page => dispatch({ type: 'SET_PAGE', payload: page }),
    setPageSize: (size) => dispatch({ type: 'SET_PAGE_SIZE', payload: size }),
    setFilters: (filters) => dispatch({ type: 'SET_FILTERS', payload: filters }),
    selectAsset: asset => dispatch({ type: 'SELECT_ASSET', payload: asset }),
    
    fetchAssets,
    fetchAssetByFacN0,
    clearSingleAsset,
    createAsset,
    updateAsset,
    deleteAsset,
  };
};
