import ListAltIcon from '@mui/icons-material/ListAlt';
import HistoryIcon from '@mui/icons-material/History';

// Reusable building blocks
import DocTabs from '../../../components/DocTab';
import ApprovalHistoryTable from '../../../components/ApprovalHistoryTable';

import JOLineItems from './joLineItems';

/**
 * Job Order tabs = the reusable <DocTabs> with Job Order content.
 * Other forms (Transfer, Disposal ...) can copy this file and swap the
 * line-items component and the `modules` value.
 */
export default function JobOrderTabs({
  isEditing,
  rows,
  dispatch,
  isReadOnly,
  currentHeader,
  currentJOItems,
  updateDetailRow,
  addDetailRow,
  removeDetailRow,
  handleDeleteClick,
  handleConfirmDelete,
  handleCancelDelete,
  state,
  copyDocNo,
}) {
  // Approval logs only exist once a JO has been approved/rejected at least once
  const xpost = currentHeader?.xpost;
  const showApprovalLogs = !!copyDocNo && xpost !== undefined && xpost !== null && xpost !== 0 && xpost !== 3;

  return (
    <DocTabs
      ariaLabel="job order tabs"
      tabs={[
        {
          key: 'items',
          label: 'Item List',
          icon: ListAltIcon,
          content: (
            <JOLineItems
              state={state}
              isEditing={isEditing}
              rows={rows}
              dispatch={dispatch}
              isReadOnly={isReadOnly}
              currentHeader={currentHeader}
              currentJOItems={currentJOItems}
              updateDetailRow={updateDetailRow}
              addDetailRow={addDetailRow}
              removeDetailRow={removeDetailRow}
              handleDeleteClick={handleDeleteClick}
              handleConfirmDelete={handleConfirmDelete}
              handleCancelDelete={handleCancelDelete}
            />
          ),
        },
        {
          key: 'approval',
          label: 'Approval Logs',
          icon: HistoryIcon,
          hidden: !showApprovalLogs,
          content: (
            <ApprovalHistoryTable
              // remount (and refetch logs) when the JO or its approval state changes
              key={`${copyDocNo}-${xpost}-${currentHeader?.appStat ?? ''}`}
              docNo={copyDocNo}
              modules={['Job Order']}
            />
          ),
        },
      ]}
    />
  );
}