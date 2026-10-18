import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header';
import SidebarMenu from './SidebarMenu';

const getInitialCollapsed = () => {
  try {
    return localStorage.getItem('sidebarCollapsed') === 'true';
  } catch {
    return false;
  }
};

function Layout({ headerTitle, setHeaderTitle, username, isMobile }) {
  const [collapsed, setCollapsedState] = useState(getInitialCollapsed);

  const setCollapsed = (next) => {
    setCollapsedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      try {
        localStorage.setItem('sidebarCollapsed', String(value));
      } catch {
        /* remembering the choice is optional */
      }
      return value;
    });
  };

  // Mobile keeps its own home screen / navigation, so no sidebar there.
  if (isMobile) {
    return <Outlet />;
  }

  return (
    <>
      {/* Fixed on the left - stays put while pages change on the right */}
      <SidebarMenu collapsed={collapsed} setCollapsed={setCollapsed} />

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
        <Outlet />
      </div>
    </>
  );
}

export default Layout;
