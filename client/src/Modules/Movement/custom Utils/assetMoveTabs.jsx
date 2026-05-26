import React, {useState, useEffect} from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

//import display tabs fields
import JOLineItems from '../jobOrder/joLineItems';
import DisplayApprovalHistory from '../jobOrder/displayApprovalHistory';



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
        <Box className="pt-2">
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

export default function DocumentTabs({
    useProps,
    isCreating,
    isEditing,
    rows,
    dispatch,
    isReadOnly,
    currentHeader,
    currentJOItems,
    updateDetailRow,
    addDetailRow,
    state
}){

  const theme = useTheme();
  const [value, setValue] = React.useState(0);
  const [viewApproval, setViewApproval] = useState(false)

  useEffect(() => {
    const hideViewapproval = currentHeader?.xpost === 0 || currentHeader?.xpost === 3;
    if(hideViewapproval) {
      setViewApproval(true);
    }
  }, [])

  console.log(`isCreating: ${isCreating}`)

  const handleChange = (event, newValue) => {
    setValue(newValue);
  }; 

  return (
    <Box sx={{ bgcolor: 'background.paper', width: '100%',  borderRadius: 1, boxShadow: 3, paddingBottom: 2 }}>
      <AppBar position="static" sx ={{  borderRadius: 2, boxShadow: 3 }}>
        <Tabs
          value={value}
          onChange={handleChange}
          sx={{ bgcolor: '#01579b', color: 'white', fontFamily: 'Roboto'}}
          indicatorColor="secondary"
          textColor="inherit"
          aria-label="full width tabs example"
        >
          <Tab label="Item List" {...a11yProps(0)} sx={{ letterSpacing: '0.10em' }}/>
          {(!viewApproval && currentHeader?.xpost !== 0 && currentHeader?.xpost !== 3) &&
            <Tab label="Approval Logs" {...a11yProps(1)} sx={{ letterSpacing: '0.10em' }}/>
          }
        </Tabs> 
      </AppBar>
      <TabPanel value={value} index={0} dir={theme.direction} sx={{ width: '100%' }}>
        <JOLineItems 
          state={state}
          isEditing = {isEditing}
          rows={rows}
          dispatch={dispatch}
          isReadOnly={isReadOnly}
          currentHeader={currentHeader}
          currentJOItems={currentJOItems}
          updateDetailRow={updateDetailRow}
          addDetailRow={addDetailRow}
        />
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        {(!viewApproval && currentHeader?.xpost !== 0 && currentHeader?.xpost !== 3) && (
          <DisplayApprovalHistory
            state={state}
            isEditing = {isEditing}
            rows={rows}
            dispatch={dispatch}
            isReadOnly={isReadOnly}
            currentHeader={currentHeader}
            currentJOItems={currentJOItems}
            updateDetailRow={updateDetailRow}
            addDetailRow={addDetailRow}
          />
        )}
      </TabPanel>
    </Box>
  );
}