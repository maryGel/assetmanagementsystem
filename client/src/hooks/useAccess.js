import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/axios';

// A node's id is always its own U_CODE. For a category row, U_CODE and
// MAIN_CODE are the same value, so this lines up with how the master
// catalog tree (useUserPermissions) builds its ids too.
function transformAccessData(apiData) {
  if (!apiData || !Array.isArray(apiData)) {
    console.log('No data or not an array:', apiData);
    return [];
  }

  // The server already scopes rows to the requested G_CODE
  // (GET /accessRights/user/:gcode), so no client-side filtering by
  // userId is needed here anymore.
  const parents = apiData.filter(item => item.U_MAIN === 1);
  const children = apiData.filter(item => item.U_MAIN === 0);

  // Group children by MAIN_CODE
  const childrenByMainCode = {};
  children.forEach(child => {
    const mainCode = child.MAIN_CODE;
    if (!childrenByMainCode[mainCode]) {
      childrenByMainCode[mainCode] = [];
    }
    childrenByMainCode[mainCode].push({
      id: child.U_CODE,
      label: child.U_PERM,
      U_CODE: child.U_CODE,
      U_PERM: child.U_PERM,
      U_MAIN: child.U_MAIN,
      MAIN_CODE: child.MAIN_CODE,
      originalData: child
    });
  });

  // Create parent items with their children
  const transformed = parents.map(parent => {
    const parentChildren = childrenByMainCode[parent.MAIN_CODE] || [];

    return {
      id: parent.U_CODE,
      label: parent.U_PERM,
      U_CODE: parent.U_CODE,
      U_PERM: parent.U_PERM,
      U_MAIN: parent.U_MAIN,
      MAIN_CODE: parent.MAIN_CODE,
      originalData: parent,
      children: parentChildren
    };
  });

  return transformed;
}

export const useAccess = (userId) => {
    const [accessData, setAccessData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAccessRights = useCallback(async () => {
        if (!userId) {
            setLoading(false);
            setAccessData([]);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`/accessRights/user/${userId}`);
            const data = response.data;

            if (!Array.isArray(data)) {
                console.log('Data is not an array:', data);
                throw new Error('Expected array but got: ' + typeof data);
            }

            setAccessData(transformAccessData(data));
        } catch (err) {
            console.error('Error in useAccess:', err);
            setError(err.response?.data?.error || err.message || 'Failed to fetch user_permissions');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAccessRights();
    }, [fetchAccessRights]);

    return {
        accessData,
        loading,
        error,
        refetch: fetchAccessRights, // ← new
    };
};

// Persists a user's full set of granted permissions in one call.
// The backend clears whatever G_CODE currently has and re-inserts this
// list inside a transaction (see PUT /accessRights/user/:gcode).
// permissions: [{ U_PERM, U_MAIN, U_CODE, MAIN_CODE }, ...]
export const saveUserAccess = async (gcode, permissions) => {
    const response = await api.put(`/accessRights/user/${gcode}`, { permissions });
    return response.data;
};