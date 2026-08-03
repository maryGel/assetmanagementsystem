import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';


function createData(id,year, period, depType, status, depAmt, bookValue) {
  return { id, year, period, depType, status, depAmt, bookValue };
}

const rows = [
  createData('1', '2024', '01', 'Straight Line', 'Posted', '5,000', '75,000'),
  createData('2', '2024', '02', 'Straight Line', 'Posted', '5,000', '70,000'),
  createData('3', '2024', '03', 'Straight Line', 'Posted', '5,000', '65,000'),
  createData('4', '2024', '04', 'Straight Line', 'Posted', '5,000', '60,000'),
  createData('5', '2024', '05', 'Straight Line', 'Planned Value', '5,000', '55,000'),
];

export default function AssetDisplayDepSched(){
  return(
    <>
    {/*
      Same approach as the other display tables: fill available width with a
      minWidth floor instead of a fixed rem width, relying on TableContainer's
      built-in horizontal scroll when space is tight.
    */}
    <TableContainer component={Paper} sx={{ width: '100%', minWidth: 0 }}>
      <Table
        sx={{
          minWidth: 600,
          width: '100%',
          '& .MuiTableCell-root': {
            fontSize: 'clamp(0.72rem, 0.6rem + 0.45vw, 0.875rem)',
          },
        }}
        aria-label="simple table"
      >
        <TableHead>
          <TableRow sx={{ color: 'text.primary' }}>
            <TableCell>Year</TableCell>
            <TableCell align="right">Period</TableCell>
            <TableCell align="right">Dep. Type</TableCell>
            <TableCell align="right">Status</TableCell>
            <TableCell align="right">Depreciation Amt</TableCell>
            <TableCell align="right">Book Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell >
                {row.year}
              </TableCell>
              <TableCell align="right">{row.period}</TableCell>
              <TableCell align="right">{row.depType}</TableCell>
              <TableCell align="right">{row.status}</TableCell>
              <TableCell align="right">{row.depAmt}</TableCell>
              <TableCell align="right">{row.bookValue}</TableCell>

            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
    </>
  )
}