// hooks/refCategory.js
import { useState, useEffect } from 'react';
import { api } from '../api/axios'



// 1. UPDATED HOOK SIGNATURE
export const userRefEmployee = (useProps, deps = []) => {
  const [refEmployeeData, setRefEmployeeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

// Get all categories
  useEffect(() => {
    const getRefCategory = async () => {
        try {
        setLoading(true);
        setError(null);
        
       
        const response = await api.get('/refEmployee');       
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('Expected array but got: ' + typeof data);
        }
        
        const dataWithID = data.map((item, index) => ({
          ...item,
          id: item.id || `temp-${index}`,
          xCode: item.xCode,
          employee: item.employee
        }));
        
        setRefEmployeeData(dataWithID);
        
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };
    
  getRefCategory();    
  }, []);

  
  // Create employee
  const createRefEmployee = async (xCode = '', employee) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post('/api/refCat', { xCode, employee});

      const created = {
        id: response.data.id,
        xCode: response.data.xCode,
        employee: response.data.employee
      }

      setRefEmployeeData(prev => [...prev, created]);
      return created
    
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create employee';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Update employee
  const updateRefEmployee = async (id, xCode = '', employee) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.put(`/api/refCat/${id}`, { xCode, employee });
      // Update the local state

      setRefEmployeeData(prev =>
        prev.map(item => item.id ? {...item, xCode, employee} : item))

      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update employee';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Delete employee
  const deleteRefEmployee = async (id) => {
    try {
      setActionLoading(true);
      const response = await api.delete(`/api/refCat/${id}`);

      setRefEmployeeData(prev => prev.filter(item => item.id != id));
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete employee';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

    // Refresh categories (Centralized Fetching Logic)
  const refreshRefEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/refCat');      
      setRefEmployeeData(response.data);
      
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch categories');
      throw error;

    } finally {
      setLoading(false);
    }
  };

  return {
    refEmployeeData,
    loading,
    error,
    actionLoading,
    createRefEmployee,
    updateRefEmployee,
    deleteRefEmployee,
    refreshRefEmployees,
  };
};