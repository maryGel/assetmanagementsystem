import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// Tile screens for each top-level menu - the same components the tabs used
// to render. The sidebar (in Layout) does the navigating; this just shows
// the screen for whichever /Home/... route is active, on the right side.
import AssetMasterTile from '../Modules/assetMaster/assetMaster/assetMasterTile';
import AssetMovement from '../Modules/Movement/customUtils/assetMoveTile';
import Depreciation from '../Modules/Depreciation/assetDepRun';
import AssetReports from '../Modules/Reports/assetReport';
import PhysicalCount from '../Modules/Physical/assetPhysicalCount';
import DashboardPage from '../Modules/Dashboard/dashBoardPage';
import SystemSetup from '../Modules/SystemSetup/customUtils/systemSetupTile.jsx';

import { menuConfig } from './menuConfig.jsx';
import { useMyAccess } from '../api/accessContext.jsx';

// Keyed by menu label so it stays in step with menuConfig.
const COMPONENTS = {
  Dashboard: DashboardPage,
  'Asset Master': AssetMasterTile,
  Movement: AssetMovement,
  Depreciation,
  Reports: AssetReports,
  'Physical Count': PhysicalCount,
  'System Setup': SystemSetup,
};

export default function FullWidthTabs({ tabPaths }) {
  const { pathname } = useLocation();
  const { hasCode, loading } = useMyAccess();

  // Same visibility rule as the old tabs: a menu is reachable only if the
  // user has its U_CODE. tabPaths (from HomePage) still supplies the links.
  const visibleMenus = useMemo(() => {
    if (loading) return [];
    return menuConfig
      .map((m, i) => ({ ...m, link: tabPaths?.[i]?.link ?? m.link }))
      .filter((m) => hasCode(m.code));
  }, [loading, hasCode, tabPaths]);

  if (!loading && visibleMenus.length === 0) {
    return (
      <div className="w-full p-6 text-center text-gray-500 bg-white">
        No modules have been assigned to your account yet. Contact your administrator for access.
      </div>
    );
  }

  // Falls back to the first visible menu, as the old tabs did.
  const active = visibleMenus.find((m) => m.link === pathname) || visibleMenus[0];
  if (!active) return null;

  const ActiveComponent = COMPONENTS[active.label];

  return (
    <main className="w-full min-w-0 bg-slate-50 min-h-[calc(100vh-4rem)]">
      <div className="px-4 py-4 bg-white border-b border-gray-200 md:px-6">
        <h2 className="text-xl font-semibold text-gray-900">{active.label}</h2>
      </div>
      <div className="p-4 md:p-6">
        <ActiveComponent />
      </div>
    </main>
  );
}
