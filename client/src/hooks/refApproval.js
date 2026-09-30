import {useState, useEffect, useCallback} from 'react';
import { api } from '../api/axios'


function transformApprovalData(apiData) {
  if (!apiData || !Array.isArray(apiData)) return [];

  // Get unique modules in the order they appear in the API
  const uniqueModules = [...new Set(apiData.map(item => item.MODULE))];

  return uniqueModules.map((moduleName) => {
    const moduleChildren = apiData.filter(item => item.MODULE === moduleName);
    
    return {
      id: moduleName, // Use the name as the parent ID for easier checkbox logic
      label: moduleName,
      children: moduleChildren.map(child => ({
        ...child,
        id: child.ID, // Ensure every leaf has a unique ID for the checkbox
        label: `${child.SIGNATORY} (Level ${child.APP_LEVEL})`
      }))
    };
  });
}

const normalize = (item, index) => ({
  ...item,
  id: item.id ?? item.ID ?? `temp-${index}`,
});

export const useApproval= () => {
  const [refApprovals, setRefApprovals] = useState([]);
  const [transformApproval, setTransformApproval] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

    // GET all Approvals
  useEffect(() => {
    const getTransformApproval = async () => {
      try {
        setLoading(true);
        setError(null);
                
        const response = await api.get('/approvalRoute');       
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('Expected array but got: ' + typeof data);
        }
        

        const transformedData = transformApprovalData(data)
        
        setTransformApproval(transformedData);
        
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };

    getTransformApproval();
  }, []);


  // Fetch all approval hierarchy (used for the initial load and for refresh)
  const fetchApprovalHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/approvalRoute');
      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Expected array but got: ' + typeof data);
      }

      setRefApprovals(data.map(normalize));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch approval hierarchy');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApprovalHierarchy().catch(() => {}); 
  }, [fetchApprovalHierarchy]);

  // Create Approval
  const createApproval = async (APP_CODE ='', MODULE, APP_LEVEL, SIGNATORY ) => {
    try {
      setActionLoading(true);
      setError(null);
      
      const response = await api.post('/approvalRoute', { APP_CODE, MODULE, APP_LEVEL, SIGNATORY });
      
      const created = {
        id: response.data.ID,
        APP_CODE: response.data.APP_CODE,
        MODULE: response.data.MODULE,
        APP_LEVEL: response.data.APP_LEVEL,
        SIGNATORY: response.data.SIGNATORY
      }

      setRefApprovals(prev => [...prev, created]);      
      return created;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create MODULE';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Update MODULE - UPDATED TO SEND CORRECT FIELDS
  const updateApproval = async (id,  APP_CODE = '', MODULE,  APP_LEVEL, SIGNATORY ) => {
    try {
      setActionLoading(true);
      
      const response = await api.put(`/approvalRoute/${id}`, {  APP_CODE, MODULE, APP_LEVEL, SIGNATORY });
      
      // Update local state
      setRefApprovals(prev => 
        prev.map(item => 
          String(item.id) === String(id) ? { ...item,  APP_CODE, MODULE, APP_LEVEL, SIGNATORY } : item
        )
      );
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update MODULE';
      setError(errorMsg);
      throw new Error(errorMsg);    
    } finally {
      setActionLoading(false);
    }
  };

  // Delete MODULE
  const deleteApproval = async (id) => {
    try {
      setActionLoading(true);
      
      const response = await api.delete(`/approvalRoute/${id}`);
      
      // Update local state
      setRefApprovals(prev => prev.filter(item => item.ID != id));
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete MODULE';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Refresh approvals
  const refreshApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/approvalRoute');    
      setRefApprovals(response.data);

    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch approvals');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    transformApproval,
    refApprovals,
    loading,
    error,
    actionLoading,
    createApproval,
    updateApproval,
    deleteApproval,
    refreshApprovals,
  };
};







