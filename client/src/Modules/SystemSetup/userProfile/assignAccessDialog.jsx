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
  Checkbox,
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

// Ids of this node + all its descendants that actually belong to THIS
// column (own: true) - set by filterTreeForSet below. A category row
// that's shown only as a header for its children (own: false, because
// the category itself already moved to the other column) contributes
// nothing here, since there's nothing left to check/move for it.
function collectOwnSubtreeIds(node) {
  const ids = node.own ? [node.id] : [];
  (node.children || []).forEach((c) => ids.push(...collectOwnSubtreeIds(c)));
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
            sx={{ color: node.own ? "text.primary" : "text.disabled", fontSize: { xs: '0.78rem', md: '0.875rem' } }}
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

// Checkbox-driven node for the "Available" column. Checking a category
// checks every "own" id beneath it (and unchecking clears them all);
// the box shows indeterminate when only some of its own descendants are
// checked. A row with nothing to check (own: false and no own
// descendants - i.e. purely a header for an already-moved category) is
// disabled, matching the greyed-out look the plain checkmark used to give it.
function renderCheckboxTreeNode(node, checkedIds, onToggleNode) {
  const ownIds = collectOwnSubtreeIds(node);
  const checkedCount = ownIds.filter((id) => checkedIds.has(id)).length;
  const checked = ownIds.length > 0 && checkedCount === ownIds.length;
  const indeterminate = checkedCount > 0 && checkedCount < ownIds.length;
  const disabled = ownIds.length === 0;

  return (
    <TreeItem
      key={node.id}
      nodeId={node.id}
      label={
        <Box
          display="flex"
          alignItems="center"
          gap={0.5}
          sx={{ py: 0.2 }}
          onClick={(e) => e.stopPropagation()} // don't let a label click bubble into TreeItem's own click handling
        >
          <Checkbox
            size="small"
            checked={checked}
            indeterminate={indeterminate}
            disabled={disabled}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleNode(node, !checked)}
            sx={{ p: 0.5 }}
          />
          <Typography
            variant="body2"
            sx={{ color: disabled ? "text.disabled" : "text.primary", fontSize: { xs: '0.78rem', md: '0.875rem' } }}
          >
            {node.label}
          </Typography>
        </Box>
      }
    >
      {node.children && node.children.map((c) => renderCheckboxTreeNode(c, checkedIds, onToggleNode))}
    </TreeItem>
  );
}

