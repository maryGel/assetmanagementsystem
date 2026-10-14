import { useState, useMemo, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { alpha } from '@mui/material/styles';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Toolbar,
  Typography,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  Backdrop
} from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { visuallyHidden } from '@mui/utils';
// Custom Utils
import DateDisplay from '../../../Utils/formatDateForInput';
import { getNextLevel, getCurrentLevel, isPendingApproval } from '../../../Utils/approvalLevelUtils';
import { useAllApprovalLevels } from '../../../Utils/approvalHookFactory';
// hooks


function descendingComparator(a, b, orderBy) {
  const aValue = a[orderBy];
  const bValue = b[orderBy];
  if (aValue == null || bValue == null) return 0;
  if (orderBy === 'Date') {
    const aTime = new Date(aValue).getTime();
    const bTime = new Date(bValue).getTime();
    if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) {
      return bTime - aTime;
    }
  }
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return bValue - aValue;
  }
  return bValue.toString().localeCompare(aValue.toString(), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const headCells = [
  { id: 'DocNo', numeric: false, disablePadding: true, label: 'Document No' },
  { id: 'DocType', numeric: true, disablePadding: false, label: 'Document Type'},
  { id: 'Remarks', numeric: true, disablePadding: false, label: 'Remarks'},
  { id: 'Department', numeric: true, disablePadding: false, label: 'Department'},
  { id: 'Location', numeric: true, disablePadding: false, label: 'Location'},
  { id: 'ItemCount', numeric: true, disablePadding: false, label: 'No. of Items'},
  { id: 'Date', numeric: true, disablePadding: false, label: 'Date' },
  { id: 'Status', numeric: true, disablePadding: false, label: 'Status'},
  { id: 'Action', numeric: true, disablePadding: false, label: 'Level'},
];

// Initial / minimum widths (px) for the resizable columns
const DEFAULT_COLUMN_WIDTHS = {
  DocNo: 150,
  DocType: 170,
  Remarks: 500,
  Department: 200,
  Location: 200,
  ItemCount: 110,
  Date: 120,
  Status: 160,
  Action: 120,
};
const MIN_COLUMN_WIDTH = 70;
const cellOverflowSx = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const CHECKBOX_COLUMN_WIDTH = 48;

// Number of items (distinct FAC_NO) in a document.
// `itemCounts` comes from buildItemCounts(): { [DocType]: { [DocNo]: count } }
function getItemCount(row, itemCounts) {
  const fromLookup = itemCounts?.[row.DocType]?.[String(row.DocNo ?? '').trim()];
  if (fromLookup !== undefined) return fromLookup;
  const raw =
    row.ItemCount ??
    row.itemCount ??
    row.ItemsCount ??
    row.Items ??
    row.items ??
    row.Details ??
    row.details;
  if (Array.isArray(raw)) return raw.length;
  const n = Number(raw);
  return raw === undefined || raw === null || raw === '' || Number.isNaN(n) ? 0 : n;
}

function EnhancedTableHead(props) {
  const {
    onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort,
    columnWidths, onResizeStart,
  } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };
  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox" sx={{ width: CHECKBOX_COLUMN_WIDTH }}>
          {rowCount > 0 && (
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                'aria-label': 'select all documents',
              }}
            />
          )}
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell          
            key={headCell.id}
            align='left'
            padding={headCell.disablePadding ? 'none' : 'normal'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{
              fontWeight: 'bold',
              position: 'relative',
              width: columnWidths[headCell.id],
              minWidth: columnWidths[headCell.id],
              maxWidth: columnWidths[headCell.id],
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              userSelect: 'none',
            }}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : 'asc'}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                </Box>
              ) : null}
            </TableSortLabel>
            {/* Drag handle to resize this column */}
            <Box
              role="separator"
              aria-orientation="vertical"
              aria-label={`Resize ${headCell.label} column`}
              onPointerDown={(e) => onResizeStart(e, headCell.id)}
              onClick={(e) => e.stopPropagation()}
              sx={{
                position: 'absolute',
                top: 0,
                right: 0,
                height: '100%',
                width: 8,
                cursor: 'col-resize',
                touchAction: 'none',
                zIndex: 1,
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: '25%',
                  right: 3,
                  height: '50%',
                  width: 2,
                  borderRadius: 1,
                  backgroundColor: 'divider',
                },
                '&:hover::after': { backgroundColor: 'primary.main' },
              }}
            />
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

