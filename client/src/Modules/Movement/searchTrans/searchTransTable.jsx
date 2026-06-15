import { useState, useMemo, useEffect } from 'react';
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
} from '@mui/material';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import AddIcon from '@mui/icons-material/Add';
import { visuallyHidden } from '@mui/utils';
// Custom Utils
import DateDisplay from '../../../Utils/formatDateForInput';

function descendingComparator(a, b, orderBy) {
  const aValue = a[orderBy];
  const bValue = b[orderBy];

  if (aValue == null || bValue == null) return 0;

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
  { id: 'Date', numeric: true, disablePadding: false, label: 'Date' },
  { id: 'Status', numeric: true, disablePadding: false, label: 'Status'},
  { id: 'Remarks', numeric: true, disablePadding: false, label: 'Remarks'},
  { id: 'Department', numeric: true, disablePadding: false, label: 'Department'},
  { id: 'Location', numeric: true, disablePadding: false, label: 'Location'},
  { id: 'Action', numeric: true, disablePadding: false, label: 'Action'},
];

function EnhancedTableHead(props) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } = props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
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
            sx={{ fontWeight: 'bold' }}
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
};

function EnhancedTableToolbar(props) {
  const { numSelected, selected, onCopyToNew, onExportCsv } = props;

  return (
    <Toolbar
      sx={[
        {
          pl: { sm: 2 },
          pr: { xs: 1, sm: 1 },
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

      {numSelected > 1 ? 
        <Tooltip title="Delete">
          <IconButton>
            <DeleteIcon />
          </IconButton>
        </Tooltip>      
      :         
        <Tooltip title="Copy to New">
          <IconButton
            disabled={numSelected !== 1}
            onClick={(e) => onCopyToNew(selected[0])}
          >
            <FileCopyIcon />
          </IconButton>
        </Tooltip>
      }

      <Tooltip title="Create Document">
        <IconButton
          onClick={() => {
            const path = '/assetMovement/pages/JOFormPage';
            window.open(path, '_blank');
          }}
        >
          <AddIcon />
        </IconButton>
      </Tooltip>

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
  setHeaderTitle,
  selected,
  setSelected
}) {

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('DocNo');  
  const [dense, setDense] = useState(false);

  const rows = Array.isArray(displayedDocs) ? displayedDocs : [];

  const handleDocStatus = (status, reject) => {
    if (status === 0) return 'Draft';
    if (status === 3) return 'For Approval';  
    if (status === 2) return 'Partially Approved';
    if (status === 1) return 'Fully Approved';
    if (status === 4) return 'Rejected';
    return '';
  }

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;
  console.log(`Selected IDs: ${selected.join(', ')}`);
  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = rows.map(row => row.DocNo);
      setSelected(newSelected);
    } else {
      setSelected([]);
    }
  };

  const handleClick = (id) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }
    setSelected(newSelected);
  };

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

    switch (row.DocType) {
      case 'Job Order':
        return window.open(`/assetMovement/pages/JOFormPage?docId=${transNo}`, '_blank');
      case 'Transfer Order Form':
        return window.open(`/assetMovement/pages/TRFormPage?docId=${transNo}`, '_blank');
      case 'Disposal Form':
        return window.open(`/assetMovement/pages/ADFormPage?docId=${transNo}`, '_blank');
      case 'Asset Accountability Form':
        return window.open(`/assetMovement/pages/AAFormPage?docId=${transNo}`, '_blank');
      case 'Lost Asset Form':
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

  const visibleRows = useMemo(() => {
    if (!isTableActive) return [];
    // Apply sorting and pagination
    const sorted = [...rows].sort(getComparator(order, orderBy));
    return sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [rows, order, orderBy, page, rowsPerPage, isTableActive]);

  const handleExportCsv = () => {
    const header = headCells.map((c) => `"${c.label}"`).join(',');
    const body = rows
      .map((row) =>
        headCells
          .map((c) => {
            const val = row[c.id] ?? '';
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

  if (loading) {
    return (
      <Box sx={{ width: '100%', padding: 2 }}>
        <Typography variant="h6" align="center">
          Loading Documents...
        </Typography>
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
        />
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
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
                    <TableCell align="left">{row.DocType}</TableCell>
                    <TableCell align="center"><DateDisplay value={row.Date} format="short" /></TableCell>
                    <TableCell align="left">{handleDocStatus(row.Status, row.Rejected)}</TableCell>
                    <TableCell align="left">{row.Remarks}</TableCell>
                    <TableCell align="left">{row.Department}</TableCell>
                    <TableCell align="left">{row.Location}</TableCell>
                    <TableCell align="left">
                      <IconButton size="small" onClick={() => handleSelectItem(row)}>
                        <FileCopyIcon fontSize="small" />
                      </IconButton>
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
  setHeaderTitle: PropTypes.func,
  selected: PropTypes.array.isRequired,
  setSelected: PropTypes.func.isRequired,
};