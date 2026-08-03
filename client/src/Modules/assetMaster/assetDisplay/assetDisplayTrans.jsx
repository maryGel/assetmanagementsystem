import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';



function createData(id, docDate, postingDate, docNum, docType) {
  return { id, docDate, postingDate, docNum, docType };
}

const rows = [
  createData('1', '01/01/2024', '01/01/2024', '93849402', 'Goods receipt'),
  createData('2', '02/01/2024', '02/01/2024', '93849402', 'Job order'),
  createData('3', '03/01/2024', '03/01/2024', '93849402', 'Asset Disposal'),
  createData('4', '04/01/2024', '04/01/2024', '93849402', 'Transfer'),
  createData('5', '05/01/2024', '05/01/2024', '93849402', 'Retirement'),
];

export default function AssetDisplayTrans(){  
  return(
    <div className='w-full min-w-0 px-10'>
      <div className='pt-5 pb-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] shadow-sm shadow-slate-200 min-w-0'>
        {/*
          Fill available width with a minWidth floor instead of a fixed
          rem width, matching the other display tables. minWidth: 0 on the
          TableContainer lets it actually shrink and trigger its own
          horizontal scroll instead of pushing an ancestor wider.
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
                <TableCell align="right">Transaction Type</TableCell>
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
                  <TableCell align="right">{row.docType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>   
      </div>
    </div>
  )
}