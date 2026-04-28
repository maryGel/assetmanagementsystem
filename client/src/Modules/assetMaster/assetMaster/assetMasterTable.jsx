import * as React from 'react';
import  {useState, useMemo, useEffect}  from 'react';
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
  { id: 'FacNO', numeric: false, disablePadding: true, label: 'Asset Number'},
  { id: 'FacName', numeric: true, disablePadding: false, label: 'Asset Name'},
  { id: 'ItemClass', numeric: true, disablePadding: false, label: 'Asset Class' },
  { id: 'CATEGORY', numeric: true, disablePadding: false, label: 'Category'},
  { id: 'balance_unit', numeric: true, disablePadding: false, label: 'Quantity'},
  { id: 'Unit', numeric: true, disablePadding: false,label: 'UOM'},
  { id: 'ItemLocation', numeric: true, disablePadding: false, label: 'Location'},
  { id: 'Department', numeric: true, disablePadding: false, label: 'Department'},
  {id: 'status', numeric: true, disablePadding: false, label: 'Status'},
];

function EnhancedTableHead(props) {
  const { onSelectAllClick, order, orderBy, numSelected, rowCount, onRequestSort } =
    props;
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
          {props.rowCount > 0 && (
            <Checkbox
              color="primary"
              indeterminate={numSelected > 0 && numSelected < rowCount}
              checked={rowCount > 0 && numSelected === rowCount}
              onChange={onSelectAllClick}
              inputProps={{
                'aria-label': 'select all desserts',
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
            sx ={{ fontWeight: 'bold' }}
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
          Asset Master List
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

      <Tooltip title="Create Asset">
        <IconButton
          onClick={() => {
            const path = '/assetFolder/createAsset';
            window.open(path ,'_blank')
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


// ----------------------------------------------------------------
//                    A S S E T   T A B L E 
// ----------------------------------------------------------------


export default function AssetMasterTable({ 
    loading, 
    error,
    displayedAssets,
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

  // Add debug at top of component
  // console.log('=== TABLE DEBUG ===');
  // console.log('displayedAssets prop:', displayedAssets);
  // console.log('displayedAssets isArray?', Array.isArray(displayedAssets));
  // console.log('displayedAssets length:', displayedAssets?.length);
  // console.log('total:', total);
  // console.log('isTableActive:', isTableActive);

  // MUI States
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('FacNO');  
  const [dense, setDense] = useState(false);
  // const [rowsPerPage, setRowsPerPage] = useState(5);

  const rows = Array.isArray(displayedAssets) ? displayedAssets : [];
    console.log('rows after processing:', rows);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const isSelected = (id) => selected.indexOf(id) !== -1;

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = rows.map(row => row.FacNO);
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
    setRowsPerPage(newSize);   // if you keep local state – but better to call prop
    setPage(0);
  };

  const handleChangeDense = (event) => {
    setDense(event.target.checked);
  };

  const handleSelectItem = (row) => {
    const facNo = row.FacNO || row.FacNo;
    const path = `/assetFolder/assetMasterDisplay?copyFrom=${facNo}`;
    
    setHeaderTitle(`Asset Display`);
    window.open(path, '_blank');

  }; 

  const handleClickCopytoNew = (facNo) => {
    if (!facNo) return;

    // Navigate to Create Asset Page
    const path = `/assetFolder/createAsset?copyFrom=${facNo}`
    window.open(path, '_blank');
  }


  useEffect(() => {
    if (page > 0 && page * rowsPerPage >= rows.length) {
      setPage(0);
    }
  }, [total, page, rowsPerPage, setPage]);



  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = 0;


  // const visibleRows = useMemo(() => {
  //   if (!isTableActive) return [];

  //   return rows
  //     .slice() 
  //     .sort(getComparator(order, orderBy))
  //     .slice(
  //       page * rowsPerPage,
  //       page * rowsPerPage + rowsPerPage
  //     );
  // }, [rows, order, orderBy, page, rowsPerPage]);

  const visibleRows = useMemo(() => {
    if (!isTableActive) return [];
    // Apply sorting to the current page's data (client-side sort is fine)
    return [...rows].sort(getComparator(order, orderBy));
  }, [rows, order, orderBy]);


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
    link.setAttribute('download', 'asset_master.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };


  if(loading){
    return (
      <Box sx={{ width: '100%',  padding: 2}}>
        <Typography variant="h6" align="center">
          Loading Asset Master Data...
        </Typography>
      </Box>
    )
  }

  if(error){
    return (
      <Box sx={{ width: '100%', padding: 2, textAlign: 'center' }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }
  
  
  return (
    <Box sx={{ width: '100%',  padding: 2}}>
      <Paper sx={{ width: '100%', mb: 2 }}>
        <EnhancedTableToolbar 
          numSelected={selected.length} 
          selected={selected}
          onCopyToNew = {handleClickCopytoNew}
          onExportCsv={handleExportCsv}
        />
        <TableContainer>
          <Table
            sx={{ minWidth: 750  }}
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
              sx={{ cursor: 'pointer', fontWeight: 'bold' }}          
            />

            {/*  ... T a b l e  B o d y ... */}

            <TableBody>
              {visibleRows.map((row) => {
              
              const labelId = `enhanced-table-checkbox-${row.FacNO}`;
              const isItemSelected = isSelected(row.FacNO);

                return (
                  <TableRow
                    key={row.FacNO} // use FacNO as key
                    selected={isItemSelected}

                    hover   // disable hover for blank rows
                    onClick={(event) => handleClick(row.FacNO)}                    
                    role="checkbox"
                    aria-checked={isItemSelected}
                    tabIndex={-1}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell 
                      padding="checkbox"
                      sx={{ width: 25 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClick
                      }}
                    >
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClick(row.FacNO)
                        }}
                      />
                    </TableCell>
                    <TableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                      sx={{ 
                        fontWeight: 'bold', color: 'primary.main', textDecoration: 'underline',                      
                        '&:Hover': {fontSize: '1rem', color: '#43a047'}
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectItem(row);
                      }}
                    >
                      {row.FacNO || ""}
                    </TableCell>
                    <TableCell align="left">{row.FacName}</TableCell>
                    <TableCell align="left">{row.ItemClass}</TableCell>
                    <TableCell align="left">{row.CATEGORY}</TableCell>
                    <TableCell align="left">{row.balance_unit}</TableCell>
                    <TableCell align="left">{row.Unit}</TableCell>
                    <TableCell align="left">{row.ItemLocation}</TableCell>
                    <TableCell align="left">{row.Department}</TableCell>
                    <TableCell align="left">{row.status}</TableCell>                    
                  </TableRow> 
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: (dense ? 33 : 53) * emptyRows,
                  }}
                >
                  <TableCell colSpan={6} />
                </TableRow>
              )}
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
