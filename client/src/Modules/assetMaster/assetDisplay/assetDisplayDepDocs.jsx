import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';



function createData(id, docDate, postingDate, docNum, depType) {
  return { id, docDate, postingDate, docNum, depType };
}

const rows = [
  createData('1', '01/01/2024', '01/01/2024', '93849402', 'Straight Line'),
  createData('2', '02/01/2024', '02/01/2024', '93849402', 'Straight Line'),
  createData('3', '03/01/2024', '03/01/2024', '93849402', 'Straight Line'),
  createData('4', '04/01/2024', '04/01/2024', '93849402', 'Straight Line'),
  createData('5', '05/01/2024', '05/01/2024', '93849402', 'Straight Line'),
];

export default function AssetDisplayDepDocs(){  
  return(
    <>
      {/*
        TableContainer already scrolls horizontally on its own (MUI default),
        so instead of a fixed width we let the table fill available space
        with a minWidth floor. That keeps columns readable on narrow panes
        and lets the table breathe on wider ones.
      */}
      <TableContainer component={Paper} sx={{ width: '100%', minWidth: 0 }}>
        <Table
          sx={{
            minWidth: 500,
            width: '100%',
            '& .MuiTableCell-root': {
              fontSize: 'clamp(0.72rem, 0.6rem + 0.45vw, 0.875rem)',
            },
          }}
          aria-label="simple table"
        >
          <TableHead>
            <TableRow sx={{ color: 'text.primary' }}>
              <TableCell>Doc. Date</TableCell>
              <TableCell align="right">Date Posted</TableCell>
              <TableCell align="right">Doc. Number</TableCell>
              <TableCell align="right">Depreciation Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell >{row.docDate}</TableCell>
                <TableCell align="right">{row.postingDate}</TableCell>
                <TableCell align="right" sx={{color: 'blue', textDecoration: 'underline'}}>{row.docNum}</TableCell>
                <TableCell align="right">{row.depType}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>   
    </>
  )
}