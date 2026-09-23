import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import ProtectedRoute from "./api/ProtectedRoute.jsx";
import PermissionRoute from "./api/PermissionRoute.jsx";
import Layout from "./Utils/headerLayout.jsx";
import { AccessProvider } from "./api/accessContext.jsx";
// ^ adjust these two import paths (./api/PermissionRoute.jsx and
// ./contexts/AccessContext.jsx) to wherever those files actually end up

// Public pages
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const HomePage = lazy(() => import("./pages/HomePage.jsx"));

// Asset Master pages
const AssetMasterListPage = lazy(() =>
  import("./Modules/assetMaster/pages/AssetMasterListPage.jsx")
);
const CreateAssetPage = lazy(() =>
  import("./Modules/assetMaster/pages/CreateAssetPage.jsx")
);
const AssetMasterDisplay = lazy(() =>
  import("./Modules/assetMaster/pages/AssetDisplayPage.jsx")
);
const ReferentialPage = lazy(() =>
  import("./Modules/assetMaster/pages/ReferentialPage.jsx")
);

// Asset Movement pages
const JOFormPage = lazy(() =>
  import("./Modules/Movement/pages/jobOrderPage.jsx")
);
const TRFormPage = lazy(() =>
  import("./Modules/Movement/pages/transferFormPage.jsx")
);
const ADFormPage = lazy(() =>
  import("./Modules/Movement/pages/disposalPage.jsx")
);
const AAFormPage = lazy(() =>
  import("./Modules/Movement/pages/assetAccPage.jsx")
);
const ALFormPage = lazy(() =>
  import("./Modules/Movement/pages/assetLostPage.jsx")
);
const SearchTransactions = lazy(() =>
  import("./Modules/Movement/pages/searchTransactionsPage.jsx")
);
const MaintenancePageDesktop = lazy(() =>
  import("./Modules/Movement/pages/maintenancePage.jsx")
);

// Physical Count pages
const PhysicalCountPlanning = lazy(() =>
  import("./Modules/Physical/physicalCountPlanning.jsx")
);
const CountSheetGenerator = lazy(() =>
  import("./Modules/Physical/countSheetGenerator.jsx")
);
const AssetIdentification = lazy(() =>
  import("./Modules/Physical/assetIdentification.jsx")
);
const SessionDetails = lazy(() =>
  import("./Modules/Physical/sessionDetails.jsx")
);
const AssetQrPrint = lazy(() =>
  import("./Modules/Physical/assetQrPrint.jsx")
);

// System Setup pages
const UserAccessPage = lazy(() =>
  import("./Modules/SystemSetup/pages/userAccessPage.jsx")
);

const CompanySetupPage = lazy(() =>
  import("./Modules/SystemSetup/pages/companyConfigPage.jsx")
);

// Reports pages
const AssetReportPage = lazy(() =>
  import("./Modules/Reports/pages/assetReportPage.jsx")
);

const LineItemReportPage = lazy(() =>
  import("./Modules/Reports/pages/lineItemRepPage.jsx")
);





// Header
const getInitialTitle = () =>
  localStorage.getItem("currentHeaderTitle") || "Asset Management System";


function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/80"
      role="status"
      aria-live="polite"
    >
      <CircularProgress size={52} />
      <p className="text-sm font-medium text-gray-700">Loading page…</p>
    </div>
  );
}

