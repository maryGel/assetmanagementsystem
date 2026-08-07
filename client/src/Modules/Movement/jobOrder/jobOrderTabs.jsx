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
import JOLineItems from './joLineItems';
import DisplayApprovalHistory from './displayApprovalHistory';



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
        <Box className="w-full px-2 pt-2 lg:px-4">
          <Typography component="div" className="w-full">{children}</Typography>
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

export default function JobOrderTabs({
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
    removeDetailRow,
    handleDeleteClick,
    handleConfirmDelete,
    handleCancelDelete,
    state,
    copyDocNo
}){

  const theme = useTheme();
  const [value, setValue] = useState(0);
  const [viewApproval, setViewApproval] = useState(true);
  const [approvalKey, setApprovalKey] = useState(0);

  useEffect(() => {
    const hideViewapproval = currentHeader?.xpost === 0 || currentHeader?.xpost === 3;
    if(hideViewapproval) {
      setViewApproval(false);
      // If approval tab is currently active and becomes hidden, switch to first tab
      if (value === 1) {
        setValue(0);
      }
    } else {
      setViewApproval(true);
    }
  }, [currentHeader?.xpost, value]) // Listen specifically to xpost changes

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
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile={false}
          sx={{ bgcolor: '#01579b', color: 'white', fontFamily: 'Roboto', width: '100%' }}
          indicatorColor="secondary"
          textColor="inherit"
          aria-label="full width tabs example"
        >
          <Tab label="Item List" {...a11yProps(0)} sx={{ letterSpacing: '0.10em' }}/>
          {(viewApproval && copyDocNo?.length > 0 && currentHeader?.xpost !== 0 && currentHeader?.xpost !== 3) &&
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
          removeDetailRow={removeDetailRow}
          handleDeleteClick={handleDeleteClick}
          handleConfirmDelete={handleConfirmDelete}
          handleCancelDelete={handleCancelDelete}
        />
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        {(viewApproval && currentHeader?.xpost !== 0 && currentHeader?.xpost !== 3) && (
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