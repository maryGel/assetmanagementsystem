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

  // System Setup Pages
  "/systemSetup/user/userProfile": "Roles and Authorizations",
};


export const getBackPath = (currentPath) => {
  // Asset Master Pages
  if (currentPath.startsWith('/assetFolder/assetMasterDisplay')) return '/assetFolder/pages/assetMasterList';
  if (currentPath.startsWith('/assetFolder/createAsset')) return '/assetFolder/pages/assetMasterList';
  if (currentPath.startsWith('/systemSetup/user/userProfile')) return '/Home/SystemSetup';
  if (currentPath.startsWith('/assetFolder/pages')) return '/Home/AssetMasterPage';

  // Movement Pages
  if (currentPath.startsWith('/assetMovement/searchTransactions')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/JOFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/TRFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/ADFormPage')) return '/Home/Movement';
  if (currentPath.startsWith('/assetMovement/pages/AAFormPage')) return '/Home/Movement';

};
