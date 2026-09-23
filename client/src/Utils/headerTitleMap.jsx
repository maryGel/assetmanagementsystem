export const headerTitleMap = {
  "/home": "Asset Management System",
  "/Home": "Asset Management System",
  "/Home/AssetMasterPage": "Asset Management System",
  "/Home/Movement": "Asset Management System",
  "/Home/Depreciation": "Asset Management System",
  "/Home/Reports": "Asset Management System",
  "/Home/PhysicalCount": "Asset Management System",
  "/Home/SystemSetup": "Asset Management System",
  '/assetFolder/pages/assetMasterList': 'Asset List',
  "/assetFolder/pages/assetMasterList": "Asset Master List",
  "/assetFolder/assetMasterDisplay": "Display Asset",
  "/assetFolder/createAsset": "Create New Asset",
  "/assetFolder/pages/referentialPage": "Referential Data",

  // Asset Movement Pages
  "/assetMovement/searchTransactions": "Search Transactions",
  "/assetMovement/pages/JOFormPage": "Job Order Page",
  "/assetMovement/pages/TRFormPage": "Transfer Form Page",
  "/assetMovement/pages/ADFormPage": "Disposal Form Page",
  "/assetMovement/pages/AAFormPage": "Asset Accountability Form Page",
  "/assetMovement/pages/ALFormPage": "Lost Asset Form Page",
  "/assetMovement/pages/maintenancePage": "Maintenance Page",

  // Asset Physical Count Pages
  "/assetPhysical/assetPrintQr": "Print QRcode",
  "/assetPhysical/countSheets": "Count Sheet Generator",
  "/assetPhysical/assetScanner": "Asset Identification",
  "/Physical/physicalCountPlanning": "Asset Count",

  // Physical Count Session Pages
  "/physicalCount/session": "Session Details",
  
  // System Setup Pages
  "/systemSetup/user/userProfile": "Roles and Authorizations",
  "/systemSetup/companyConfig": "General Settings",
};


export const getBackPath = (currentPath) => {
  // Asset Master Pages
  if (currentPath.startsWith('/assetFolder/assetMasterDisplay')) return '/assetFolder/pages/assetMasterList';
  if (currentPath.startsWith('/assetFolder/createAsset')) return '/Home/AssetMasterPage';
  if (currentPath.startsWith('/assetFolder/pages')) return '/Home/AssetMasterPage';

  // Movement Pages
  if (currentPath.startsWith('/assetMovement/searchTransactions')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/JOFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/TRFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/ADFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/AAFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/ALFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/maintenancePage')) return '/Home/Movement';

  // Physical Count Pages
  if (currentPath.startsWith('/assetPhysical/assetPrintQr')) return '/Home/PhysicalCount';
  if (currentPath.startsWith('/assetPhysical/countSheets')) return '/Home/PhysicalCount';
  if (currentPath.startsWith('/assetPhysical/assetScanner')) return '/Home/PhysicalCount';
  if (currentPath.startsWith('/Physical/physicalCountPlanning')) return '/Home/PhysicalCount';

  // Physical Count Session Pages
  if (currentPath.startsWith('/physicalCount/session/:id')) return '/Home/PhysicalCount';

  // Reports Pages
  if (currentPath.startsWith('/assetReports/assetSummaryReport')) return '/Home/Reports';
  if (currentPath.startsWith('/assetReports/assetLineItemReport')) return '/Home/Reports';

  // System Setup Pages
  if (currentPath.startsWith('/systemSetup/user/userProfile')) return '/Home/SystemSetup';
  if (currentPath.startsWith('/systemSetup/companyConfig')) return '/Home/SystemSetup';

};
