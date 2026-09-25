import {useState} from 'react';
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse
} from '@mui/material';

import {
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';


export default function RefTabs({handleOpenTab}){

    const [openGenSet, setOpenGenSet] = useState(false);
    const [openItemAssigment, setOpenItemAssigment] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null) 
  
    const handleGenSetClick = () => setOpenGenSet(prev => !prev);
    const handleItemClick = () => setOpenItemAssigment(prev => !prev);   
    const handleSubItemClick = (item) => {
      setSelectedItem(item)
      handleOpenTab(item)
    }

    return(
      <List
        sx={{ width: '100%', maxWidth: 300, bgcolor: 'background.paper', borderRadius: 4, boxShadow: '0px 1px 2px rgba(0,0,0,0.25)'}}
        component="nav"
        aria-labelledby="nested-list-subheader"
      >
          <ListItemButton onClick={handleGenSetClick}>
            <ListItemIcon sx={{ minWidth: 0, marginRight: 1 }}>
              <SettingsIcon  />
            </ListItemIcon>
            <ListItemText primary="General" />
            {openGenSet === 'settings' ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>

          <Collapse in={openGenSet} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {[
                'Unit of Measure', 
                'Brand',
                'Color',
                'Supplier',
                ].map((item) => (
                  <ListItemButton 
                    key = {item}
                    sx={{ 
                      pl: 8,
                      '&.Mui-selected': {
                          bgcolor: '#0091ea',
                          color: 'white',
                          '&:hover': { bgcolor: '#0091ea' },
                        },
                    }}
                    selected = {selectedItem === item}
                    onClick = {() => handleSubItemClick(item)}
                  >
                    <ListItemText primary={item} />
                  </ListItemButton>
              ))}
            </List>
          </Collapse>

          <ListItemButton onClick={handleItemClick}>
          <ListItemIcon sx={{ minWidth: 0, marginRight: 1 }}>
            <AssignmentIcon />
          </ListItemIcon>
          <ListItemText primary="Item Assignment" />
            {openItemAssigment ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openItemAssigment} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {[
                'Asset Category',
                'Asset Class',
                'Location',
                'Department',
                'Maintenance',
                'Depreciation Type',
                'Journal Entries'
              ].map((item) => (
                <ListItemButton
                  key={item}
                  sx={{
                    pl: 8,
                    '&.Mui-selected': {
                      bgcolor: '#0091ea',
                      color: 'white',
                      '&:hover': { bgcolor: '#0091ea' },
                    },
                  }}
                  selected={selectedItem === item}
                  onClick={() => handleSubItemClick(item)}
                >
                  <ListItemText primary={item} />
                </ListItemButton>
              ))}
            </List>
          </Collapse>
      </List>
    )

}