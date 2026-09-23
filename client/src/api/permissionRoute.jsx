import { Navigate } from 'react-router-dom';
import { useMyAccess } from './accessContext';

// Second gate, layered on top of ProtectedRoute (which only checks
// "logged in at all"). Wrap a route's element with this to also block
// users who aren't granted the U_CODE mapped to that path from reaching
// it by typing the URL directly - not just hide its tile.
//
// Usage in App.jsx:
//   <Route
//     path="/assetMovement/pages/ADFormPage"
//     element={
//       <PermissionRoute path="/assetMovement/pages/ADFormPage">
//         <ADFormPage setHeaderTitle={saveTitleUpdate} />
//       </PermissionRoute>
//     }
//   />
export default function PermissionRoute({ path, children }) {
  const { hasAccess, loading } = useMyAccess();

  // While the granted-permissions fetch is in flight, render nothing
  // rather than briefly allowing (or bouncing) the page - matches the
  // hide-by-default choice used for the tiles.
  if (loading) return null;

  if (!hasAccess(path)) {
    return <Navigate to="/Home" replace />;
  }

  return children;
}