function App() {
  const [headerTitle, setHeaderTitle] = useState(getInitialTitle);
  const [username, setUsername] = useState(
    () => localStorage.getItem("username") || "User"
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const saveTitleUpdate = (newTitle) => {
    localStorage.setItem("currentHeaderTitle", newTitle);
    setHeaderTitle(newTitle);
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    document.title = headerTitle;
  }, [headerTitle]);

  return (
    <div className="App">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route
            path="/"
            element={
              <LoginPage
                setHeaderTitle={saveTitleUpdate}
                setUsername={setUsername}
              />
            }
          />

          <Route
            element={
              <ProtectedRoute>
                {/* AccessProvider fetches the logged-in user's granted
                    permissions once and exposes hasAccess() to every
                    page/tile below - both the tile lists and the
                    PermissionRoute guards on individual routes read
                    from it. */}
                <AccessProvider>
                  <Layout
                    headerTitle={headerTitle}
                    setHeaderTitle={setHeaderTitle}
                    username={username}
                    isMobile={isMobile}
                  />
                </AccessProvider>
              </ProtectedRoute>
            }
          >
            <Route
              path="/Home/*"
              element={
                <HomePage
                  headerTitle={headerTitle}
                  setHeaderTitle={saveTitleUpdate}
                  username={username}
                  isMobile={isMobile}
                />
              }
            />

            <Route
              path="/assetFolder/pages/assetMasterList"
              element={
                <PermissionRoute path="/assetFolder/pages/assetMasterList">
                  <AssetMasterListPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />
            <Route
              path="/assetFolder/createAsset"
              element={<CreateAssetPage setHeaderTitle={saveTitleUpdate} />}
            />
            <Route
              path="/assetFolder/pages/referentialPage"
              element={<ReferentialPage setHeaderTitle={saveTitleUpdate} />}
            />
            <Route
              path="/assetFolder/assetMasterDisplay"
              element={<AssetMasterDisplay setHeaderTitle={saveTitleUpdate} />}
            />

            <Route
              path="/assetMovement/searchTransactions"
              element={<SearchTransactions setHeaderTitle={saveTitleUpdate} />}
            />
            <Route
              path="/assetMovement/pages/JOFormPage"
              element={
                <PermissionRoute path="/assetMovement/pages/JOFormPage">
                  <JOFormPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />
            <Route
              path="/assetMovement/pages/maintenancePage"
              element={
                <PermissionRoute path="/assetMovement/pages/maintenancePage">
                  <MaintenancePageDesktop setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />
            <Route
              path="/assetMovement/pages/TRFormPage"
              element={
                <PermissionRoute path="/assetMovement/pages/TRFormPage">
                  <TRFormPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />
            <Route
              path="/assetMovement/pages/ADFormPage"
              element={
                <PermissionRoute path="/assetMovement/pages/ADFormPage">
                  <ADFormPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />
            <Route
              path="/assetMovement/pages/AAFormPage"
              element={
                <PermissionRoute path="/assetMovement/pages/AAFormPage">
                  <AAFormPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />
            <Route
              path="/assetMovement/pages/ALFormPage"
              element={
                <PermissionRoute path="/assetMovement/pages/ALFormPage">
                  <ALFormPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />

            <Route
              path="/Physical/physicalCountPlanning"
              element={<PhysicalCountPlanning />}
            />
            <Route
              path="/assetPhysical/countSheets"
              element={<CountSheetGenerator />}
            />
            <Route
              path="/assetPhysical/assetScanner"
              element={<AssetIdentification />}
            />
            <Route
              path="/assetPhysical/assetPrintQr"
              element={<AssetQrPrint />}
            />
            <Route
              path="/physicalCount/session"
              element={<SessionDetails />}
            />

            {/* Reports */}
            <Route
              path="/assetReports/assetSummaryReport"
              element={<AssetReportPage setHeaderTitle={saveTitleUpdate} />}
            />

             <Route
              path="/assetReports/assetLineItemReport"
              element={<LineItemReportPage setHeaderTitle={saveTitleUpdate} />}
            />

            {/* System Setup */}
            <Route
              path="/systemSetup/user/userProfile"
              element={
                <PermissionRoute path="/systemSetup/user/userProfile">
                  <UserAccessPage setHeaderTitle={saveTitleUpdate} />
                </PermissionRoute>
              }
            />

            <Route
              path="/systemSetup/companyConfig"
              element={<CompanySetupPage setHeaderTitle={saveTitleUpdate} />}
            />
          </Route>

          <Route path="*" element={<h1>404 Not Found</h1>} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;