import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Paper,
  Snackbar,
  Alert,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/lab";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from '@mui/icons-material/Check';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

//Custom hooks
import { useAccess } from '../../../hooks/useAccess';
import { useUserPermissions } from '../../../hooks/userUserPermission';
import DeptAccess from './deptAccess';
import ApprovalRouting from './approvalRouting';
import AssignAccessDialog from './assignAccessDialog';


function filterTree(nodes, q) {
  if (!q) return nodes;
  const query = q.toLowerCase();
  const res = [];

  for (const n of nodes) {
    const matches = n.label?.toLowerCase().includes(query) || false;
    const filteredParent = n.parent ? filterTree(n.parent, q) : [];
    if (matches || filteredParent.length) {
      res.push({ ...n, parent: filteredParent });
    }
  }
  return res;
}

function collectAllIds(nodes) {
  const ids = [];
  const walk = (nodes) => {
    nodes.forEach((n) => {
      ids.push(n.id);
      if (n.children) walk(n.children);
    });
  };
  walk(nodes);
  return ids;
}


{/*--------------------------------------------------
       P E R M I S S I O N    C O M P O N E N T
  --------------------------------------------------*/}

export default function PermissionsTree({ isEditing, selectedUser, setSelectedUser, isCreating, formData, onUserChange }) {
  const [checked, setChecked] = useState(new Set());
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState([]);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Use the hook with selected user
  const { accessData, loading, error, refetch } = useAccess(selectedUser?.user);

  // Full permission catalog - this is the universe the Assign Access
  // dialog's "Available" column is built from, independent of this user.
  const { treeData: masterTreeData, loading: masterLoading, error: masterError } = useUserPermissions();

  // The username access rows are saved/loaded under (G_CODE)
  const gcode = selectedUser?.user;

  // Tree data is already transformed from the hook
  const treeData = useMemo(() => {
    return accessData || [];
  }, [accessData]);

  // Get all IDs for select/deselect all functionality
  const allIds = useMemo(() => {
    return collectAllIds(treeData);
  }, [treeData]);

  // Keep `checked` in sync with what's actually granted to this G_CODE in
  // user_permissions_granted (via useAccess).
  useEffect(() => {
    setChecked(new Set(allIds));
  }, [allIds]);

  // Filter tree data based on search query
  const visibleData = useMemo(() => filterTree(treeData, query), [treeData, query]);

  const allSelected = allIds.length > 0 && allIds.every((id) => checked.has(id));

  const handleSelectToggle = () => {
    if (!isEditing) return; // Don't allow when not editing
    
    if (allSelected) {
      setChecked(new Set());
    } else {
      setChecked(new Set(allIds));
    }
  };

  const handleExpandAll = () => setExpanded(allIds.map(String));
  const handleCollapseAll = () => setExpanded([]);

  const handleSearchChange = (event) => {
    setQuery(event.target.value);
  };

  const closeSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleAssignSaved = async (newCheckedSet, message) => {
    setChecked(newCheckedSet);
    await refetch();
    setSnackbar({
      open: true,
      message: message || 'Access rights saved successfully.',
      severity: 'success',
    });
  };

  const renderNode = (node) => {
    return (
      <TreeItem
        key={node.id}
        nodeId={node.id}
        label={
          <Box display="flex" alignItems="center" gap={3} sx={{padding: .3}}>
            <CheckIcon sx={{ fontSize: 'small'}}/>
            <Typography 
              variant="body2" 
              sx={{ color: !isEditing ? 'gray' : 'text.primary', fontSize: 'medium' }}
            >
              {node.label}
            </Typography>
          </Box>
        }
      >
        {node.children && node.children.map(renderNode)}
      </TreeItem>
    );
  };

  if (loading) {
    return (
      <div className='flex justify-between gap-3 flex-3'>
        <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
          <Typography>Loading access data...</Typography>
        </Paper>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex justify-between gap-3 flex-3'>
        <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
          <Typography color="error">Error: {error}</Typography>
        </Paper>
      </div>
    );
  }

  return (
    <div className='flex justify-between h-auto gap-3 flex-3'>
      <Paper variant="outlined" sx={{ p: 2, width: "100%" }}>
        <Typography variant="subtitle1"  fontWeight="bold" mb={1}>
          User Access Rights
        </Typography>

        <div className='flex justify-between pb-3' >          
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={query}
            onChange={handleSearchChange}
            sx={{width: 200}}
          />
          <div className='flex gap-2'>
            <Button
              size="small"
              variant="body2"
              onClick={handleExpandAll}
              sx={{ textTransform: 'none' }}
            >
              Expand All
            </Button>
            <Button
              size="small"
              variant="body2"
              onClick={handleCollapseAll}
              sx={{ textTransform: 'none' }}
            >
              Collapse All
            </Button>
            {isEditing && (
              <Button 
                size="small" 
                variant="body2" 
                onClick={() => setAssignDialogOpen(true)}
                disabled={!isEditing && !isCreating }
                sx={{boxShadow: '0px 4px 8px rgba(0,0,0,0.2)', backgroundColor: '#eceff1', textTransform: 'none'  }}
              >
                 <AssignmentTurnedInIcon/> Assign Access
              </Button>
            )}
          </div>
        </div>

        <Box
          sx={{
            border: "1px solid #ccc",
            borderRadius: 1,
            p: 1,
            height: 'auto',
            overflow: "auto",
            backgroundColor: !isEditing ? 'grey.50' : 'transparent',
          }}
        >
          {visibleData.length > 0 ? (
            <TreeView
              expanded={expanded}
              onNodeToggle={(_, ids) => {
                setExpanded(ids);
              }}
              defaultCollapseIcon={<ExpandMoreIcon fontSize="small" />}
              defaultExpandIcon={<ChevronRightIcon fontSize="small" />}
            >
              {visibleData.map(renderNode)}
            </TreeView>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              No permissions available 
            </Typography>
          )}
        </Box>
        
        {visibleData.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Total permissions: {allIds.length} 
          </Typography>
        )}
      </Paper>

      {/* Second Paper - Approval Routing */}
      <ApprovalRouting 
        selectedUser={selectedUser}
        isEditing={isEditing}
        isCreating={isCreating}
        formData={formData}
        onUserChange={onUserChange}
      />

      {/* Third Paper - Departmental Access Control */}
      <DeptAccess
        selectedUser={selectedUser}
        isEditing={isEditing}
        isCreating={isCreating}
        formData={formData}
        onUserChange={onUserChange}
      />

      {/* Assign Access - two-column transfer list */}
      <AssignAccessDialog
        open={assignDialogOpen}
        onClose={() => setAssignDialogOpen(false)}
        masterTreeData={masterTreeData}
        masterLoading={masterLoading}
        masterError={masterError}
        checked={checked}
        gcode={gcode}
        onSaved={handleAssignSaved}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }} onClose={closeSnackbar}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}