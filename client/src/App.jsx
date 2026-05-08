import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './api/ProtectedRoute.jsx';

import Layout from './Utils/headerLayout.jsx';
import HomePage from './pages/HomePage.jsx'; 
import LoginPage from './pages/LoginPage.jsx';

// Asset Master Pages
import AssetMasterListPage from './Modules/assetMaster/pages/AssetMasterListPage.jsx';
import CreateAssetPage from './Modules/assetMaster/pages/CreateAssetPage.jsx';
import AssetMasterDisplay from './Modules/assetMaster/pages/AssetDisplayPage.jsx';
import Practice from './Utils/practice.jsx';
import ReferentialPage from './Modules/assetMaster/pages/ReferentialPage.jsx';

// Asset Movement Pages
import JOFormPage from './Modules/Movement/pages/jobOrderPage.jsx';
import SearchTransactions from './Modules/Movement/pages/searchTransactionsPage.jsx';

// System Setup Pages
import UserAccessPage from './Modules/SystemSetup/pages/userAccessPage.jsx';

// To initialize the header title based on the current page
const getInitialTitle = () => {
  const savedTitle = localStorage.getItem('currentHeaderTitle');
  return savedTitle ? savedTitle : 'Asset Management System';
};


function App() {
  const [headerTitle, setHeaderTitle] = useState(getInitialTitle);
  const [username, setUsername] = useState(() => localStorage.getItem('username') || 'User');

  // To save the header title to localStorage whenever it changes
  const saveTitleUpdate = (newTitle) => {
    localStorage.setItem('currentHeaderTitle', newTitle);
    setHeaderTitle(newTitle);
  };


  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  
  useEffect(() => {
    document.title = headerTitle;
  }, [headerTitle]);

  return (
    <div className="App">
      <Routes>
        {/* Public route - no header */}
        <Route path="/" element={
          <LoginPage 
            setHeaderTitle={saveTitleUpdate}
            setUsername={setUsername}            
          />
        } />

        {/* All protected routes with header - NESTED under the Layout route */}
        <Route element={
          <ProtectedRoute>
            <Layout 
              headerTitle={headerTitle}
              setHeaderTitle={setHeaderTitle}
              username={username}
              isMobile={isMobile}
            />
          </ProtectedRoute>
        }>
          {/* These routes will render INSIDE the Layout component's Outlet */}
           <Route path="/Home/*" element={
            <HomePage
                headerTitle={headerTitle}
                setHeaderTitle={saveTitleUpdate}
                username={username}
                isMobile={isMobile}
              />
          } />

          
          {/* Asset Master Pages */}
          <Route path="/assetFolder/pages/assetMasterList" element={
            <AssetMasterListPage 
              setHeaderTitle={saveTitleUpdate}
            />
          } />
          
          <Route path="/assetFolder/createAsset" element={
            <CreateAssetPage
              setHeaderTitle={saveTitleUpdate}
            />
          } />
          
          <Route path="/assetFolder/pages/referentialPage" element={
            <ReferentialPage
              setHeaderTitle={saveTitleUpdate}
            />
          } />
          
          <Route path="/assetFolder/assetMasterDisplay" element={
            <AssetMasterDisplay
              setHeaderTitle={saveTitleUpdate}
            />
          } />

          {/* Asset Movement Pages */}
          <Route path="/assetMovement/searchTransactions" element={
            <SearchTransactions
              setHeaderTitle={saveTitleUpdate}
            />
          } />

          <Route path="/assetMovement/pages/JOFormPage" element={
            <JOFormPage
              setHeaderTitle={saveTitleUpdate}
            />
          } />

          {/* System Setup Pages */}
          <Route path="/systemSetup/user/userProfile" element={
            <UserAccessPage
              setHeaderTitle={saveTitleUpdate}
            />
          } />
        </Route>

        {/* 404 route */}
        <Route path="*" element={<h1>404 Not Found</h1>} />
      </Routes>
    </div>
  );
}

export default App;