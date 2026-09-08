import { useState, useEffect } from 'react';
import { api } from '../api/axios';

// Same shape as useAccess's transform, but built from the master
// user_permissions catalog (no G_CODE - this is not user-specific).
// A node's id is always its own U_CODE. For a category row U_CODE and
// MAIN_CODE are the same value, so parent and child ids never collide.
function transformMasterPermissions(apiData) {
  if (!apiData || !Array.isArray(apiData)) {
    return [];
  }

  const parents = apiData.filter((item) => item.U_MAIN === 1);
  const children = apiData.filter((item) => item.U_MAIN === 0);

  const childrenByMainCode = {};
  children.forEach((child) => {
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
      sortno: child.sortno,
      originalData: child,
    });
  });

  const sortBySortno = (a, b) => (a.sortno ?? 0) - (b.sortno ?? 0);

  return parents
    .slice()
    .sort(sortBySortno)
    .map((parent) => ({
      id: parent.U_CODE,
      label: parent.U_PERM,
      U_CODE: parent.U_CODE,
      U_PERM: parent.U_PERM,
      U_MAIN: parent.U_MAIN,
      MAIN_CODE: parent.MAIN_CODE,
      sortno: parent.sortno,
      originalData: parent,
      children: (childrenByMainCode[parent.MAIN_CODE] || []).slice().sort(sortBySortno),
    }));
}

// Fetches the full permission catalog once - this is the universe of
// everything a user COULD be granted, independent of any one user.
export const useUserPermissions = () => {
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getMasterPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get('/userPermissions');
        const data = response.data;

        if (!Array.isArray(data)) {
          throw new Error('Expected array but got: ' + typeof data);
        }

        setTreeData(transformMasterPermissions(data));
      } catch (err) {
        console.error('Error in useUserPermissions:', err);
        setError(err.response?.data?.error || err.message || 'Failed to fetch user_permissions');
      } finally {
        setLoading(false);
      }
    };

    getMasterPermissions();
  }, []);

  return { treeData, loading, error };
};