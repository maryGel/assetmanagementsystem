import DashboardPage from '../Modules/Dashboard/dashBoardPage';
import { useMyAccess } from '../api/accessContext.jsx';

// Home content. Navigation now lives entirely in the sidebar (Layout), so
// the old per-menu tile screens are gone; /Home simply shows the Dashboard.
// Kept under the same name/props so HomePage.jsx needs no change.
export default function FullWidthTabs() {
  const { hasCode, loading } = useMyAccess();

  if (loading) return null;

  if (!hasCode('DASHBOARD')) {
    return (
      <div className="w-full p-6 text-center text-gray-500 bg-white">
        Select a module from the menu on the left.
      </div>
    );
  }

  return (
    <main className="w-full min-w-0 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="px-4 py-4 bg-white border-b border-gray-200 md:px-6">
        <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
      </div>
      <div className="p-4 md:p-6">
        <DashboardPage />
      </div>
    </main>
  );
}
