import {useState, useEffect} from 'react';
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

  const [value, setValue] = useState(() => {
    const currentPath = location.pathname;
    const foundTab = tabPaths.find(tab => tab.link === currentPath);
    return foundTab ? foundTab.id : 0; 
  });

  const handleChange = (e, newValue) => {
    setValue(newValue);
    navigate(tabPaths[newValue].link);
  };

  // Optional: Handle browser back/forward buttons
  useEffect(() => {
    const currentPath = location.pathname;
    const foundTab = tabPaths.find(tab => tab.link === currentPath);
    if (foundTab && foundTab.id !== value) {
      setValue(foundTab.id);
    }
  }, [location.pathname, value]);

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
          <Tab label="DASHBOARD" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(0)} />
          <Tab label="ASSET MASTER" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(1)} />
          <Tab label="MOVEMENT" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(2)} />
          <Tab label="DEPRECIATION" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(3)} />
          <Tab label="REPORTS" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(4)} />
          <Tab label="PHYSICAL COUNT" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(5)} />
          <Tab label="SYSTEM SETUP" sx={{ letterSpacing: { xs: '0.03em', md: '0.1em' }, fontSize: { xs: '0.75rem', md: '0.875rem' } }} {...a11yProps(6)} />
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0} dir={theme.direction}>
        <DashboardPage/>
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        <AssetMasterTile />
      </TabPanel>
      <TabPanel value={value} index={2} dir={theme.direction}>
        <AssetMovement/>
      </TabPanel>
      <TabPanel value={value} index={3} dir={theme.direction}>
        <Depreciation/>
      </TabPanel>
      <TabPanel value={value} index={4} dir={theme.direction}>
        <AssetReports/>
      </TabPanel>
      <TabPanel value={value} index={5} dir={theme.direction}>
        <PhysicalCount/>
      </TabPanel>
      <TabPanel value={value} index={6} dir={theme.direction}>
        <SystemSetup/>
      </TabPanel>
    </Box>
  );
}
