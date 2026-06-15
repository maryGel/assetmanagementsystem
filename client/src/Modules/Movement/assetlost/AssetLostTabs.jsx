import {useState, useEffect} from 'react';
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
import ALLineItems from './alLineItems';
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

export default function AssetLostTabs({
    useProps,
    isCreating,
    isEditing,
    rows,
    dispatch,
    isReadOnly,
    currentHeader,
    currentALItems,
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
    const hideViewapproval = currentHeader?.xPosted === 0 || currentHeader?.xPosted === 3;
    if(hideViewapproval) {
      setViewApproval(false);
      // If approval tab is currently active and becomes hidden, switch to first tab
      if (value === 1) {
        setValue(0);
      }
    } else {
      setViewApproval(true);
    }
  }, [currentHeader?.xPosted, value]) // Listen specifically to xPosted changes

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
          {(viewApproval && !state.isCreating && copyDocNo?.length > 0 && currentHeader?.xPosted !== 0 && currentHeader?.xPosted !== 3) &&
            <Tab label="Approval Logs" {...a11yProps(1)} sx={{ letterSpacing: '0.10em' }}/>
          }
        </Tabs> 
      </AppBar>
      <TabPanel value={value} index={0} dir={theme.direction} sx={{ width: '100%' }}>
        <ALLineItems 
          state={state}
          isEditing = {isEditing}
          rows={rows}
          dispatch={dispatch}
          isReadOnly={isReadOnly}
          currentHeader={currentHeader}
          currentALItems={currentALItems}
          updateDetailRow={updateDetailRow}
          addDetailRow={addDetailRow}
          removeDetailRow={removeDetailRow}
          handleDeleteClick={handleDeleteClick}
          handleConfirmDelete={handleConfirmDelete}
          handleCancelDelete={handleCancelDelete}
        />
      </TabPanel>
      <TabPanel value={value} index={1} dir={theme.direction}>
        {(viewApproval && !state.isCreating && currentHeader?.xPosted !== 0 && currentHeader?.xPosted !== 3) && (
          <DisplayApprovalHistory
            state={state}
            isEditing = {isEditing}
            rows={rows}
            dispatch={dispatch}
            isReadOnly={isReadOnly}
            currentHeader={currentHeader}
            currentALItems={currentALItems}
            updateDetailRow={updateDetailRow}
            addDetailRow={addDetailRow}
            
          />
        )}
      </TabPanel>
    </Box>
  );
}