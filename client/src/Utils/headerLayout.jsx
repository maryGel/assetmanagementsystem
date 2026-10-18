import { Suspense, useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CircularProgress } from '@mui/material';
import Header from './header';
import SidebarMenu from './SidebarMenu';

const getInitialCollapsed = () => {
  try {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  } catch {
    return false;
  }
};

// Loader for the content area only. Because this Suspense boundary sits
// inside the layout, a lazy page that is still loading no longer hides the
// whole screen (sidebar and header included) behind App.jsx's full-screen
// loader - only the right-hand content shows a spinner.
function ContentLoader() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 min-h-[50vh]"
      role="status"
      aria-live="polite"
    >
      <CircularProgress size={40} />
      <p className="text-sm font-medium text-gray-600">Loading page…</p>
    </div>
  );
}

function Layout({ headerTitle, setHeaderTitle, username, isMobile }) {
  const [collapsed, setCollapsed] = useState(getInitialCollapsed);

  // Remember the choice (kept out of the state updater so it stays pure).
  useEffect(() => {
    try {
      localStorage.setItem('sidebarCollapsed', String(collapsed));
    } catch {
      /* remembering the choice is optional */
    }
  }, [collapsed]);

  // Stable identity so the memoized sidebar isn't re-rendered needlessly.
  const toggleCollapsed = useCallback((next) => {
    setCollapsed((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  // Mobile keeps its own home screen / navigation, so no sidebar there.
  if (isMobile) {
    return (
      <Suspense fallback={<ContentLoader />}>
        <Outlet />
      </Suspense>
    );
  }

  return (
    <>
      {/* Fixed on the left - stays put while pages change on the right */}
      <SidebarMenu collapsed={collapsed} setCollapsed={toggleCollapsed} />

      {/* Right side: header on top, then whichever page was selected */}
      <div
        className={`min-h-screen transition-[margin] duration-200 ${
          collapsed ? 'ml-16' : 'ml-64'
        }`}
      >
        <Header
          headerTitle={headerTitle}
          setHeaderTitle={setHeaderTitle}
          username={username}
          isMobile={isMobile}
        />
        <Suspense fallback={<ContentLoader />}>
          <Outlet />
        </Suspense>
      </div>
    </>
  );
}

export default Layout;
