import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Paper,
  IconButton,
  Typography,
  TextField,
  Divider,
  Box,
} from "@mui/material";
import { TreeView, TreeItem } from "@mui/lab";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CheckIcon from "@mui/icons-material/Check";
import ChevronRightArrowIcon from "@mui/icons-material/ChevronRight";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";

import { saveUserAccess } from '../../../hooks/useAccess';

// Every id (parent AND child) that exists anywhere in the tree.
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

// Rebuilds the tree, keeping only nodes whose id is in `idSet`, or that
// have at least one descendant in `idSet` (so a category still shows up
// as a header for whichever of its children belong in this column).
// `own: true` means this exact row belongs in this column; `own: false`
// means it's only here to group its children.
function filterTreeForSet(nodes, idSet) {
  const result = [];
  nodes.forEach((n) => {
    const children = n.children ? filterTreeForSet(n.children, idSet) : [];
    const own = idSet.has(n.id);
    if (own || children.length) {
      result.push({ ...n, own, children });
    }
  });
  return result;
}

// Text search on top of the structural filter above - keeps a node if its
// own label matches, or any descendant matches.
function searchTree(nodes, query) {
  if (!query) return nodes;
  const q = query.toLowerCase();
  const result = [];
  nodes.forEach((n) => {
    const children = n.children ? searchTree(n.children, query) : [];
    const matches = n.label?.toLowerCase().includes(q);
    if (matches || children.length) {
      result.push({ ...n, children });
    }
  });
  return result;
}

function renderTreeNode(node) {
  return (
    <TreeItem
      key={node.id}
      nodeId={node.id}
      label={
        <Box display="flex" alignItems="center" gap={1} sx={{ py: 0.4 }}>
          <CheckIcon
            sx={{
              fontSize: 16,
              color: node.own ? "text.secondary" : "transparent",
            }}
          />
          <Typography
            variant="body2"
            sx={{ color: node.own ? "text.primary" : "text.disabled" }}
          >
            {node.label}
          </Typography>
        </Box>
      }
    >
      {node.children && node.children.map(renderTreeNode)}
    </TreeItem>
  );
}

