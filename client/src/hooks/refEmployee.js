// hooks/refEmployee.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/axios';

// Every row MUST have a unique `id`. Your DB column may be `ID` (uppercase),
// so map it here once and use this everywhere.
const normalize = (item, index) => ({
  ...item,
  id: item.id ?? item.ID ?? `temp-${index}`,
});

export const useRefEmployees = (useProps, deps = []) => {
  const [refEmployees, setRefEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch all employees (used for the initial load and for refresh)
  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/refEmployee');
      const data = response.data;

      if (!Array.isArray(data)) {
        throw new Error('Expected array but got: ' + typeof data);
      }

      setRefEmployees(data.map(normalize));
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch employees');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees().catch(() => {}); // error state is already set
  }, [fetchEmployees]);

  // Create employee
  const createEmployee = async (Emp_No = '', Emp_FName, Emp_MName, Emp_LName) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post('/refEmployee', { Emp_No, Emp_FName, Emp_MName, Emp_LName });

      const created = {
        id: response.data.id,
        Emp_No: response.data.Emp_No,
        Emp_FName: response.data.Emp_FName,
        Emp_MName: response.data.Emp_MName,
        Emp_LName: response.data.Emp_LName,
      };

      setRefEmployees(prev => [...prev, created]);
      return created;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create employee';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  // Update employee
  const updateEmployee = async (id, Emp_No = '', Emp_FName, Emp_MName, Emp_LName) => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.put(`/refEmployee/${id}`, { Emp_No, Emp_FName, Emp_MName, Emp_LName });

      // Only update the row that was edited (previously this matched every row)
      setRefEmployees(prev =>
        prev.map(item =>
          String(item.id) === String(id)
            ? { ...item, Emp_No, Emp_FName, Emp_MName, Emp_LName }
            : item
        )
      );

      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to update employee';
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
      setError(null);

      const response = await api.delete(`/refEmployee/${id}`);
      setRefEmployees(prev => prev.filter(item => String(item.id) !== String(id)));

      return response.data;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to delete employee';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
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
    refreshEmployee: fetchEmployees,
  };
};