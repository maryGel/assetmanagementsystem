// hooks/refCategory.js
import { useState, useEffect } from 'react';
import { api } from '../api/axios'



// 1. UPDATED HOOK SIGNATURE
export const useRefCategory = (useProps, deps = []) => {
  const [refCategoryData, setRefCategoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

// Get all categories
  useEffect(() => {
    const getRefCategory = async () => {
        try {
        setLoading(true);
        setError(null);
        
       
        const response = await api.get('/api/refCat');       
        const data = response.data;
        
        if (!Array.isArray(data)) {
          throw new Error('Expected array but got: ' + typeof data);
        }
        
        const dataWithID = data.map((item, index) => ({
          ...item,
          id: item.id || `temp-${index}`,
          xCode: item.xCode,
          category: item.category,
          AssetGrpCode: item.AssetGrpCode ?? ''
        }));
        
        setRefCategoryData(dataWithID);
        
      } catch (error) {
        setError(error.response?.data?.error || error.message || 'Failed to fetch brands');
      } finally {
        setLoading(false);
      }
    };
    
  getRefCategory();    
  }, []);

  
  // Create category
  const createRefCategory = async (xCode = '', category, AssetGrpCode = '') => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.post('/api/refCat', { xCode, category, AssetGrpCode });

      const created = {
        id: response.data.id,
        xCode: response.data.xCode,
        category: response.data.category,
        AssetGrpCode: response.data.AssetGrpCode ?? ''
      }

      setRefCategoryData(prev => [...prev, created]);
      return created
    
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create category';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Update category
  const updateRefCategory = async (id, xCode = '', category, AssetGrpCode = '') => {
    try {
      setActionLoading(true);
      setError(null);

      const response = await api.put(`/api/refCat/${id}`, { xCode, category, AssetGrpCode });
      // Update the local state

      setRefCategoryData(prev =>
        prev.map(item => item.id === id ? {...item, xCode, category, AssetGrpCode} : item))

      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update category';
      setError(errorMsg);
      throw new Error(errorMsg);

    } finally {
      setActionLoading(false);
    }
  };

  // Delete category
  const deleteRefCategory = async (id) => {
    try {
      setActionLoading(true);
      const response = await api.delete(`/api/refCat/${id}`);

      setRefCategoryData(prev => prev.filter(item => item.id != id));
      
      return response.data;

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete category';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

    // Refresh categories (Centralized Fetching Logic)
  const refreshRefCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/api/refCat');      
      setRefCategoryData(response.data);
      
    } catch (error) {
      setError(error.response?.data?.error || error.message || 'Failed to fetch categories');
      throw error;

    } finally {
      setLoading(false);
    }
  };

  return {
    refCategoryData,
    loading,
    error,
    actionLoading,
    createRefCategory,
    updateRefCategory,
    deleteRefCategory,
    refreshRefCategories,
  };
};