EnhancedTableHead.propTypes = {
  numSelected: PropTypes.number.isRequired,
  onRequestSort: PropTypes.func.isRequired,
  onSelectAllClick: PropTypes.func.isRequired,
  order: PropTypes.oneOf(['asc', 'desc']).isRequired,
  orderBy: PropTypes.string.isRequired,
  rowCount: PropTypes.number.isRequired,
  columnWidths: PropTypes.object.isRequired,
  onResizeStart: PropTypes.func.isRequired,
};

function EnhancedTableToolbar(props) {
  const { 
    numSelected, 
    selected, 
    onCopyToNew, 
    onExportCsv,
    onBulkApprove,
    onBulkReject,
    selectedDocuments = []
  } = props;

  // Check if selected documents can be approved/rejected
  const getSelectedDocStatus = useMemo(() => {
    if (selectedDocuments.length === 0) {
      return { canApprove: false, canReject: false, approvableCount: 0, rejectableCount: 0 };
    }
    
    const approvable = selectedDocuments.filter(doc => {
      return doc.Status === 3 || doc.Status === 2;
    });
    
    const rejectable = selectedDocuments.filter(doc => {
      return doc.Status === 3 || doc.Status === 2;
    });
    
    return { 
      canApprove: approvable.length > 0, 
      canReject: rejectable.length > 0,
      approvableCount: approvable.length,
      rejectableCount: rejectable.length
    };
  }, [selectedDocuments]);

  const showBulkActions = numSelected > 0;

  return (
    <Toolbar
      sx={[
        {
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          pl: { sm: 2 },
          pr: { xs: 3, sm: 3 },
          gap: 2,
        },
        numSelected > 0 && {
          bgcolor: (theme) =>
            alpha(theme.palette.primary.main, theme.palette.action.activatedOpacity),
        },
      ]}
    >
      {numSelected > 0 ? (
        <Typography
          sx={{ flex: '1 1 100%' }}
          color="inherit"
          variant="subtitle1"
          component="div"
        >
          {numSelected} selected
        </Typography>
      ) : (
        <Typography
          sx={{ flex: '1 1 100%' }}
          variant="h6"
          id="tableTitle"
          component="div"
        >
          Document List
        </Typography>
      )}
      
      {showBulkActions && (
        <>
          {getSelectedDocStatus.canApprove && onBulkApprove && (
            <Tooltip title={`Bulk Approve (${getSelectedDocStatus.approvableCount} documents)`}>
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<ThumbUpIcon />}
                onClick={onBulkApprove}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 'auto',
                  px: 2
                }}
              >
                Approve 
              </Button>
            </Tooltip>
          )}
          
          {getSelectedDocStatus.canReject && onBulkReject && (
            <Tooltip title={`Bulk Reject (${getSelectedDocStatus.rejectableCount} documents)`}>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<ThumbDownIcon />}
                onClick={onBulkReject}
                sx={{ 
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 'auto',
                  px: 2
                }}
              >
                Reject 
              </Button>
            </Tooltip>
          )}
        </>
      )}
      
      <Tooltip title="Export CSV">
        <IconButton onClick={onExportCsv}>
          <DownloadIcon />
        </IconButton>
      </Tooltip>
    </Toolbar>
  );
}

EnhancedTableToolbar.propTypes = {
  numSelected: PropTypes.number.isRequired,
  selected: PropTypes.array.isRequired,
  onCopyToNew: PropTypes.func.isRequired,
  onExportCsv: PropTypes.func.isRequired,
  onBulkApprove: PropTypes.func,
  onBulkReject: PropTypes.func,
  selectedDocuments: PropTypes.array
};

