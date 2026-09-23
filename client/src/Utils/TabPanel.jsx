import {useState, useEffect, useMemo} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// TabPanel component to render the content of each tab
import AssetMasterTile from '../Modules/assetMaster/assetMaster/assetMasterTile'
import AssetMovement from '../Modules/Movement/custom Utils/assetMoveTile';
import Depreciation from '../Modules/Depreciation/assetDepRun';
import AssetReports from '../Modules/Reports/assetReport';
import PhysicalCount from '../Modules/Physical/assetPhysicalCount';
import DashboardPage from '../Modules/Dashboard/dashBoardPage';
import SystemSetup from '../Modules/SystemSetup/custom Utils/systemSetupTile';

import { useMyAccess } from '../api/accessContext.jsx';
// ^ adjust if AccessContext.jsx doesn't end up at src/contexts/AccessContext.jsx

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
  };
}

/* --------------------------------------------
-          H O M E  * P A G E *  M E N U
-----------------------------------------------*/

export default function FullWidthTabs({
  tabPaths
}) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasCode, loading: accessLoading } = useMyAccess();

  // Each top-level tab has its own U_CODE in user_permissions_granted -
  // menu visibility is a direct lookup against that code, unrelated to
  // whether any individual tile underneath it is also restricted.
  // label/Component/code line up 1:1 with tabPaths (by position) so
  // each tab keeps its original link.
  const tabDefs = useMemo(() => ([
    { label: 'DASHBOARD', Component: DashboardPage, code: 'DASHBOARD' },
    { label: 'ASSET MASTER', Component: AssetMasterTile, code: 'ASSET_MASTER_MENU' },
    { label: 'MOVEMENT', Component: AssetMovement, code: 'MOVEMENT_MENU' },
    { label: 'DEPRECIATION', Component: Depreciation, code: 'DEPRECIATION_MENU' },
    { label: 'REPORTS', Component: AssetReports, code: 'REPORTS_MENU' },
    { label: 'PHYSICAL COUNT', Component: PhysicalCount, code: 'PHYSICAL_COUNT_MENU' },
    { label: 'SYSTEM SETUP', Component: SystemSetup, code: 'SYSTEM_SETUP_MENU' },
  ]), []);

  // Hide-by-default while the granted-permissions fetch is in flight
  // (same choice used for the tiles), so a tab never flashes into view
  // and then disappears once access data lands.
  const visibleTabs = useMemo(() => {
    if (accessLoading) return [];
    return tabDefs
      .map((def, i) => ({ ...def, link: tabPaths[i]?.link }))
      .filter((def) => hasCode(def.code));
  }, [tabDefs, tabPaths, hasCode, accessLoading]);

  // `value` is a position within visibleTabs, NOT the original fixed id
  // - since hiding tabs shifts positions, it has to be recomputed
  // whenever visibleTabs changes (e.g. once access finishes loading).
  const [value, setValue] = useState(0);

  useEffect(() => {
    const currentPath = location.pathname;
    const foundIndex = visibleTabs.findIndex((tab) => tab.link === currentPath);
    if (foundIndex !== -1) {
      if (foundIndex !== value) setValue(foundIndex);
    } else if (value >= visibleTabs.length) {
      // The previously active tab position no longer exists (e.g. it
      // was hidden once access loaded in) - fall back to the first
      // visible tab rather than pointing at nothing.
      setValue(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, visibleTabs]);

  const handleChange = (e, newValue) => {
    setValue(newValue);
    navigate(visibleTabs[newValue].link);
  };

  if (!accessLoading && visibleTabs.length === 0) {
    return (
      <Box sx={{ bgcolor: 'background.paper', width: '100%', p: 3 }}>
        <Typography color="text.secondary" align="center">
          No modules have been assigned to your account yet. Contact your administrator for access.
        </Typography>
      </Box>
    );
  }

  return (
    <Box  
      sx={{ bgcolor: 'background.paper', width: '100%' }}>
      <AppBar position="static">
        <Tabs
          value={value}
          onChange={handleChange}
          sx={{
            bgcolor: 'white',
            color: '#263238',
            fontFamily: 'Roboto',
            letterSpacing: { xs: '0.05em', md: '0.2em' },
            '& .MuiTab-root': {
              minWidth: { xs: 'auto', md: 90 },
              px: { xs: 1.25, md: 2 },
            },
          }}
          indicatorColor="secondary"
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          aria-label="full width tabs example"
        >
          {visibleTabs.map((tab, i) => (
            <Tab
              key={tab.label}
              label={tab.label}
              sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }}
              {...a11yProps(i)}
            />
          ))}
        </Tabs>
      </AppBar>
      {visibleTabs.map((tab, i) => (
        <TabPanel key={tab.label} value={value} index={i} dir={theme.direction}>
          <tab.Component />
        </TabPanel>
      ))}
    </Box>
  );
}