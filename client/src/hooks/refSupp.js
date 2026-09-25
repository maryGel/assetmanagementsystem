import {useState, useEffect} from 'react';
import { api } from '../api/axios'


export const useSuppliers= () => {
  const [refSuppliers, setRefSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);


  // GET all Sections
  useEffect(() => {
    const getRefSuppliers = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/refSupplierRoute');       
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('Expected array but got: ' + typeof data);
        }
        
        const dataWithID = data.map((item, index) => ({
          ...item,
          id: item.id   || `temp-${index}`,
          suppID: item.suppID,
          suppName: item.suppName
        }));
        
        setRefSuppliers(dataWithID);
        
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };

    getRefSuppliers();
  }, []);

  // Create suppName 
  const createSupplier = async (suppID ='', suppName ) => {
    try {
      setActionLoading(true);
      setError(null);
      
      const response = await api.post('/refSupplierRoute', { suppID, suppName });
      
      const created = {
        id: response.data.id,
        suppID: response.data.suppID,
        suppName: response.data.suppName
      }

      setRefSuppliers(prev => [...prev, created]);      
      return created;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create suppName';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Update suppName - UPDATED TO SEND CORRECT FIELDS
  const updateSupplier = async (id,  suppID = '', suppName) => {
    try {
      setActionLoading(true);
      
      const response = await api.put(`/refSupplierRoute/${id}`, { suppID, suppName });
      
      // Update local state
      setRefSuppliers(prev => 
        prev.map(item => 
          item.id == id ? { ...item, suppID, suppName} : item
        )
      );
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update suppName';
      setError(errorMsg);
      throw new Error(errorMsg);    
    } finally {
      setActionLoading(false);
    }
  };

  // Delete suppName
  const deleteSupplier = async (id) => {
    try {
      setActionLoading(true);
      
      const response = await api.delete(`/refSupplierRoute/${id}`);
      
      // Update local state
      setRefSuppliers(prev => prev.filter(item => item.id != id));
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete suppName';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Refresh brands
  const refreshRefSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/refSupplierRoute');    
      setRefSuppliers(response.data);

    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    refSuppliers,
    loading,
    error,
    actionLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refreshRefSuppliers,
  };
};




