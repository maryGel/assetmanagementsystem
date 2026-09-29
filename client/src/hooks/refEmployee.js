// hooks/refEmployeeegory.js
import { useState, useEffect } from 'react';
import { api } from '../api/axios'



// 1. UPDATED HOOK SIGNATURE
export const useRefEmployees = (useProps, deps = []) => {
  const [refEmployees, setRefEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

// Get all categories
  useEffect(() => {
    const getRefEmployees = async () => {
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
          Emp_No: item.Emp_No,
          Emp_FName: item.Emp_FName,
          Emp_MName: item.Emp_MName,
          Emp_LName: item.Emp_LName
        }));
        
        setRefEmployees(dataWithID);
        
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };
    
  getRefEmployees();    
  }, []);

  
  // Create employee
  const createEmployee = async (Emp_No = '', Emp_FName = '', Emp_MName = '', Emp_LName = '') => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post('/api/refEmployee', { Emp_No, Emp_FName, Emp_MName, Emp_LName});

      const created = {
        id: response.data.id,
        Emp_No: response.data.Emp_No,
        Emp_FName: response.data.Emp_FName,
        Emp_MName: response.data.Emp_MName,
        Emp_LName: response.data.Emp_LName
      }

      setRefEmployees(prev => [...prev, created]);
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
  const updateEmployee = async (id, Emp_No, Emp_FName, Emp_MName, Emp_LName) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.put(`/api/refEmployee/${id}`, { Emp_No, Emp_FName, Emp_MName, Emp_LName });
      // Update the local state

      setRefEmployees(prev =>
        prev.map(item => item.id ? {...item, Emp_No, Emp_FName, Emp_MName, Emp_LName} : item))

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
  const deleteEmployee = async (id) => {
    try {
      setActionLoading(true);
      const response = await api.delete(`/api/refEmployee/${id}`);

      setRefEmployees(prev => prev.filter(item => item.id != id));
      
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
  const refreshEmployee = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/refEmployee');      
      setRefEmployees(response.data);
      
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch categories');
      throw error;

    } finally {
      setLoading(false);
    }
  };

  return {
    refEmployees,
    loading,
    error,
    actionLoading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployee,
  };
};