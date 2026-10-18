// Single source of truth for the sidebar menus. It holds only data (no page
// components), so the Layout can import it without pulling every module into
// the main bundle. TabPanel.jsx maps each entry to its tile component.
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import TrendingDownOutlinedIcon from '@mui/icons-material/TrendingDownOutlined';
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined';
import QrCodeScannerOutlinedIcon from '@mui/icons-material/QrCodeScannerOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';

import { assetTileList } from '../Modules/assetMaster/assetMaster/assetTilelist';
import { assetMovList } from '../Modules/Movement/customUtils/asstMovList.jsx';
import { assetDepList } from '../Modules/Depreciation/assetDep.jsx';
import { assetReportList } from '../Modules/Reports/assetReportList';
import { assetPhyList } from '../Modules/Physical/assetPhyList';
import { assetUtilList } from '../Modules/SystemSetup/customUtils/setupTileList';

// `link` is the /Home/... route that shows the module's tile screen.
// `code` is the U_CODE checked with hasCode(); sub-items are checked with
// hasAccess(item.link), same as the tile screens do.
export const menuConfig = [
  { label: 'Dashboard', code: 'DASHBOARD', link: '/Home', Icon: DashboardOutlinedIcon, items: [] },
  { label: 'Asset Master', code: 'ASSET_MASTER_MENU', link: '/Home/AssetMasterPage', Icon: Inventory2OutlinedIcon, items: assetTileList },
  { label: 'Movement', code: 'MOVEMENT_MENU', link: '/Home/Movement', Icon: SwapHorizOutlinedIcon, items: assetMovList },
  { label: 'Depreciation', code: 'DEPRECIATION_MENU', link: '/Home/Depreciation', Icon: TrendingDownOutlinedIcon, items: assetDepList },
  { label: 'Reports', code: 'REPORTS_MENU', link: '/Home/Reports', Icon: AssessmentOutlinedIcon, items: assetReportList },
  { label: 'Physical Count', code: 'PHYSICAL_COUNT_MENU', link: '/Home/PhysicalCount', Icon: QrCodeScannerOutlinedIcon, items: assetPhyList },
  { label: 'System Setup', code: 'SYSTEM_SETUP_MENU', link: '/Home/SystemSetup', Icon: SettingsOutlinedIcon, items: assetUtilList },
];
