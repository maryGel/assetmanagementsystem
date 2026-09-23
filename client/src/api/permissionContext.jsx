// Maps a route path to the U_CODE required to access it, per
// user_permissions_granted. A path with NO entry here is unrestricted -
// every logged-in user can see/use it regardless of what's granted
// (e.g. Search Trans., Referential, Create Asset, Gen Settings).
//
// Keep this as the single source of truth: both the tile lists and the
// route guards (PermissionRoute) read from it, so adding a new
// restricted path/tile only means adding one line here.
export const PATH_TO_UCODE = {
  '/assetMovement/pages/ADFormPage': 'ASSET_DISPOSAL',
  '/assetFolder/pages/assetMasterList': 'ASSET_LIST',
  '/assetMovement/pages/ALFormPage': 'ASSETLOST',
  '/assetMovement/pages/AAFormPage': 'BORROWER',
  '/assetMovement/pages/JOFormPage': 'JO',
  '/assetMovement/pages/maintenancePage': 'MAINTENANCE',
  '/assetMovement/pages/TRFormPage': 'TRANSFER',
  '/systemSetup/user/userProfile': 'USER_ACCESS',
};  