function TreeColumn({ title, treeData, count, search, onSearchChange, selected, onSelect, expanded, onToggleExpand }) {
  const handleExpandAll = () => onToggleExpand(collectAllIds(treeData));
  const handleCollapseAll = () => onToggleExpand([]);

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: '100%', sm: 280, md: 320 },
        height: { xs: 260, sm: 420 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
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
        <Box display="flex" gap={1} sx={{ mt: 0.5 }}>
          <Button
            size="small"
            variant="body2"
            onClick={handleExpandAll}
            disabled={treeData.length === 0}
            sx={{ textTransform: 'none', fontSize: { xs: '0.68rem', md: '0.75rem' }, minWidth: 0, px: 0.5 }}
          >
            Expand All
          </Button>
          <Button
            size="small"
            variant="body2"
            onClick={handleCollapseAll}
            disabled={treeData.length === 0}
            sx={{ textTransform: 'none', fontSize: { xs: '0.68rem', md: '0.75rem' }, minWidth: 0, px: 0.5 }}
          >
            Collapse All
          </Button>
        </Box>
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

// Same shell as TreeColumn, but drives selection via checkboxes
// (checkedIds / onToggleNode) instead of TreeView's own click-select.
function CheckboxTreeColumn({ title, treeData, count, search, onSearchChange, checkedIds, onToggleNode, expanded, onToggleExpand }) {
  const handleExpandAll = () => onToggleExpand(collectAllIds(treeData));
  const handleCollapseAll = () => onToggleExpand([]);

  return (
    <Paper
      variant="outlined"
      sx={{
        width: { xs: '100%', sm: 280, md: 320 },
        height: { xs: 260, sm: 420 },
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box sx={{ p: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontSize: { xs: '0.8rem', md: '0.875rem' } }}>{title}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }}>
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
        <Box display="flex" gap={1} sx={{ mt: 0.5 }}>
          <Button
            size="small"
            variant="body2"
            onClick={handleExpandAll}
            disabled={treeData.length === 0}
            sx={{ textTransform: 'none', fontSize: { xs: '0.68rem', md: '0.75rem' }, minWidth: 0, px: 0.5 }}
          >
            Expand All
          </Button>
          <Button
            size="small"
            variant="body2"
            onClick={handleCollapseAll}
            disabled={treeData.length === 0}
            sx={{ textTransform: 'none', fontSize: { xs: '0.68rem', md: '0.75rem' }, minWidth: 0, px: 0.5 }}
          >
            Collapse All
          </Button>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ overflow: "auto", flex: 1, p: 1 }}>
        {treeData.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
            No items
          </Typography>
        ) : (
          <TreeView
            expanded={expanded}
            onNodeToggle={(_, ids) => onToggleExpand(ids)}
            defaultCollapseIcon={<ExpandMoreIcon fontSize="small" />}
            defaultExpandIcon={<ChevronRightIcon fontSize="small" />}
          >
            {treeData.map((n) => renderCheckboxTreeNode(n, checkedIds, onToggleNode))}
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
 * The "Available" (left) column is checkbox-driven: ticking a category
 * ticks every permission beneath it (and unticking clears them all,
 * with an indeterminate box when only some children are ticked). The
 * "Selected" (right) column still renders as a read-style tree with
 * click-to-select (ctrl/shift for multiple) before moving items back
 * out with the arrow buttons in the middle.
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
  // Checkbox-checked ids in the Available (left) column, staged to move
  // right - replaces the old click-to-select `leftSelected` array.
  const [leftChecked, setLeftChecked] = useState(new Set());
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
      setLeftChecked(new Set());
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

  // Ticking/unticking a node in the Available column cascades to every
  // "own" id in its subtree (a category ticks all its permissions; a
  // leaf permission just ticks itself).
  const handleToggleLeftNode = (node, nextChecked) => {
    const ids = collectOwnSubtreeIds(node);
    setLeftChecked((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (nextChecked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const moveRight = () => {
    setRightIds((prev) => {
      const next = new Set(prev);
      leftChecked.forEach((id) => next.add(id));
      return next;
    });
    setLeftChecked(new Set());
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
    setLeftChecked(new Set());
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Assign Access</DialogTitle>
      <DialogContent>
        {masterLoading ? (
          <Typography sx={{ py: 4, fontSize: { xs: '0.85rem', md: '1rem' } }} align="center" color="text.secondary">
            Loading permission catalog...
          </Typography>
        ) : masterError ? (
          <Typography sx={{ py: 4, fontSize: { xs: '0.85rem', md: '1rem' } }} align="center" color="error">
            Error loading permissions: {masterError}
          </Typography>
        ) : (
        <Box
          display="flex"
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="center"
          gap={2}
          sx={{ pt: 1 }}
        >
          <CheckboxTreeColumn
            title="Available"
            treeData={leftTree}
            count={leftIds.size}
            search={leftSearch}
            onSearchChange={setLeftSearch}
            checkedIds={leftChecked}
            onToggleNode={handleToggleLeftNode}
            expanded={leftExpanded}
            onToggleExpand={setLeftExpanded}
          />

          <Box
            display="flex"
            flexDirection={{ xs: 'row', sm: 'column' }}
            gap={1}
          >
            <IconButton
              onClick={moveAllRight}
              disabled={leftIds.size === 0}
              size="small"
              title="Move all to selected"
              sx={{ transform: { xs: 'rotate(90deg)', sm: 'none' } }}
            >
              <KeyboardDoubleArrowRightIcon />
            </IconButton>
            <IconButton
              onClick={moveRight}
              disabled={leftChecked.size === 0}
              size="small"
              title="Move checked"
              sx={{ transform: { xs: 'rotate(90deg)', sm: 'none' } }}
            >
              <ChevronRightArrowIcon />
            </IconButton>
            <IconButton
              onClick={moveLeft}
              disabled={rightSelected.length === 0}
              size="small"
              title="Remove selected"
              sx={{ transform: { xs: 'rotate(90deg)', sm: 'none' } }}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={moveAllLeft}
              disabled={rightIds.size === 0}
              size="small"
              title="Remove all"
              sx={{ transform: { xs: 'rotate(90deg)', sm: 'none' } }}
            >
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
          <Typography color="error" variant="body2" sx={{ mt: 1, fontSize: { xs: '0.78rem', md: '0.875rem' } }}>
            {saveError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ fontSize: { xs: '0.78rem', md: '0.875rem' } }}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={saving || masterLoading} sx={{ fontSize: { xs: '0.78rem', md: '0.875rem' } }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}