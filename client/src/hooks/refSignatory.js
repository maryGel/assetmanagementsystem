// hooks/refSignatoryegory.js
import { useState, useEffect } from 'react';
import { api } from '../api/axios'



// 1. UPDATED HOOK SIGNATURE
export const useRefSignatories = (useProps, deps = []) => {
  const [refSignatories, setRefSignatories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

// Get all signatories
  useEffect(() => {
    const getRefSignatories = async () => {
        try {
        setLoading(true);
        setError(null);
        
       
        const response = await api.get('/refSignatory');       
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('Expected array but got: ' + typeof data);
        }
        
        const dataWithID = data.map((item, index) => ({
          ...item,
          id: item.id || `temp-${index}`,
          xModule: item.xModule,
          xLabel: item.xLabel,
          xName: item.xName,
          xPosition: item.xPosition
        }));
        
        setRefSignatories(dataWithID);
        
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };
    
  getRefSignatories();    
  }, []);

  
  // Create signatory
  const createSignatory = async (xModule = '', xLabel = '', xName = '', xPosition = '') => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post('/refSignatory', { xModule, xLabel, xName, xPosition});

      const created = {
        id: response.data.id,
        xModule: response.data.xModule,
        xLabel: response.data.xLabel,
        xName: response.data.xName,
        xPosition: response.data.xPosition
      }

      setRefSignatories(prev => [...prev, created]);
      return created
    
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create signatory';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Update signatory
  const updateSignatory = async (id, xModule, xLabel, xName, xPosition) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.put(`/refSignatory/${id}`, { xModule, xLabel, xName, xPosition });
      // Update the local state

      setRefSignatories(prev =>
        prev.map(item => item.id === id ? {...item, xModule, xLabel, xName, xPosition} : item))

      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update signatory';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Delete signatory
  const deleteSignatory = async (id) => {
    try {
      setActionLoading(true);
      const response = await api.delete(`/refSignatory/${id}`);

      setRefSignatories(prev => prev.filter(item => item.id != id));
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete signatory';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

    // Refresh signatories (Centralized Fetching Logic)
  const refreshSignatories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/refSignatory');      
      setRefSignatories(response.data);
      
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch signatories');
      throw error;

    } finally {
      setLoading(false);
    }
  };

  return {
    refSignatories,
    loading,
    error,
    actionLoading,
    createSignatory,
    updateSignatory,
    deleteSignatory,
    refreshSignatories,
  };
};