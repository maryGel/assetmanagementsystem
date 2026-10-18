import { memo, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';

import { menuConfig } from './menuConfig.jsx';
import { useMyAccess } from '../api/accessContext.jsx';

export const SIDEBAR_WIDTH = 256; // px, expanded (w-64)
export const SIDEBAR_WIDTH_COLLAPSED = 64; // px, icon rail (w-16)

// Fixed left sidebar. It stays put while the page on the right scrolls and
// changes; the page itself is rendered by Layout's <Outlet />.
function SidebarMenu({ collapsed, setCollapsed }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { hasCode, hasAccess, loading } = useMyAccess();
  // Manual open/close per group; the group holding the current page is
  // open by default so the user always sees where they are.
  const [openGroups, setOpenGroups] = useState({});

  // Hide-by-default while permissions load so nothing flashes in and out.
  const menus = useMemo(() => {
    if (loading) return [];
    return menuConfig
      .filter((m) => hasCode(m.code))
      .map((m) => ({
        ...m,
        // a "leaf" menu (Dashboard) is a page itself; the others are groups
        leaf: m.items.length === 0,
        items: m.items.filter((i) => hasAccess(i.link)),
      }));
  }, [loading, hasCode, hasAccess]);

  const isActiveMenu = (m) =>
    m.leaf ? pathname.startsWith('/Home') : m.items.some((i) => i.link === pathname);

  const isOpen = (m) =>
    openGroups[m.label] !== undefined ? openGroups[m.label] : isActiveMenu(m);

  const handleMenuClick = (m) => {
    // Dashboard opens its page; every other menu only expands/collapses,
    // so the right side never changes until a sub-link is clicked.
    if (m.leaf) {
      navigate(m.link);
      return;
    }
    if (collapsed) {
      setCollapsed(false);
      setOpenGroups((p) => ({ ...p, [m.label]: true }));
    } else {
      setOpenGroups((p) => ({ ...p, [m.label]: !isOpen(m) }));
    }
  };

  return (
    <aside
      aria-label="Main menu"
      className={`fixed inset-y-0 left-0 z-40 flex flex-col text-slate-200 transition-[width] duration-200 bg-gradient-to-b from-[#0d0820] via-[#1a0d3a] to-[#2b1257] ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && (
          <span className="text-sm font-semibold tracking-wider text-white truncate">
            Asset Management
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className={`p-1 rounded-md text-slate-300 hover:bg-white/10 hover:text-white ${collapsed ? 'mx-auto' : ''}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <MenuIcon fontSize="small" /> : <MenuOpenIcon fontSize="small" />}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 pt-4 pb-2 text-[10px] font-bold tracking-[0.2em] text-slate-400">
          MAIN MENU
        </div>
      )}

      {/* scrollbarGutter reserves the scrollbar's space so the menu doesn't
          shift sideways when a long list makes the scrollbar appear. */}
      <nav
        className="flex-1 px-2 pb-4 overflow-y-auto"
        style={{ scrollbarGutter: 'stable' }}
      >
        {loading && !collapsed && (
          <p className="px-3 py-2 text-xs text-slate-400">Loading menu…</p>
        )}

        {menus.map((m) => {
          const open = isOpen(m) && !collapsed;
          const active = isActiveMenu(m);
          const MenuIconComp = m.Icon;

          return (
            <div key={m.label} className="mb-1">
              <button
                type="button"
                onClick={() => handleMenuClick(m)}
                title={collapsed ? m.label : undefined}
                aria-expanded={m.items.length > 0 ? open : undefined}
                className={`flex items-center w-full gap-3 px-3 py-2.5 text-sm rounded-xl border transition-colors ${
                  active
                    ? 'bg-indigo-500/20 border-indigo-400/40 text-indigo-200 font-semibold'
                    : 'border-transparent hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <MenuIconComp fontSize="small" />
                {!collapsed && <span className="flex-1 text-left">{m.label}</span>}
                {!collapsed && m.items.length > 0 && (
                  <ExpandMoreIcon
                    fontSize="small"
                    className={`transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {/* Always rendered and animated open/closed (grid-rows 0fr -> 1fr)
                  instead of being mounted/unmounted, so the list slides
                  rather than popping in and out. `invisible` when closed
                  keeps the hidden links out of the tab order. */}
              {m.items.length > 0 && (
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr] invisible'
                  }`}
                  aria-hidden={!open}
                >
                  <ul className="min-h-0 overflow-hidden ml-5 border-l border-white/10">
                    {m.items.map((item, idx) => (
                      <li key={item.id} className={idx === 0 ? 'pt-1' : ''}>
                        <NavLink
                          to={item.link}
                          tabIndex={open ? 0 : -1}
                          className={({ isActive }) =>
                            `flex items-center gap-2 pl-4 pr-3 py-2 text-[13px] rounded-lg transition-colors ${
                              isActive
                                ? 'text-indigo-200 font-semibold bg-white/10'
                                : 'text-slate-300 hover:text-white hover:bg-white/5'
                            }`
                          }
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                          {item.title}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// memo: skip re-rendering when the parent re-renders (e.g. header title
// changes) with the same props; URL changes still update it via useLocation.
export default memo(SidebarMenu);
