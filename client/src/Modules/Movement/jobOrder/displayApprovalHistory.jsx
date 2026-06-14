import {useEffect, useState} from 'react';
import { useSearchParams } from 'react-router-dom';
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Paper} from '@mui/material';

// Hooks
import { useApprovalLogs } from '../../../hooks/useApprovalLogs';

// Utils
import DateDisplay from '../../../Utils/formatDateForInput';





function createData(id, docDate, postingDate, docNum, docType) {
  return { id, docDate, postingDate, docNum, docType };
}

function DisplayApprovalHistory({
  useProps,
}) {

  const [searchParams] = useSearchParams();
  const copyDocNo = searchParams.get('docId');
      
  const { approvalLogs } = useApprovalLogs(useProps);
  const [viewApprovalLogs, setViewApprovalLogs] = useState([]);


  useEffect(() => {
    if (!approvalLogs) return;
    const getApprovalLogs = approvalLogs.filter(log => log.TRNO === copyDocNo && (log.Module === 'Job Order' || log.Module === 'Transfer (Internal)' || log.Module === 'Disposal' || log.Module === 'Asset Accountability'));
    setViewApprovalLogs(getApprovalLogs)
  }, [approvalLogs, copyDocNo]);
  

 console.log(`copyDocNo: ${copyDocNo}`)
 console.log(`viewApprovals: ${viewApprovalLogs}`)


  return (

      <div className='px-10'>
        <div className='pt-5 pb-5 text-base shadow-sm shadow-slate-200'>
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 300, width: '80rem' }} aria-label="simple table">
              <TableHead>
                <TableRow sx={{ color: 'text.primary' }}>
                  <TableCell>Date</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Approver</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                  {viewApprovalLogs.map((row, index) => (
                    <TableRow
                      key={index}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell><DateDisplay value={row.DT} format='short' /></TableCell>
                      <TableCell>{row.APP_LEVEL}</TableCell>
                      <TableCell>{row.X_USER?.split('-')[1]}</TableCell>
                      <TableCell>{row.STAT}</TableCell>
                      <TableCell>{row.REMARKS}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>   
        </div>
      </div>
  )

}

export default DisplayApprovalHistory;