import { useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControl, IconButton, InputLabel, MenuItem, Paper, Select, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TablePagination, TextField,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';

import { AutoResizeTextField } from '../../../Utils/textAreaResizable';
import formatWithCommas from '../../../Utils/formatWithCommas';
import { useJO_d } from '../../../hooks/useJO_d';
import { useJO_woe } from '../../../hooks/useJO_woe';


// Shared with anything that renders a JO/WO status pill (e.g. the Maintenance
// list table), so these are exported rather than duplicated.
export const getStatusColor = (status) => {
  switch (status) {
    case 'Completed':
      return 'bg-green-100 text-green-700';
    case 'Ongoing':
    case 'In Progress':
      return 'bg-blue-100 text-blue-700';
    case 'For Disposal':
      return 'bg-red-100 text-red-700';
    case 'OPEN':
      return 'bg-yellow-100 text-yellow-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const getStatusLabel = (status) => {
  if (!status) return 'Not Started';
  if (status === 'Done') return 'Completed'; // Map Done to Completed for display
  return status;
};

const emptyExpenseForm = () => ({
  date: new Date().toISOString().split('T')[0],
  expenseType: '',
  expenseAmount: '',
  qty: '',
  orNumber: '',
  workDone: '',
});

const safeParseNumber = (value) => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/,/g, '').trim());
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// jo_d rows -> work-order line items, optionally pre-populated with expenses
// keyed by FAC_NO (used in edit mode once jo_woe expenses are fetched).
// Line-item statuses: OPEN (shown as "Open"), In Progress, For Disposal, Completed.
// Rows saved before this change hold ONGOING / DONE, so map them on load.
const normalizeItemStatus = (status) => {
  const value = String(status || '').trim().toUpperCase();
  if (value === '' || value === 'OPEN') return 'OPEN';
  if (value === 'ONGOING' || value === 'IN PROGRESS') return 'In Progress';
  if (value === 'DONE' || value === 'COMPLETED') return 'Completed';
  if (value === 'FOR DISPOSAL') return 'For Disposal';
  return status;
};
const getItemStatusLabel = (status) => (!status || status === 'OPEN' ? 'Open' : status);

// An item whose jo_d row already has an AD_No can no longer have its status changed.
const hasAdNo = (item) => String(item?.original?.AD_No ?? '').trim() !== '';

// Deep links opened in a new tab.
const getJOFormUrl = (joNo) => `/assetMovement/pages/JOFormPage?docId=${encodeURIComponent(joNo)}`;
const getADFormUrl = (adNo) => `/assetMovement/pages/ADFormPage?docId=${encodeURIComponent(adNo)}`;
const getAssetUrl = (facNo) => `/assetFolder/assetMasterDisplay?copyFrom=${encodeURIComponent(facNo)}`;

const linkClass = 'font-medium text-blue-600 underline hover:text-blue-800';
const NewTabLink = ({ href, children, className = linkClass, title }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={className}
    title={title}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </a>
);

const buildItemsFromDetails = (details, expensesByFacNo = {}) => (details || []).map((detail) => ({
  // Keep the full jo_d row so a save can write back every column the
  // maintenance UI doesn't edit (brand, serialno, location, dates, xpost...).
  original: detail,
  FAC_NO: detail.FAC_NO,
  FAC_name: detail.FAC_name,
  qty: detail.qty || 1,
  uom: detail.UOM,
  detailsOfWork: detail.workDet,
  evaluation: detail.eval_status,
  evalremarks: detail.eval_remarks,
  reasonForDisposal: detail.disposal_reason || '',
  status: normalizeItemStatus(detail.Main_Status),
  woRemarks: detail.Main_Remarks || '',
  expenses: expensesByFacNo[detail.FAC_NO] || [],
}));

const generateWorkOrderNumber = (joHeaders = []) => {
  const lastNumber = joHeaders.reduce((max, header) => {
    if (!header.workNo) return max;
    const number = Number(header.workNo.replace('DB-WO-', ''));
    return Number.isNaN(number) ? max : Math.max(max, number);
  }, 0);
  return `DB-WO-${String(lastNumber + 1).padStart(7, '0')}`;
};

