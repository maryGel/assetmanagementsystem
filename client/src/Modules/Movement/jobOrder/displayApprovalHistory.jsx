// Kept for backward compatibility: anything that still imports
// DisplayApprovalHistory gets the reusable ApprovalHistoryTable.
// New code should import ApprovalHistoryTable from src/components directly.
import ApprovalHistoryTable from '../../../components/ApprovalHistoryTable';

export default function DisplayApprovalHistory({ docNo, modules }) {
  return <ApprovalHistoryTable docNo={docNo} modules={modules} />;
}