function TreeColumn({ title, treeData, count, search, onSearchChange, selected, onSelect, expanded, onToggleExpand }) {
  return (
    <Paper
      variant="outlined"
      sx={{ width: 320, height: 420, display: "flex", flexDirection: "column" }}
    >
      <Box sx={{ p: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2">{title}</Typography>
          <Typography variant="caption" color="text.secondary">
            {count}
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Search"
          fullWidth
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          sx={{ mt: 1 }}
        />
      </Box>
      <Divider />
      <Box sx={{ overflow: "auto", flex: 1, p: 1 }}>
        {treeData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No items
          </Typography>
        ) : (
          <TreeView
            multiSelect
            expanded={expanded}
            selected={selected}
            onNodeToggle={(_, ids) => onToggleExpand(ids)}
            onNodeSelect={(_, ids) => onSelect(ids)}
            defaultCollapseIcon={<ExpandMoreIcon fontSize="small" />}
            defaultExpandIcon={<ChevronRightIcon fontSize="small" />}
            sx={{
              "& .MuiTreeItem-content.Mui-selected": {
                backgroundColor: "action.selected",
              },
            }}
          >
            {treeData.map(renderTreeNode)}
          </TreeView>
        )}
      </Box>
    </Paper>
  );
}

// Flat id -> permission-row lookup, built from the master tree, so we can
// turn a bare set of selected ids back into full rows to send to the API.
function buildPermissionLookup(nodes) {
  const map = new Map();
  const walk = (list) => {
    list.forEach((n) => {
      map.set(n.id, {
        U_PERM: n.U_PERM ?? n.label,
        U_MAIN: n.U_MAIN ?? (n.children && n.children.length ? 1 : 0),
        U_CODE: n.U_CODE ?? n.id,
        MAIN_CODE: n.MAIN_CODE,
      });
      if (n.children) walk(n.children);
    });
  };
  walk(nodes);
  return map;
}

/**
 * Two-column tree "transfer list" dialog for assigning access rights.
 * Both columns render as expandable trees (matching the main permission
 * tree's look): a checkmark bullet marks rows that actually belong in
 * that column, category rows can be expanded/collapsed, and rows are
 * click-selectable (ctrl/shift for multiple) before moving with the
 * arrow buttons in the middle.
 *
 * The "Available" universe comes from the user_permissions master
 * catalog (masterTreeData, e.g. from useUserPermissions), not from any
 * one user's existing grants - so everything possible is selectable,
 * not just what's already assigned.
 *
 * Props:
 * - open: boolean
 * - onClose: () => void
 * - masterTreeData: full permission catalog tree (from useUserPermissions)
 * - masterLoading / masterError: loading/error state for masterTreeData
 * - checked: Set of currently-granted ids (pre-populates the right column)
 * - gcode: the username permissions are being saved against (G_CODE)
 * - onSaved: (Set, message?) => void, called with the new set of granted
 *   ids (and the backend's success message, if any) after a successful save
 */
export default function AssignAccessDialog({
  open,
  onClose,
  masterTreeData,
  masterLoading,
  masterError,
  checked,
  gcode,
  onSaved,
}) {
  const allIds = useMemo(() => collectAllIds(masterTreeData), [masterTreeData]);
  const permissionLookup = useMemo(() => buildPermissionLookup(masterTreeData), [masterTreeData]);

  const [rightIds, setRightIds] = useState(new Set());
  const [leftSelected, setLeftSelected] = useState([]);
  const [rightSelected, setRightSelected] = useState([]);
  const [leftSearch, setLeftSearch] = useState("");
  const [rightSearch, setRightSearch] = useState("");
  const [leftExpanded, setLeftExpanded] = useState([]);
  const [rightExpanded, setRightExpanded] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Reset local state from the parent's `checked` set every time the dialog opens.
  useEffect(() => {
    if (open) {
      setRightIds(new Set(checked));
      setLeftSelected([]);
      setRightSelected([]);
      setLeftSearch("");
      setRightSearch("");
      setLeftExpanded(allIds);
      setRightExpanded(allIds);
      setSaveError(null);
    }
  }, [open, checked, allIds]);

  const leftIds = useMemo(
    () => new Set(allIds.filter((id) => !rightIds.has(id))),
    [allIds, rightIds]
  );

  const leftTree = useMemo(
    () => searchTree(filterTreeForSet(masterTreeData, leftIds), leftSearch),
    [masterTreeData, leftIds, leftSearch]
  );
  const rightTree = useMemo(
    () => searchTree(filterTreeForSet(masterTreeData, rightIds), rightSearch),
    [masterTreeData, rightIds, rightSearch]
  );

  const moveRight = () => {
    setRightIds((prev) => {
      const next = new Set(prev);
      leftSelected.forEach((id) => next.add(id));
      return next;
    });
    setLeftSelected([]);
  };

  const moveLeft = () => {
    setRightIds((prev) => {
      const next = new Set(prev);
      rightSelected.forEach((id) => next.delete(id));
      return next;
    });
    setRightSelected([]);
  };

  const moveAllRight = () => {
    setRightIds(new Set(allIds));
    setLeftSelected([]);
  };

  const moveAllLeft = () => {
    setRightIds(new Set());
    setRightSelected([]);
  };

  const handleSave = async () => {
    if (!gcode) {
      setSaveError("No user selected - can't save access rights.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const permissions = Array.from(rightIds)
        .map((id) => permissionLookup.get(id))
        .filter(Boolean);

      const result = await saveUserAccess(gcode, permissions);
      onSaved?.(new Set(rightIds), result?.message);
      onClose();
    } catch (err) {
      setSaveError(err.response?.data?.err || err.message || 'Failed to save access rights.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md">
      <DialogTitle>Assign Access</DialogTitle>
      <DialogContent>
        {masterLoading ? (
          <Typography sx={{ py: 4 }} align="center" color="text.secondary">
            Loading permission catalog...
          </Typography>
        ) : masterError ? (
          <Typography sx={{ py: 4 }} align="center" color="error">
            Error loading permissions: {masterError}
          </Typography>
        ) : (
        <Box display="flex" alignItems="center" justifyContent="center" gap={2} sx={{ pt: 1 }}>
          <TreeColumn
            title="Available"
            treeData={leftTree}
            count={leftIds.size}
            search={leftSearch}
            onSearchChange={setLeftSearch}
            selected={leftSelected}
            onSelect={setLeftSelected}
            expanded={leftExpanded}
            onToggleExpand={setLeftExpanded}
          />

          <Box display="flex" flexDirection="column" gap={1}>
            <IconButton onClick={moveAllRight} disabled={leftIds.size === 0} size="small" title="Move all to selected">
              <KeyboardDoubleArrowRightIcon />
            </IconButton>
            <IconButton onClick={moveRight} disabled={leftSelected.length === 0} size="small" title="Move selected">
              <ChevronRightArrowIcon />
            </IconButton>
            <IconButton onClick={moveLeft} disabled={rightSelected.length === 0} size="small" title="Remove selected">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton onClick={moveAllLeft} disabled={rightIds.size === 0} size="small" title="Remove all">
              <KeyboardDoubleArrowLeftIcon />
            </IconButton>
          </Box>

          <TreeColumn
            title="Selected"
            treeData={rightTree}
            count={rightIds.size}
            search={rightSearch}
            onSearchChange={setRightSearch}
            selected={rightSelected}
            onSelect={setRightSelected}
            expanded={rightExpanded}
            onToggleExpand={setRightExpanded}
          />
        </Box>
        )}
        {saveError && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {saveError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || masterLoading}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}