export default function SearchTransactionTable({ 
  loading, 
  error,
  displayedDocs,
  page,
  total,
  setPage,
  rowsPerPage,
  setRowsPerPage, 
  isTableActive,
  selected,
  setSelected,
  onBulkApprove,
  onBulkReject,
  selectedDocuments = [],
  isRefreshing = false,
  dataVersion = 0,
  itemCounts = {}
}) {
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('Date');  
  const [dense, setDense] = useState(false);
  const [docTypeLevels, setDocTypeLevels] = useState({});
  const [loadingLevels, setLoadingLevels] = useState(true);
  const { getTotalLevelsForDocTypes } = useAllApprovalLevels();
  const rows = Array.isArray(displayedDocs) ? displayedDocs : [];

  // Resizable column widths
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS);

  const handleResizeStart = useCallback((event, columnId) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = columnWidths[columnId] ?? DEFAULT_COLUMN_WIDTHS[columnId];

    const onMove = (e) => {
      const newWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + (e.clientX - startX));
      setColumnWidths((prev) => ({ ...prev, [columnId]: newWidth }));
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [columnWidths]);

  const tableWidth =
    CHECKBOX_COLUMN_WIDTH +
    headCells.reduce((sum, c) => sum + (columnWidths[c.id] ?? DEFAULT_COLUMN_WIDTHS[c.id]), 0);

  // All hooks must be called before any conditional returns
  const handleRequestSort = useCallback((event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  }, [order, orderBy]);

  const isSelected = useCallback((id) => {
    return selected.indexOf(id) !== -1;
  }, [selected]);

  const handleSelectAllClick = useCallback((event) => {
    if (event.target.checked) {
      const newSelected = rows.map(row => row.DocNo);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  }, [rows, setSelected]);

  const handleClick = useCallback((id) => {
    setSelected(prevSelected => {
      const selectedIndex = prevSelected.indexOf(id);
      let newSelected = [];
      if (selectedIndex === -1) {
        newSelected = [...prevSelected, id];
      } else if (selectedIndex === 0) {
        newSelected = prevSelected.slice(1);
      } else if (selectedIndex === prevSelected.length - 1) {
        newSelected = prevSelected.slice(0, -1);
      } else if (selectedIndex > 0) {
        newSelected = [
          ...prevSelected.slice(0, selectedIndex),
          ...prevSelected.slice(selectedIndex + 1),
        ];
      }
      return newSelected;
    });
  }, [setSelected]);

  const handleChangeRowsPerPage = (event) => {
    const newSize = parseInt(event.target.value, 10);
    setRowsPerPage(newSize);
    setPage(0);
  };

  const handleChangeDense = (event) => {
    setDense(event.target.checked);
  };

  const handleSelectItem = (row) => {
    const transNo = row.DocNo;
    const transInternal = 'Transfer Internal'
    switch (row.DocType) {
      case 'Job Order':
        return window.open(`/assetMovement/pages/JOFormPage?docId=${transNo}`, '_blank');
      case 'Transfer':
        return window.open(
          `/assetMovement/pages/TRFormType?docId=${transNo}&transferType=${encodeURIComponent(transInternal)}`,
          '_blank'
        );
      case 'Disposal':
        return window.open(`/assetMovement/pages/ADFormPage?docId=${transNo}`, '_blank');
      case 'Asset Accountability':
        return window.open(`/assetMovement/pages/AAFormPage?docId=${transNo}`, '_blank');
      case 'Lost Asset':
        return window.open(`/assetMovement/pages/ALFormPage?docId=${transNo}`, '_blank');
      default:
        return;
    }        
  };

  const handleClickCopytoNew = (transNo) => {
    if (!transNo) return;
    const path = `/assetMovement/pages/JOFormPage?copyFrom=${transNo}`;
    window.open(path, '_blank');
  };

  const handleDocStatus = (status, reject) => {
    if (status === 0) return 'Draft';
    if (status === 3) return 'For Approval';  
    if (status === 2) return 'Partially Approved';
    if (status === 1) return 'Fully Approved';
    if (status === 4) return 'Rejected';
    return '';
  }

  // Fetch total levels for each document type
  useEffect(() => {
    const fetchAllDocTypeLevels = async () => {
      setLoadingLevels(true);
      try {
        const uniqueDocTypes = [...new Set(rows.map(row => row.DocType).filter(Boolean))];
        
        console.log('📋 Fetching levels for doc types:', uniqueDocTypes);
        
        if (uniqueDocTypes.length === 0) {
          setDocTypeLevels({});
          setLoadingLevels(false);
          return;
        }
        
        const levelsMap = await getTotalLevelsForDocTypes(uniqueDocTypes);
        console.log('📊 Levels map:', levelsMap);
        setDocTypeLevels(levelsMap);
      } catch (err) {
        console.error('Error fetching document type levels:', err);
        const uniqueDocTypes = [...new Set(rows.map(row => row.DocType).filter(Boolean))];
        const levelsMap = {};
        uniqueDocTypes.forEach(docType => {
          levelsMap[docType] = 3;
        });
        setDocTypeLevels(levelsMap);
      } finally {
        setLoadingLevels(false);
      }
    };
    
    if (rows.length > 0) {
      fetchAllDocTypeLevels();
    } else {
      setDocTypeLevels({});
      setLoadingLevels(false);
    }
  }, [rows, dataVersion]);

  const visibleRows = useMemo(() => {
    if (!isTableActive) return [];
       
    const rowsWithLevels = rows.map(row => {
      const totalLevels = docTypeLevels[row.DocType] || 3;
      
      const header = {
        xpost: row.Status,
        appStat: row.appStat || ''
      };
      
      const nextLevel = getNextLevel(header);
      // Last approved level (last entry of appStat)
      const currentLevel = getCurrentLevel(header);
      const isPending = isPendingApproval(header);

      return {
        ...row,
        ItemCount: getItemCount(row, itemCounts),
        nextLevel,
        currentLevel,
        totalLevels,
        levelShortDisplay: currentLevel !== null ? `${currentLevel}/${totalLevels}` : '',
        isPending
      };
    });
    
    const sorted = [...rowsWithLevels].sort(getComparator(order, orderBy));
    const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
    
    return paginated;
  }, [rows, order, orderBy, page, rowsPerPage, isTableActive, docTypeLevels, itemCounts]);

  const handleExportCsv = () => {
    const header = headCells.map((c) => `"${c.label}"`).join(',');
    const body = rows
      .map((row) =>
        headCells
          .map((c) => {
            const val = c.id === 'ItemCount' ? getItemCount(row, itemCounts) : (row[c.id] ?? '');
            return `"${String(val).replace(/"/g, '""')}"`;
          })
          .join(',')
      )
      .join('\n');
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'documents.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  // NOW we can do conditional returns AFTER all hooks are called
  if (loading || isRefreshing) {
    return (
      <Box sx={{ width: '100%', padding: 2, position: 'relative', minHeight: '200px' }}>
        <Backdrop
          open={true}
          sx={{
            position: 'absolute',
            zIndex: 1,
            color: '#fff',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            borderRadius: 1
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              {isRefreshing ? 'Refreshing data...' : 'Loading Documents...'}
            </Typography>
          </Box>
        </Backdrop>
        <Box sx={{ opacity: 0.3, pointerEvents: 'none' }}>
          <Paper sx={{ width: '100%', mb: 2, minHeight: '300px' }} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ width: '100%', padding: 2, textAlign: 'center' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', padding: 2 }}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar 
          numSelected={selected.length} 
          selected={selected}
          onCopyToNew={handleClickCopytoNew}
          onExportCsv={handleExportCsv}
          onBulkApprove={onBulkApprove}
          onBulkReject={onBulkReject}
          selectedDocuments={selectedDocuments}
        />
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table
            sx={{ tableLayout: 'fixed', width: tableWidth, minWidth: tableWidth }}
            aria-labelledby="tableTitle"
            size={dense ? 'small' : 'medium'}
          >
            <EnhancedTableHead
              numSelected={selected.length}
              order={order}
              orderBy={orderBy}
              onSelectAllClick={handleSelectAllClick}
              onRequestSort={handleRequestSort}
              rowCount={rows.length}
              columnWidths={columnWidths}
              onResizeStart={handleResizeStart}
            />
            <TableBody>
              {visibleRows.map((row) => {
                const labelId = `enhanced-table-checkbox-${row.DocNo}`;
                const isItemSelected = isSelected(row.DocNo);
                return (
                  <TableRow
                    key={row.DocNo}
                    selected={isItemSelected}
                    hover
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    onClick={() => handleClick(row.DocNo)}
                    sx={{
                      cursor: 'pointer',
                      '&.Mui-selected': {
                        backgroundColor: 'rgba(25, 118, 210, 0.12)',
                      },
                      '&.Mui-selected:hover': {
                        backgroundColor: 'rgba(25, 118, 210, 0.18)',
                      },
                    }}
                  >
                    <TableCell 
                      padding="checkbox"
                      sx={{ width: 25 }}
                    >
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClick(row.DocNo);
                        }}
                      />
                    </TableCell>
                    <TableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                      sx={{ 
                        fontWeight: 'bold', 
                        color: 'primary.main', 
                        textDecoration: 'underline',                      
                        '&:hover': { fontSize: '.9rem', color: '#43a047' }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectItem(row);
                      }}
                    >
                      {row.DocNo || ""}
                    </TableCell>
                    <TableCell align="left" sx={cellOverflowSx} title={row.DocType}>{row.DocType}</TableCell>
                    <TableCell align="left" sx={cellOverflowSx} title={row.Remarks}>{row.Remarks}</TableCell>
                    <TableCell align="left" sx={cellOverflowSx} title={row.Department}>{row.Department}</TableCell>
                    <TableCell align="left" sx={cellOverflowSx} title={row.Location}>{row.Location}</TableCell>
                    <TableCell align="left">{row.ItemCount}</TableCell>
                    <TableCell align="center"><DateDisplay value={row.Date} format="short" /></TableCell>
                    <TableCell align="left">
                      {handleDocStatus(row.Status, row.Rejected)}
                      {row.isPending && row.nextLevel && (
                        <Typography 
                          component="span" 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            color: 'primary.main',
                            fontSize: '0.7rem',
                            mt: 0.5,
                            fontWeight: 'bold'
                          }}
                        >
                          {/* (Level {row.nextLevel} of {row.totalLevels} is still pending) */}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="left">
                      {row.isPending && row.nextLevel ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: row.Status === 4 ? 'error.main' : 'primary.main',
                              fontWeight: 'bold',
                              fontSize: '0.875rem'
                            }}
                          >
                            {row.levelShortDisplay}
                          </Typography>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'text.secondary',
                              fontSize: '0.65rem'
                            }}
                          >
                            Pending Approval
                          </Typography>
                        </Box>
                      ) : row.Status === 1 ? (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'success.main',
                            fontWeight: 'bold',
                            fontSize: '0.875rem'
                          }}
                        >
                          Completed
                        </Typography>
                      ) : row.Status === 0 ? (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.875rem'
                          }}
                        >
                          Draft
                        </Typography>
                      ) : row.Status === 4 ? (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'error.main',
                            fontWeight: 'bold',
                            fontSize: '0.875rem'
                          }}
                        >
                          Rejected
                        </Typography>
                      ) : (
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: '0.875rem'
                          }}
                        >
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={total}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <FormControlLabel
        control={<Switch checked={dense} onChange={handleChangeDense} />}
        label="Dense padding"
      />
    </Box>
  );
}

SearchTransactionTable.propTypes = {
  loading: PropTypes.bool,
  error: PropTypes.string,
  displayedDocs: PropTypes.array.isRequired,
  page: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  setPage: PropTypes.func.isRequired,
  rowsPerPage: PropTypes.number.isRequired,
  setRowsPerPage: PropTypes.func.isRequired,
  isTableActive: PropTypes.bool,
  selected: PropTypes.array.isRequired,
  setSelected: PropTypes.func.isRequired,
  onBulkApprove: PropTypes.func,
  onBulkReject: PropTypes.func,
  selectedDocuments: PropTypes.array,
  isRefreshing: PropTypes.bool,
  dataVersion: PropTypes.number,
  itemCounts: PropTypes.object
};