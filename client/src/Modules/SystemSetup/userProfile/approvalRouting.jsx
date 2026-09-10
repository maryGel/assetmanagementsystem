import { useState, useMemo } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Stack,
  Paper,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/lab";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from '@mui/icons-material/Check';

//Custom hooks
import { useApproval } from '../../../hooks/refApproval';


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

// All node ids (modules + leaves) - used for Expand All / Collapse All.
function collectAllIds(nodes) {
  const ids = [];
  const walk = (list) => {
    list.forEach((n) => {
      ids.push(n.id);
      if (n.children) walk(n.children);
    });
  };
  walk(nodes);
  return ids;
}

// APP_CODE from every LEAF node only (module/parent rows are groupings
// and have no APP_CODE of their own). This is what MULTI_APP is built
// from and compared against.
function collectAllCodes(nodes) {
  const codes = [];
  const walk = (list) => {
    list.forEach((n) => {
      if (n.children && n.children.length) {
        walk(n.children);
      } else if (n.APP_CODE) {
        codes.push(n.APP_CODE);
      }
    });
  };
  walk(nodes);
  return codes;
}


{/*--------------------------------------------------
        A P P R O V A L    C O M P O N E N T
  --------------------------------------------------*/}

// MULTI_APP is a single pipe-delimited string of APP_CODE values from
// ref_approval on user0000inv, e.g. "jo_hod|ad_hod|ad_dof". The unique
// identifier for each leaf row is its APP_CODE (NOT the tree node's
// internal `id`, which is the ref_approval row's primary key and is
// only used for TreeView expand/collapse bookkeeping).
export default function ApprovalRouting({ isEditing, selectedUser, isCreating, formData, onUserChange }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState([]);

  const { refApprovals, loading, error } = useApproval();

  const treeData = useMemo(() => refApprovals || [], [refApprovals]);
  const allNodeIds = useMemo(() => collectAllIds(treeData), [treeData]);
  const allCodes = useMemo(() => collectAllCodes(treeData), [treeData]);

  // While editing, the draft lives in formData (kept in sync via
  // onUserChange as boxes are ticked). When not editing, fall back to
  // the persisted value on selectedUser so the list shows real saved
  // state read-only.
  const rawMultiApp = isEditing
    ? (formData?.MULTI_APP ?? '')
    : (selectedUser?.MULTI_APP ?? '');

  // Approval routing can only be assigned once the user is flagged as an
  // Approver. While editing, read the live draft value from formData (kept
  // in sync via the Approver checkbox in UserInfo); otherwise fall back to
  // the persisted value on selectedUser.
  const isApprover = isEditing
    ? Number(formData?.Approver) === 1
    : Number(selectedUser?.Approver) === 1;

  // Tree is only interactive when we're editing AND the user is an Approver.
  const canAssignApprovals = isEditing && isApprover;

  const checked = useMemo(() => {
    return new Set(
      String(rawMultiApp)
        .split('|')
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }, [rawMultiApp]);

  // Leaf: its own APP_CODE is granted. Parent/module: every child's APP_CODE is granted.
  const isNodeChecked = (node) => {
    if (node.children && node.children.length) {
      const codes = collectAllCodes([node]);
      return codes.length > 0 && codes.every((c) => checked.has(c));
    }
    return Boolean(node.APP_CODE) && checked.has(node.APP_CODE);
  };

  const handleNodeClick = (node) => {
    if (!canAssignApprovals) return;

    const codesToToggle = node.children && node.children.length
      ? collectAllCodes([node])
      : (node.APP_CODE ? [node.APP_CODE] : []);

    if (codesToToggle.length === 0) return;

    const nowChecked = isNodeChecked(node);
    const next = new Set(checked);
    codesToToggle.forEach((code) => {
      if (nowChecked) next.delete(code);
      else next.add(code);
    });

    onUserChange({ MULTI_APP: Array.from(next).join('|') });
  };

  const visibleData = useMemo(() => filterTree(treeData, query), [treeData, query]);
  const allSelected = allCodes.length > 0 && allCodes.every((code) => checked.has(code));

  const handleSelectToggle = () => {
    if (!canAssignApprovals) return;
    onUserChange({ MULTI_APP: allSelected ? '' : allCodes.join('|') });
  };

  const handleExpandAll = () => setExpanded(allNodeIds.map(String));
  const handleCollapseAll = () => setExpanded([]);

  const renderNode = (node) => {
    const isSelected = isNodeChecked(node);
    // Blue only when the tree is actually assignable (editing + Approver
    // ticked); read-only / locked view shows a neutral grey fill for
    // granted items so it's clear nothing here is currently editable.
    const showBlue = canAssignApprovals && isSelected;

    return (
      <TreeItem
        key={node.id}
        nodeId={node.id.toString()}
        onClick={(e) => {
          e.stopPropagation(); // prevent bubbling to ancestor TreeItems
          handleNodeClick(node);
        }}
        sx={{ cursor: canAssignApprovals ? 'pointer' : 'default' }}
        label={
          <Box display="flex" alignItems="center" gap={1} sx={{ py: 0.5 }}>
            <Box
              sx={{
                width: 18,
                height: 18,
                border: '1px solid',
                borderColor: showBlue ? 'primary.main' : (isSelected ? 'grey.500' : 'grey.400'),
                borderRadius: 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: showBlue ? 'primary.main' : (isSelected ? 'grey.400' : 'transparent'),
                transition: '0.2s'
              }}
            >
              {isSelected && <CheckIcon sx={{ fontSize: 14, color: 'white' }} />}
            </Box>
            <Typography
              variant="body2"
              sx={{ color: !canAssignApprovals ? 'gray' : 'text.primary', fontSize: { xs: '0.8rem', md: '0.875rem' } }}
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
      <Paper variant="outlined" sx={{ p: 2, width: '100%', minWidth: 0, flex: { md: 1 } }}>
        <Typography sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>Loading approval routing data...</Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper variant="outlined" sx={{ p: 2, width: '100%', minWidth: 0, flex: { md: 1 } }}>
        <Typography color="error" sx={{ fontSize: { xs: '0.85rem', md: '1rem' } }}>Error loading approval routing: {error}</Typography>
      </Paper>
    );
  }

  return (
      <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 }, width: '100%', minWidth: 0, flex: { md: 1 } }}>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          mb={2}
          sx={{ fontSize: { xs: '0.9rem', md: '1rem' } }}
        >
          Approval Routing
        </Typography>

        {isEditing && !isApprover && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block', fontSize: { xs: '0.7rem', md: '0.75rem' } }}
          >
            Tick "Approver" in User Information to assign approval areas.
          </Typography>
        )}

        <Stack direction="row" spacing={1} justifyContent={'space-between'} alignItems="center" mb={2} flexWrap="wrap" rowGap={1}>
          <TextField
            label="Search"
            variant="outlined"
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ width: { xs: '100%', sm: 300 } }}
          />
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
            <Button
              size="small"
              variant="body2"
              onClick={handleExpandAll}
              sx={{ textTransform: 'none', fontSize: { xs: '0.7rem', md: '0.8125rem' } }}
            >
              Expand All
            </Button>
            <Button
              size="small"
              variant="body2"
              onClick={handleCollapseAll}
              sx={{ textTransform: 'none', fontSize: { xs: '0.7rem', md: '0.8125rem' } }}
            >
              Collapse All
            </Button>
            {canAssignApprovals && (
              <Button
                size="small"
                variant="body2"
                onClick={handleSelectToggle}
                sx={{ textTransform: 'none', fontSize: { xs: '0.7rem', md: '0.8125rem' } }}
              >
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            )}
          </Stack>
        </Stack>

        <Box
          sx={{
            border: "1px solid #eee",
            borderRadius: 1,
            height: 'auto',
            overflow: "auto",
            backgroundColor: !canAssignApprovals ? 'grey.50' : 'transparent',
            opacity: isEditing && !isApprover ? 0.6 : 1,
          }}
        >
          {visibleData.length > 0 ? (
            <TreeView
              defaultCollapseIcon={<ExpandMoreIcon />}
              defaultExpandIcon={<ChevronRightIcon />}
              expanded={expanded}
              onNodeToggle={(_, ids) => setExpanded(ids)}
            >
              {visibleData.map(renderNode)}
            </TreeView>
          ) : (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
              No approval routing items available
            </Typography>
          )}
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
          Selected: {checked.size} / {allCodes.length}
        </Typography>
      </Paper>
  );
}