/**
 * Work Order dialog, reusable from anywhere: the Maintenance page (create/edit
 * flow) and, e.g., a "Work Order" link on the Line Item Report.
 *
 * Required:
 *   open, onClose, jo ({ JO_No, workNo, wo_date, main_stat }), updateJOHeader
 *
 * Optional:
 *   mode              'create' | 'edit' — defaults to 'edit' when jo.workNo is set, else 'create'
 *   joDetails         pre-filtered jo_d rows for this JO_No (skips the internal fetch — pass this
 *                     when the caller already has the full joDetails list loaded, as the
 *                     Maintenance page does)
 *   joHeaders         only needed in 'create' mode, to generate the next WO number
 *   updateJODetails   overrides the internal useJO_d().updateJODetails (pass the caller's own
 *                     instance so its cache/refresh stays in sync)
 *   joDetailsRefresh  overrides the internal useJO_d().joDetailsRefresh
 *   joRefresh         called after a successful save, if provided
 *   onSaved           called after a successful save, in addition to joRefresh/joDetailsRefresh —
 *                     useful for callers (like a report page) with their own refresh to trigger
 */
export default function WorkOrderDialog({
  open,
  onClose,
  jo,
  mode,
  joDetails,
  joHeaders = [],
  updateJOHeader,
  updateJODetails: _updateJODetailsProp, // kept for caller compatibility; maintenance saves use updateMaintenanceDetails
  joDetailsRefresh: joDetailsRefreshProp,
  joRefresh,
  onSaved,
}) {
  const resolvedMode = mode || (jo?.workNo ? 'edit' : 'create');

  const { getJODetailsByJO, updateMaintenanceDetails, joDetailsRefresh: joDetailsRefreshInternal } = useJO_d();
  const { fetchWorkOrderWithExpenses, createWorkOrderExpense, updateWorkOrderExpense, deleteWorkOrderExpense, generateExpenseId } = useJO_woe();
  const joDetailsRefresh = joDetailsRefreshProp || joDetailsRefreshInternal;

  const isCreateMode = resolvedMode === 'create';
  const [isInitializing, setIsInitializing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // false when hidden, otherwise the success message string to display.
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [selectedItemForExpense, setSelectedItemForExpense] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [workOrderData, setWorkOrderData] = useState({ joNo: '', workNo: '', woDate: '', maintenanceStatus: 'Ongoing', items: [] });

  // Resizable column widths (px), in the same order as the header cells.
  const WO_COLUMNS = ['Item Status', 'FAC No.', 'Item Name', 'Qty', 'UOM', 'Details of Work', 'Evaluation', 'Remarks on Eval.', 'Maintenance Remarks', 'Expenses', 'Actions', 'Reason for Disposal', 'Disposal No'];
  const [colWidths, setColWidths] = useState([160, 190, 180, 70, 80, 260, 140, 180, 220, 130, 140, 200, 150]);
  // "Disposal No" (last column) only appears when at least one item has an AD_No.
  const showDisposalNo = workOrderData.items.some(hasAdNo);
  const visibleColumns = showDisposalNo ? WO_COLUMNS : WO_COLUMNS.slice(0, -1);
  const visibleWidths = showDisposalNo ? colWidths : colWidths.slice(0, -1);
  const totalColWidth = visibleWidths.reduce((a, b) => a + b, 0);

  const startColResize = (e, colIndex) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colIndex];
    const onMove = (ev) => {
      const next = Math.max(60, startWidth + ev.clientX - startX);
      setColWidths((prev) => prev.map((w, i) => (i === colIndex ? next : w)));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const [woItemsPage, setWoItemsPage] = useState(0);
  const [woItemsRowsPerPage, setWoItemsRowsPerPage] = useState(5);

  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [expenseData, setExpenseData] = useState(emptyExpenseForm());
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
  const [expenseErrors, setExpenseErrors] = useState({});

  const [openDisposalDialog, setOpenDisposalDialog] = useState(false);
  const [disposalReason, setDisposalReason] = useState('');

  // Build (create mode) or load (edit mode) the work order whenever the
  // dialog opens for a given JO. This replaces the old handleCreateWorkOrder
  // / handleEditWorkOrder, which used to run before the dialog was shown;
  // here `open` is controlled by the caller, so the fetch happens on open
  // and a brief loading state covers it instead.
  useEffect(() => {
    if (!open || !jo?.JO_No) return;
    let cancelled = false;

    (async () => {
      setIsInitializing(true);
      setSaveError(null);
      setSaveSuccess(false);
      setValidationError(null);
      setSelectedItemIndex(0);
      setWoItemsPage(0);

      try {
        const details = joDetails ?? await getJODetailsByJO(jo.JO_No);

        if (resolvedMode === 'edit') {
          let expenses = [];
          if (jo.workNo) {
            try {
              const result = await fetchWorkOrderWithExpenses(jo.workNo);
              expenses = result?.expenses || [];
            } catch (error) {
              // No expenses yet for this work order — not an error condition.
              console.log('No expenses found for work order:', jo.workNo);
            }
          }
          const expensesByFacNo = expenses.reduce((acc, exp) => {
            const list = acc[exp.FAC_NO] || (acc[exp.FAC_NO] = []);
            list.push({
              id: exp.ID,
              date: exp.xDate,
              expenseType: exp.Expense_Type,
              expenseAmount: exp.expense_amount,
              qty: exp.qty || '1',
              orNumber: exp.OR_No,
              workDone: exp.workDet,
            });
            return acc;
          }, {});

          let status = jo.main_stat || 'Ongoing';
          if (status === 'Done') status = 'Completed';

          if (!cancelled) {
            setWorkOrderData({
              joNo: jo.JO_No,
              workNo: jo.workNo,
              woDate: jo.wo_date,
              maintenanceStatus: 'Ongoing',
              items: buildItemsFromDetails(details, expensesByFacNo),
            });
          }
        } else if (!cancelled) {
          setWorkOrderData({
            joNo: jo.JO_No,
            workNo: generateWorkOrderNumber(joHeaders),
            woDate: new Date().toISOString().split('T')[0],
            maintenanceStatus: '',
            items: buildItemsFromDetails(details),
          });
        }
      } catch (error) {
        console.error('Error loading work order:', error);
        if (!cancelled) setSaveError('Failed to load work order: ' + (error.message || 'unknown error'));
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jo?.JO_No, jo?.workNo, resolvedMode]);

  const isOverallCompleted = workOrderData.maintenanceStatus === 'Completed';

  const validateWorkOrder = () => {
    if (workOrderData.maintenanceStatus === 'Completed') {
      const allItemsValid = workOrderData.items.every((item) => item.status === 'For Disposal' || item.status === 'Completed');
      if (!allItemsValid) {
        setValidationError('To mark as Completed, all items must be either "For Disposal" or "Completed". Please update all item statuses first.');
        return false;
      }
    }
    setValidationError(null);
    return true;
  };

  const handleItemStatusChange = (itemIndex, newStatus) => {
    const updatedItems = workOrderData.items.map((item, index) => index === itemIndex
      ? { ...item, status: newStatus, disposalReason: newStatus === 'For Disposal' ? item.disposalReason || '' : item.disposalReason }
      : item);

    setWorkOrderData({ ...workOrderData, items: updatedItems });

    const hasOngoingItem = updatedItems.some((item) => item.status === 'In Progress');
    const allItemsCompleted = updatedItems.every((item) => item.status === 'Completed' || item.status === 'For Disposal');

    let newOverallStatus = workOrderData.maintenanceStatus;
    if (hasOngoingItem) {
      newOverallStatus = 'Ongoing';
    } else if (allItemsCompleted && updatedItems.length > 0) {
      newOverallStatus = 'Completed';
    } else if (workOrderData.maintenanceStatus === 'Ongoing' && !hasOngoingItem) {
      newOverallStatus = allItemsCompleted ? 'Completed' : 'Ongoing';
    } 
    
    setWorkOrderData((prev) => ({ ...prev, maintenanceStatus: newOverallStatus }));
    setValidationError(null);

    if (newStatus === 'For Disposal') {
      setSelectedItemIndex(itemIndex);
      setOpenDisposalDialog(true);
    }
  };

  const handleOverallStatusChange = (event) => {
    const newStatus = event.target.value;

    if (!newStatus){
      setValidationError('You need to update the Work Order status')
      return;
    }
    if (newStatus === 'Completed') {
      const allItemsValid = workOrderData.items.every((item) => item.status === 'For Disposal' || item.status === 'Completed');
      if (!allItemsValid) {
        setValidationError('Cannot mark as Completed. All items must be either "For Disposal" or "Completed".');
        return;
      }
    }
    setValidationError(null);
    setWorkOrderData({ ...workOrderData, maintenanceStatus: newStatus });
  };

  const handleDisposalSubmit = () => {
    const updatedItems = workOrderData.items.map((item, index) => index === selectedItemIndex
      ? { ...item, disposalReason, status: 'For Disposal' }
      : item);

    setWorkOrderData({ ...workOrderData, items: updatedItems });
    setOpenDisposalDialog(false);
    setDisposalReason('');

    const allItemsCompleted = updatedItems.every((item) => item.status === 'For Disposal' || item.status === 'Completed');
    if (allItemsCompleted) {
      setWorkOrderData((prev) => ({ ...prev, maintenanceStatus: 'Completed' }));
    }
  };

  const persistWorkOrder = async (items, overallStatus) => {
    const dbStatus = overallStatus === 'Completed' ? 'Done' : (overallStatus || 'Ongoing');
    const headerUpdateData = { workNo: workOrderData.workNo, wo_date: workOrderData.woDate, main_stat: dbStatus };
    await updateJOHeader(workOrderData.joNo, headerUpdateData);

    // Only the maintenance columns are sent; the route UPDATEs those columns on
    // the existing rows, so brand, serialno, dates, xpost, etc. are never touched.
    const maintenanceUpdates = items.map((item) => ({
      id: item.original?.id,
      FAC_NO: item.FAC_NO || '',
      Status: item.status || 'OPEN',
      Main_Status: item.status || 'OPEN',
      Main_Remarks: item.woRemarks || '',
      // reasonForDisposal is what was loaded from jo_d; disposalReason is what was typed this session
      disposal_reason: item.disposalReason ?? item.reasonForDisposal ?? '',
    }));
    await updateMaintenanceDetails(workOrderData.joNo, maintenanceUpdates);

    await Promise.all([joRefresh?.(), joDetailsRefresh?.(), onSaved?.()]);
  };

  const handleUpdateWorkOrder = async () => {
    if (!validateWorkOrder()) return;

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await persistWorkOrder(workOrderData.items, workOrderData.maintenanceStatus);
      setSaveSuccess(isCreateMode ? 'Work order created successfully!' : 'Work order updated successfully!');
      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
        setValidationError(null);
      }, 1500);
    } catch (error) {
      console.error('Error updating work order:', error);
      setSaveError(error.response?.data?.error || error.message || 'Failed to update work order');
    } finally {
      setIsSaving(false);
    }
  };

  // Sets every non-disposal item to Completed and the overall status to Completed.
  // Kept for parity with the original form; no button currently calls it
  // there either, so it's exported/available but not wired to UI here.
  const handleFinishJO = async () => {
    const updatedItems = workOrderData.items.map((item) => ({ ...item, status: item.status === 'For Disposal' ? 'For Disposal' : 'Completed' }));
    const allItemsCompleted = updatedItems.every((item) => item.status === 'For Disposal' || item.status === 'Completed');
    if (!allItemsCompleted) {
      setValidationError('Unable to finish JO. Some items are not in a valid state.');
      return;
    }

    setWorkOrderData({ ...workOrderData, items: updatedItems, maintenanceStatus: 'Completed' });
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await persistWorkOrder(updatedItems, 'Completed');
      setSaveSuccess(isCreateMode ? 'Work order created successfully!' : 'Work order updated successfully!');
      setTimeout(() => {
        onClose();
        setSaveSuccess(false);
        setValidationError(null);
      }, 1500);
    } catch (error) {
      console.error('Error finishing JO:', error);
      setSaveError(error.response?.data?.error || error.message || 'Failed to finish JO');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExpense = (item, index) => {
    setSelectedItemForExpense(item);
    setSelectedItemIndex(index);
    setEditingExpenseIndex(null);
    setExpenseErrors({});
    setExpenseData({ ...emptyExpenseForm(), expenseType: 'LABOR EXPENSE' });
    setOpenExpenseDialog(true);
  };

  const handleEditExpense = (item, expenseIndex) => {
    const expense = item.expenses[expenseIndex];
    setSelectedItemForExpense(item);
    setExpenseData({
      date: expense.date, expenseType: expense.expenseType, expenseAmount: expense.expenseAmount,
      qty: expense.qty || '', orNumber: expense.orNumber, workDone: expense.workDone,
    });
    setEditingExpenseIndex(expenseIndex);
    setExpenseErrors({});
    setOpenExpenseDialog(true);
  };

  // Expense Amount, Qty, O.R No. and Work Done/Remarks are mandatory.
  const validateExpense = () => {
    const errors = {};
    if (!String(expenseData.expenseAmount ?? '').trim()) errors.expenseAmount = 'Expense Amount is required';
    if (!String(expenseData.qty ?? '').trim()) errors.qty = 'Qty is required';
    if (!String(expenseData.orNumber ?? '').trim()) errors.orNumber = 'O.R No. is required';
    if (!String(expenseData.workDone ?? '').trim()) errors.workDone = 'Work Done/Remarks is required';
    setExpenseErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveExpense = async () => {
    if (!validateExpense()) return;
    try {
      setIsSaving(true);
      setSaveError(null);

      const selectedItem = workOrderData.items[selectedItemIndex];
      const amount = safeParseNumber(expenseData.expenseAmount);
      const expensePayload = {
        ID: generateExpenseId(),
        FAC_NO: selectedItem.FAC_NO,
        FAC_name: selectedItem.FAC_name,
        xDate: expenseData.date,
        Expense_Type: expenseData.expenseType,
        expense_amount: amount,
        OR_No: expenseData.orNumber,
        workDet: expenseData.workDone,
        workNo: workOrderData.workNo,
        jo_no: workOrderData.joNo,
      };

      const result = editingExpenseIndex !== null
        ? await updateWorkOrderExpense(selectedItem.expenses[editingExpenseIndex].id, expensePayload)
        : await createWorkOrderExpense(expensePayload);

      if (result.success) {
        const updatedItems = workOrderData.items.map((item, index) => {
          if (index !== selectedItemIndex) return item;
          const expenses = [...item.expenses];
          // Store the parsed number (expenseData.expenseAmount may be a formatted
          // string like "1,500.00") and fall back to the payload ID if the API
          // response has no data/id.
          const entry = { ...expenseData, expenseAmount: amount, id: result?.data?.id || expensePayload.ID };
          if (editingExpenseIndex !== null) expenses[editingExpenseIndex] = entry;
          else expenses.push(entry);
          return { ...item, expenses };
        });

        setWorkOrderData({ ...workOrderData, items: updatedItems });
        setOpenExpenseDialog(false);
        setExpenseData(emptyExpenseForm());
        setEditingExpenseIndex(null);
        setSelectedItemForExpense(null);
        setExpenseErrors({});
        setSaveSuccess(editingExpenseIndex !== null ? 'Expense has been updated' : 'Expense has been added');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error);
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      setSaveError(error.message || 'Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (itemIndex, expenseIndex) => {
    try {
      setIsSaving(true);
      setSaveError(null);

      const selectedItem = workOrderData.items[itemIndex];
      const expenseToDelete = selectedItem.expenses[expenseIndex];

      const removeLocally = () => {
        const updatedItems = workOrderData.items.map((item, idx) => idx === itemIndex
          ? { ...item, expenses: item.expenses.filter((_, expIdx) => expIdx !== expenseIndex) }
          : item);
        setWorkOrderData({ ...workOrderData, items: updatedItems });
      };

      if (!expenseToDelete || !expenseToDelete.id) {
        removeLocally();
        return;
      }

      const result = await deleteWorkOrderExpense(expenseToDelete.id);
      if (result.success) {
        removeLocally();
        setSaveSuccess('Expense has been deleted');
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error);
      }
    } catch (error) {
      console.error('Error deleting expense:', error);
      setSaveError(error.message || 'Failed to delete expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => window.print();

  const handleWoItemsChangePage = (_, newPage) => setWoItemsPage(newPage);
  const handleWoItemsChangeRowsPerPage = (event) => { setWoItemsRowsPerPage(parseInt(event.target.value, 10)); setWoItemsPage(0); };

  // Expenses on the selected item can't be edited/deleted once the item is
  // Completed or already has an AD_No.
  const selectedItem = workOrderData.items[selectedItemIndex];
  const isSelectedItemLocked = !!selectedItem && (selectedItem.status === 'Completed' || hasAdNo(selectedItem));

  const overallExpenses = useMemo(
    () => workOrderData.items.reduce(
      (sum, item) => sum + (item.expenses || []).reduce((s, exp) => s + safeParseNumber(exp.expenseAmount), 0),
      0,
    ),
    [workOrderData.items],
  );

  const paginatedWOItems = useMemo(() => {
    const startIndex = woItemsPage * woItemsRowsPerPage;
    return workOrderData.items.slice(startIndex, startIndex + woItemsRowsPerPage);
  }, [workOrderData.items, woItemsPage, woItemsRowsPerPage]);

  return (
    <>
      {/* Work Order Dialog */}
      <Dialog open={open} onClose={onClose} maxWidth="xxl" fullWidth>
        <DialogTitle>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-green-600">Work Order {workOrderData.workNo} </h2>
              <div className="mt-1 text-base text-gray-500">
                <div>
                  <strong>Job Order :</strong>{' '}
                  {workOrderData.joNo ? <NewTabLink href={getJOFormUrl(workOrderData.joNo)} title="Open job order">{workOrderData.joNo}</NewTabLink> : null}
                </div>
              </div>
            </div>
          </div>
        </DialogTitle>
        <DialogContent>
          {saveSuccess && <Alert severity="success" className="mb-4">{saveSuccess}</Alert>}
          {saveError && <Alert severity="error" className="mb-4">Error: {saveError}</Alert>}
          {validationError && <Alert severity="warning" className="mb-4" onClose={() => setValidationError(null)}>{validationError}</Alert>}

          {isInitializing ? (
            <div className="flex items-center justify-center py-16">
              <CircularProgress />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_2fr] gap-4 mt-2 mb-4">
                <FormControl fullWidth required>
                  <InputLabel>Work Order Status</InputLabel>
                  <Select value={workOrderData.maintenanceStatus || 'Ongoing'} onChange={handleOverallStatusChange} label="Work Order Status" disabled={isSaving}>
                    <MenuItem value="Ongoing">Ongoing</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {workOrderData.maintenanceStatus === 'Completed' && (
                <Alert severity="info" className="mb-4">All items must be either "For Disposal" or "Completed" to keep this status.</Alert>
              )}

              <div className="flex justify-end gap-2 mb-4">
                <Button variant="contained" color="primary" onClick={handleUpdateWorkOrder} disabled={isSaving}>
                  {isSaving ? <CircularProgress size={24} /> : (isCreateMode ? 'Create' : 'Update')}
                </Button>
              </div>

              <TableContainer component={Paper} className="mb-4">
                {/* Scroll area: vertical + horizontal. Pagination stays outside so it doesn't scroll away. */}
                <div style={{ maxHeight: 420, overflow: 'auto' }}>
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: totalColWidth, minWidth: totalColWidth }}>
                  <colgroup>
                    {visibleWidths.map((w, i) => <col key={i} style={{ width: w }} />)}
                  </colgroup>
                  <TableHead>
                    <TableRow className="bg-gray-50">
                      {visibleColumns.map((label, i) => (
                        <TableCell
                          key={label}
                          align={i === 9 ? 'center' : (i === 10 || i === 11) ? 'right' : 'left'}
                          sx={{ position: 'relative', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                        >
                          {label}
                          <span
                            onMouseDown={(e) => startColResize(e, i)}
                            onClick={(e) => e.stopPropagation()}
                            title="Drag to resize"
                            style={{ position: 'absolute', top: 0, right: 0, width: 6, height: '100%', cursor: 'col-resize', userSelect: 'none', borderRight: '2px solid #d1d5db' }}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedWOItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={visibleColumns.length} className="px-4 py-8 text-center text-gray-500">No items found</TableCell>
                      </TableRow>
                    ) : (
                      paginatedWOItems.map((item, index) => {
                        const actualIndex = woItemsPage * woItemsRowsPerPage + index;

                        return (
                          <TableRow
                            key={item.FAC_NO || actualIndex}
                            onClick={() => setSelectedItemIndex(actualIndex)}
                            className={`cursor-pointer transition-colors ${selectedItemIndex === actualIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <TableCell>
                              <FormControl
                                size="small"
                                disabled={isSaving || isOverallCompleted || !item.evaluation?.trim() || hasAdNo(item)}
                                fullWidth
                                onClick={(e) => e.stopPropagation()}
                                title={hasAdNo(item) ? `Status is locked: already tied to AD No. ${item.original.AD_No}` : ''}
                              >
                                <Select value={item.status || 'OPEN'} onChange={(e) => handleItemStatusChange(actualIndex, e.target.value)} sx={{ minWidth: 120 }}>
                                  <MenuItem value="OPEN">Open</MenuItem>
                                  <MenuItem value="In Progress">In Progress</MenuItem>
                                  <MenuItem value="For Disposal">For Disposal</MenuItem>
                                  <MenuItem value="Completed">Completed</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              {item.FAC_NO ? <NewTabLink href={getAssetUrl(item.FAC_NO)} title="Open asset">{item.FAC_NO}</NewTabLink> : null}
                            </TableCell>
                            <TableCell 
                              sx={{
                                color: selectedItemIndex === actualIndex ? '#dd2c00' : '', // blue-700 : orange-400
                                fontWeight: selectedItemIndex === actualIndex ? 600 : 400,
                              }}
                            >{item.FAC_name}</TableCell>
                            <TableCell>{item.qty}</TableCell>
                            <TableCell>{item.uom}</TableCell>
                            <TableCell sx={{ verticalAlign: 'top' }}>
                              {/* Fixed at ~3 lines by default; drag the bottom-right corner to resize
                                  both width and height. Content scrolls if it overflows. */}
                              <div
                                title={item.detailsOfWork || ''}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  resize: 'vertical',
                                  overflow: 'auto',
                                  width: '100%',
                                  height: '4.5em',     // 3 lines at line-height 1.5
                                  minHeight: '1.5em',
                                  maxHeight: 400,
                                  lineHeight: 1.5,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  border: '1px solid #e5e7eb',
                                  borderRadius: 4,
                                  padding: '0 4px',
                                  boxSizing: 'content-box',
                                }}
                              >
                                {item.detailsOfWork}
                              </div>
                            </TableCell>
                            <TableCell>{item.evaluation}</TableCell>
                            <TableCell>{item.evalremarks}</TableCell>
                            <TableCell>
                              <AutoResizeTextField
                                value={item.woRemarks || ''}
                                onChange={(e) => {
                                  const updatedItems = workOrderData.items.map((itm, idx) => idx === actualIndex ? { ...itm, woRemarks: e.target.value } : itm);
                                  setWorkOrderData({ ...workOrderData, items: updatedItems });
                                }}
                                disabled={isSaving || isOverallCompleted || !item.evaluation?.trim() || item.status === 'Completed' || hasAdNo(item)}
                                placeholder="Type your remarks here"
                                fullWidth
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <span className="text-sm font-medium">
                                ₱{item.expenses.reduce((total, expense) => total + safeParseNumber(expense.expenseAmount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={isSaving || item.status === 'Completed' || hasAdNo(item)}
                                onClick={() => handleAddExpense(item, actualIndex)}
                                className={`flex items-center gap-2 p-2 bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors 
                                  ${(isSaving || item.status === 'Completed' || hasAdNo(item)) ? 'opacity-50 cursor-not-allowed bg-gray-200' : 'hover:bg-blue-500 hover:text-white'}`}
                              >
                                <AddIcon fontSize="small" />Expense
                              </button>
                            </TableCell>
                            <TableCell align="right">
                              {item.status === 'For Disposal' && <span className="text-sm text-red-600">{item.disposalReason || 'No reason provided'}</span>}
                            </TableCell>
                            {showDisposalNo && (
                              <TableCell>
                                {hasAdNo(item) ? (
                                  <NewTabLink href={getADFormUrl(item.original.AD_No)} title="Open disposal form">{item.original.AD_No}</NewTabLink>
                                ) : null}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 px-4 border-t border-gray-200">
                  <span className="font-semibold text-gray-700">
                    Overall Expenses: <span className="text-blue-600">₱{formatWithCommas(overallExpenses)}</span>
                  </span>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={workOrderData.items.length}
                    rowsPerPage={woItemsRowsPerPage}
                    page={woItemsPage}
                    onPageChange={handleWoItemsChangePage}
                    onRowsPerPageChange={handleWoItemsChangeRowsPerPage}
                  />
                </div>
              </TableContainer>

              <div key={workOrderData.items[selectedItemIndex]?.FAC_NO ?? selectedItemIndex} className="p-4 mt-4 border-2 border-blue-300 rounded-lg bg-blue-50/30">
                <h4 className="mb-2 text-lg font-semibold">
                  Work Details and Expenses
                </h4>
                <div className='flex items-center gap-3'>
                  <span className='text-sm'>Asset Name:</span>
                  <span className='font-medium text-red-600'>{workOrderData.items[selectedItemIndex]?.FAC_name}</span>
                </div>
                {workOrderData.items[selectedItemIndex] && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex gap-3 text-sm text-gray-600">
                        <span>Asset No: </span>
                        <span>
                          {workOrderData.items[selectedItemIndex].FAC_NO}
                        </span>
                        <span className="ml-4">
                          <span className="font-medium">Status:</span>
                          <Chip 
                            label={getItemStatusLabel(workOrderData.items[selectedItemIndex].status)} 
                            size="small" 
                            className={`ml-2 ${getStatusColor(workOrderData.items[selectedItemIndex].status || 'OPEN')}`} />
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        Total Expenses: ₱{formatWithCommas(workOrderData.items[selectedItemIndex]?.expenses.reduce((sum, exp) => sum + safeParseNumber(exp.expenseAmount), 0))}
                      </span>
                    </div>
                    <TableContainer component={Paper}>
                      <Table size="small">
                        <TableHead>
                          <TableRow className="bg-gray-50">
                            <TableCell>Date</TableCell>
                            <TableCell>Expense Type</TableCell>
                            <TableCell>Expense Amount</TableCell>
                            <TableCell>O.R No.</TableCell>
                            <TableCell>Work Done/Remarks</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {workOrderData.items[selectedItemIndex].expenses.map((expense, idx) => (
                            <TableRow key={expense.id || idx}>
                              <TableCell>{expense.date}</TableCell>
                              <TableCell>{expense.expenseType}</TableCell>
                              <TableCell>₱{formatWithCommas(expense.expenseAmount)}</TableCell>
                              <TableCell>{expense.orNumber}</TableCell>
                              <TableCell>{expense.workDone}</TableCell>
                              <TableCell align="right">
                                <IconButton size="small" onClick={() => handleEditExpense(workOrderData.items[selectedItemIndex], idx)} color="primary" disabled={isSaving || isOverallCompleted || isSelectedItemLocked}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDeleteExpense(selectedItemIndex, idx)} color="error" disabled={isSaving || isOverallCompleted || isSelectedItemLocked}>
                                  <span className="text-sm">×</span>
                                </IconButton>
                              </TableCell>
                            </TableRow>
                          ))}
                          {workOrderData.items[selectedItemIndex].expenses.length === 0 && (
                            <TableRow>
                              <TableCell colSpan="6" align="center" className="py-4 text-sm text-gray-400">No expenses recorded for this item</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePrint} startIcon={<PrintIcon />} color="primary">Print</Button>
          <Button onClick={onClose} color="secondary">Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={openExpenseDialog} onClose={() => { setOpenExpenseDialog(false); setEditingExpenseIndex(null); setSelectedItemForExpense(null); }} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingExpenseIndex !== null ? 'Modify Expense' : 'Add Expense'} - {selectedItemForExpense?.FAC_name}
          {editingExpenseIndex !== null && <span className="ml-2 text-sm font-normal text-gray-500">(Editing existing expense)</span>}
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-1 gap-4 mt-2 sm:grid-cols-2">
            <TextField
              label="Date" type="date" value={expenseData.date}
              onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })}
              fullWidth variant="outlined" InputLabelProps={{ shrink: true }} disabled={isSaving || isOverallCompleted}
            />
            <FormControl fullWidth>
              <InputLabel>Expense Type</InputLabel>
              <Select value={expenseData.expenseType} onChange={(e) => setExpenseData({ ...expenseData, expenseType: e.target.value })} label="Expense Type" disabled={isSaving}>
                <MenuItem value="LABOR EXPENSE">LABOR EXPENSE</MenuItem>
                <MenuItem value="PARTS">PARTS</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Expense Amount" type="text" value={expenseData.expenseAmount || ''}
              required error={!!expenseErrors.expenseAmount} helperText={expenseErrors.expenseAmount}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/,/g, '');
                if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                  setExpenseData({ ...expenseData, expenseAmount: rawValue });
                  setExpenseErrors((prev) => ({ ...prev, expenseAmount: undefined }));
                }
              }}
              onBlur={() => {
                const value = expenseData.expenseAmount;
                if (value && value !== '' && !isNaN(parseFloat(value))) {
                  const num = parseFloat(value);
                  if (!isNaN(num) && num > 0) {
                    setExpenseData({ ...expenseData, expenseAmount: num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) });
                  } else if (num === 0) {
                    setExpenseData({ ...expenseData, expenseAmount: '0.00' });
                  }
                }
              }}
              onFocus={() => {
                if (expenseData.expenseAmount) {
                  setExpenseData({ ...expenseData, expenseAmount: String(safeParseNumber(expenseData.expenseAmount)) });
                }
              }}
              fullWidth variant="outlined" disabled={isSaving}
              InputProps={{ startAdornment: <span style={{ marginRight: '8px', color: '#666' }}>₱</span> }}
            />
            <TextField
              label="Qty" type="number" value={expenseData.qty}
              required error={!!expenseErrors.qty} helperText={expenseErrors.qty}
              onChange={(e) => { setExpenseData({ ...expenseData, qty: e.target.value }); setExpenseErrors((prev) => ({ ...prev, qty: undefined })); }}
              fullWidth variant="outlined" disabled={isSaving}
            />
            <TextField
              label="O.R No." value={expenseData.orNumber}
              required error={!!expenseErrors.orNumber} helperText={expenseErrors.orNumber}
              onChange={(e) => { setExpenseData({ ...expenseData, orNumber: e.target.value }); setExpenseErrors((prev) => ({ ...prev, orNumber: undefined })); }}
              fullWidth variant="outlined" disabled={isSaving}
            />
            <TextField
              label="Work Done/Remarks" value={expenseData.workDone}
              required error={!!expenseErrors.workDone} helperText={expenseErrors.workDone}
              onChange={(e) => { setExpenseData({ ...expenseData, workDone: e.target.value }); setExpenseErrors((prev) => ({ ...prev, workDone: undefined })); }}
              fullWidth variant="outlined" multiline rows={3} className="sm:col-span-2" disabled={isSaving}
            />
          </div>
          {saveError && <Alert severity="error" className="mt-3">{saveError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenExpenseDialog(false); setEditingExpenseIndex(null); setSelectedItemForExpense(null); setSaveError(null); setExpenseErrors({}); }} color="secondary">Cancel</Button>
          <Button onClick={handleSaveExpense} variant="contained" color="primary" disabled={isSaving}>
            {isSaving ? <CircularProgress size={24} /> : (editingExpenseIndex !== null ? 'Update' : 'Add')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Disposal Dialog */}
      <Dialog open={openDisposalDialog} onClose={() => setOpenDisposalDialog(false)}>
        <DialogTitle>Reason for Disposal - Item #{workOrderData.items[selectedItemIndex]?.FAC_NO}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus margin="dense" label="Disposal Reason" type="text" fullWidth
            value={disposalReason} onChange={(e) => setDisposalReason(e.target.value)} multiline rows={4} variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDisposalDialog(false)} color="secondary">Cancel</Button>
          <Button onClick={handleDisposalSubmit} variant="contained" color="primary">Submit</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}