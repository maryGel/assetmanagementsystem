import * as React from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

//import display tabs fields
import AssetDisplayGenInfo from './assetDisplayGenInfo';
import AssetDisplayValue from './assetDisplayValue';
import AssetDisplayTrans from './assetDisplayTrans';



function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      style={{ minWidth: 0 }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3, minWidth: 0 }}>
          <Typography component="div" sx={{ minWidth: 0 }}>{children}</Typography>
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

export default function AssetDisplayTabs({asset, isEditing, setIsEditing, onFieldChange}){

  const theme = useTheme();
  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  }; 

  return (
    <Box sx={{ bgcolor: 'background.paper', width: '100%', minWidth: 0, marginTop: 2, borderRadius: 1, boxShadow: 3 }}>
      <AppBar position="static" sx ={{  borderRadius: 2, boxShadow: 3 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          sx={{ bgcolor: '#01579b', color: 'white', fontFamily: 'Roboto'}}
          indicatorColor="secondary"
          textColor="inherit"
          aria-label="full width tabs example"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label="General Info" {...a11yProps(0)} sx={{ letterSpacing: '0.10em', fontSize: 'clamp(0.72rem, 0.6rem + 0.4vw, 0.875rem)' }}/>
          <Tab label="Finance" {...a11yProps(1)} sx={{ letterSpacing: '0.10em', fontSize: 'clamp(0.72rem, 0.6rem + 0.4vw, 0.875rem)' }}/>
          <Tab label="Transaction" {...a11yProps(2)} sx={{ letterSpacing: '0.10em', fontSize: 'clamp(0.72rem, 0.6rem + 0.4vw, 0.875rem)' }}/>
        </Tabs>
      </AppBar>
      <TabPanel value={value} index={0} dir={theme.direction} sx={{ width: '100%' }}>
        <AssetDisplayGenInfo
          asset={asset}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onFieldChange={onFieldChange}
        />
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        <AssetDisplayValue
          asset={asset}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onFieldChange={onFieldChange}
        />
      </TabPanel>
      <TabPanel value={value} index={2} dir={theme.direction}>
        <AssetDisplayTrans/>
      </TabPanel>
    </Box>
  );
}