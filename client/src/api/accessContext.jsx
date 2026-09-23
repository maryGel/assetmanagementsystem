import { createContext, useContext, useMemo } from 'react';
import { useAccess } from '../hooks/useAccess';
import { PATH_TO_UCODE } from './permissionContext';

// Adjust these two relative import paths to match where this file
// actually lives in your project (e.g. if this sits in
// src/contexts/AccessContext.jsx, '../hooks/useAccess' and
// '../constants/permissionPaths' assume useAccess.js is at
// src/hooks/useAccess.js and permissionPaths.js at
// src/constants/permissionPaths.js).

const AccessContext = createContext(null);

// Walks the useAccess tree (parents + children) and collects every
// U_CODE it contains. The backend already scopes /accessRights/user/:gcode
// to rows actually granted to that G_CODE, so every U_CODE present in
// the returned tree is something this user has been granted - there's
// no separate "denied" list to check against.
function collectGrantedCodes(treeData) {
  const codes = new Set();
  const walk = (nodes) => {
    (nodes || []).forEach((node) => {
      if (node.U_CODE) codes.add(node.U_CODE);
      if (node.children) walk(node.children);
    });
  };
  walk(treeData);
  return codes;
}

export function AccessProvider({ children }) {
  // G_CODE is just the username (see permissionTree.jsx: `const gcode =
  // selectedUser?.user`), so the logged-in user's own granted rows are
  // fetched the exact same way an admin fetches someone else's.
  const username = localStorage.getItem('username');
  const isAdmin = localStorage.getItem('Admin') === 'true';

  const { accessData, loading, error } = useAccess(username);

  const grantedCodes = useMemo(() => collectGrantedCodes(accessData), [accessData]);

  // Admins bypass the granted-permissions check entirely - matches the
  // backend's requireAdmin pattern (usersRoute.js), where Admin already
  // has unrestricted access to admin-only endpoints.
  const hasAccess = (path) => {
    if (isAdmin) return true;
    const requiredCode = PATH_TO_UCODE[path];
    if (!requiredCode) return true; // unrestricted path
    return grantedCodes.has(requiredCode);
  };

  // Same as hasAccess, but for callers that already have a U_CODE in
  // hand (e.g. the top-level menu tabs, each mapped 1:1 to its own
  // U_CODE) rather than a path that needs looking up in PATH_TO_UCODE.
  const hasCode = (code) => {
    if (isAdmin) return true;
    if (!code) return true;
    return grantedCodes.has(code);
  };

  const value = { hasAccess, hasCode, loading, error, isAdmin, grantedCodes };

  return (
    <AccessContext.Provider value={value}>
      {children}
    </AccessContext.Provider>
  );
}

export function useMyAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error('useMyAccess must be used within an AccessProvider');
  }
  return ctx;
}