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
    case 'Done':
      return 'bg-green-100 text-green-700';
    case 'Ongoing':
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
const buildItemsFromDetails = (details, expensesByFacNo = {}) => (details || []).map((detail) => ({
  FAC_NO: detail.FAC_NO,
  FAC_name: detail.FAC_name,
  qty: detail.qty || 1,
  uom: detail.UOM,
  detailsOfWork: detail.workDet,
  evaluation: detail.eval_status,
  evalremarks: detail.eval_remarks,
  reasonForDisposal: detail.disposal_reason || '',
  status: detail.Main_Status || 'OPEN',
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
  updateJODetails: updateJODetailsProp,
  joDetailsRefresh: joDetailsRefreshProp,
  joRefresh,
  onSaved,
}) {
  const resolvedMode = mode || (jo?.workNo ? 'edit' : 'create');

  const { getJODetailsByJO, updateJODetails: updateJODetailsInternal, joDetailsRefresh: joDetailsRefreshInternal } = useJO_d();
  const { fetchWorkOrderWithExpenses, createWorkOrderExpense, updateWorkOrderExpense, deleteWorkOrderExpense, generateExpenseId } = useJO_woe();
  const updateJODetails = updateJODetailsProp || updateJODetailsInternal;
  const joDetailsRefresh = joDetailsRefreshProp || joDetailsRefreshInternal;

  const [isInitializing, setIsInitializing] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const [selectedItemForExpense, setSelectedItemForExpense] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [workOrderData, setWorkOrderData] = useState({ joNo: '', workNo: '', woDate: '', maintenanceStatus: '', items: [] });

  const [woItemsPage, setWoItemsPage] = useState(0);
  const [woItemsRowsPerPage, setWoItemsRowsPerPage] = useState(5);

  const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
  const [expenseData, setExpenseData] = useState(emptyExpenseForm());
  const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);

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

          let status = jo.main_stat || '';
          if (status === 'Done') status = 'Completed';

          if (!cancelled) {
            setWorkOrderData({
              joNo: jo.JO_No,
              workNo: jo.workNo,
              woDate: jo.wo_date,
              maintenanceStatus: status,
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
      const allItemsValid = workOrderData.items.every((item) => item.status === 'For Disposal' || item.status === 'DONE');
      if (!allItemsValid) {
        setValidationError('To mark as Completed, all items must be either "For Disposal" or "Done". Please update all item statuses first.');
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

    const hasOngoingItem = updatedItems.some((item) => item.status === 'ONGOING');
    const allItemsCompleted = updatedItems.every((item) => item.status === 'DONE' || item.status === 'For Disposal');

    let newOverallStatus = workOrderData.maintenanceStatus;
    if (hasOngoingItem) {
      newOverallStatus = 'Ongoing';
    } else if (allItemsCompleted && updatedItems.length > 0) {
      newOverallStatus = 'Completed';
    } else if (workOrderData.maintenanceStatus === 'Ongoing' && !hasOngoingItem) {
      newOverallStatus = allItemsCompleted ? 'Completed' : '';
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
    if (newStatus === 'Completed') {
      const allItemsValid = workOrderData.items.every((item) => item.status === 'For Disposal' || item.status === 'DONE');
      if (!allItemsValid) {
        setValidationError('Cannot mark as Completed. All items must be either "For Disposal" or "Done".');
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

    const allItemsCompleted = updatedItems.every((item) => item.status === 'For Disposal' || item.status === 'DONE');
    if (allItemsCompleted) {
      setWorkOrderData((prev) => ({ ...prev, maintenanceStatus: 'Completed' }));
    }
  };

  const persistWorkOrder = async (items, overallStatus) => {
    const dbStatus = overallStatus === 'Completed' ? 'Done' : overallStatus;
    const headerUpdateData = { workNo: workOrderData.workNo, wo_date: workOrderData.woDate, main_stat: dbStatus };
    await updateJOHeader(workOrderData.joNo, headerUpdateData);

    const detailsUpdateData = items.map((item) => ({
      FAC_NO: item.FAC_NO || '',
      FAC_name: item.FAC_name || '',
      qty: item.qty || 1,
      UOM: item.uom || '',
      workDet: item.detailsOfWork || '',
      TargetDate: null,
      Status: item.status || 'OPEN',
      brand: '',
      serialNo: '',
      ItemLocation: '',
      xDate: null,
      xpost: 0,
      eval_status: item.evaluation || '',
      eval_remarks: item.evalremarks || '',
      disposal_reason: item.disposalReason || '',
      Main_Status: item.status || 'OPEN',
      Main_Remarks: item.woRemarks,
    }));
    await updateJODetails(workOrderData.joNo, detailsUpdateData);

    await Promise.all([joRefresh?.(), joDetailsRefresh?.(), onSaved?.()]);
  };

  const handleUpdateWorkOrder = async () => {
    if (!validateWorkOrder()) return;

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);
    try {
      await persistWorkOrder(workOrderData.items, workOrderData.maintenanceStatus);
      setSaveSuccess(true);
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

  // Sets every non-disposal item to DONE and the overall status to Completed.
  // Kept for parity with the original form; no button currently calls it
  // there either, so it's exported/available but not wired to UI here.
  const handleFinishJO = async () => {
    const updatedItems = workOrderData.items.map((item) => ({ ...item, status: item.status === 'For Disposal' ? 'For Disposal' : 'DONE' }));
    const allItemsCompleted = updatedItems.every((item) => item.status === 'For Disposal' || item.status === 'DONE');
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
      setSaveSuccess(true);
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
    setOpenExpenseDialog(true);
  };

  const handleSaveExpense = async () => {
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
          const entry = { ...expenseData, id: result.data.id || generateExpenseId() };
          if (editingExpenseIndex !== null) expenses[editingExpenseIndex] = entry;
          else expenses.push(entry);
          return { ...item, expenses };
        });

        setWorkOrderData({ ...workOrderData, items: updatedItems });
        setOpenExpenseDialog(false);
        setExpenseData(emptyExpenseForm());
        setEditingExpenseIndex(null);
        setSelectedItemForExpense(null);
        setSaveSuccess(true);
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
        setSaveSuccess(true);
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

  const paginatedWOItems = useMemo(() => {
    const startIndex = woItemsPage * woItemsRowsPerPage;
    return workOrderData.items.slice(startIndex, startIndex + woItemsRowsPerPage);
  }, [workOrderData.items, woItemsPage, woItemsRowsPerPage]);

  return (
    <>
      {/* Work Order Dialog */}
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Work Order</h2>
              <div className="mt-1 text-sm text-gray-500">
                <div><strong>Job Order :</strong> {workOrderData.joNo}</div>
                <div><strong>Work Order :</strong> {workOrderData.workNo}</div>
              </div>
            </div>
            <Chip label={getStatusLabel(workOrderData.maintenanceStatus)} className={getStatusColor(workOrderData.maintenanceStatus)} />
          </div>
        </DialogTitle>
        <DialogContent>
          {saveSuccess && <Alert severity="success" className="mb-4">Work order updated successfully!</Alert>}
          {saveError && <Alert severity="error" className="mb-4">Error: {saveError}</Alert>}
          {validationError && <Alert severity="warning" className="mb-4" onClose={() => setValidationError(null)}>{validationError}</Alert>}

          {isInitializing ? (
            <div className="flex items-center justify-center py-16">
              <CircularProgress />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_2fr] gap-4 mt-2 mb-4">
                <FormControl fullWidth>
                  <InputLabel>Overall JO Status</InputLabel>
                  <Select value={workOrderData.maintenanceStatus} onChange={handleOverallStatusChange} label="Overall JO Status" disabled={isSaving}>
                    <MenuItem value="">Not Started</MenuItem>
                    <MenuItem value="Ongoing">Ongoing</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </div>

              {workOrderData.maintenanceStatus === 'Completed' && (
                <Alert severity="info" className="mb-4">All items must be either "For Disposal" or "Done" to keep this status.</Alert>
              )}

              <div className="flex justify-end gap-2 mb-4">
                <Button variant="contained" color="primary" onClick={handleUpdateWorkOrder} disabled={isSaving}>
                  {isSaving ? <CircularProgress size={24} /> : 'Update'}
                </Button>
              </div>

              <TableContainer component={Paper} className="mb-4">
                <Table size="small">
                  <TableHead>
                    <TableRow className="bg-gray-50">
                      <TableCell>Item Status</TableCell>
                      <TableCell>FAC No.</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Qty</TableCell>
                      <TableCell>UOM</TableCell>
                      <TableCell>Details of Work</TableCell>
                      <TableCell>Evaluation</TableCell>
                      <TableCell>Remarks on Eval.</TableCell>
                      <TableCell>Maintenance Remarks</TableCell>
                      <TableCell align="center">Expenses</TableCell>
                      <TableCell align="right">Actions</TableCell>
                      <TableCell align="right">Reason for Disposal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedWOItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan="11" className="px-4 py-8 text-center text-gray-500">No items found</TableCell>
                      </TableRow>
                    ) : (
                      paginatedWOItems.map((item, index) => {
                        const actualIndex = woItemsPage * woItemsRowsPerPage + index;
                        const isExpenseEnabled = item.status === 'OPEN' || item.status === 'ONGOING' || item.status === 'DONE' || (item.evaluation && item.evaluation.trim() !== '');

                        return (
                          <TableRow
                            key={item.FAC_NO || actualIndex}
                            onClick={() => setSelectedItemIndex(actualIndex)}
                            className={`cursor-pointer transition-colors ${selectedItemIndex === actualIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                          >
                            <TableCell>
                              <FormControl size="small" disabled={isSaving || isOverallCompleted || !item.evaluation?.trim()} fullWidth onClick={(e) => e.stopPropagation()}>
                                <Select value={item.status || 'OPEN'} onChange={(e) => handleItemStatusChange(actualIndex, e.target.value)} sx={{ minWidth: 120 }}>
                                  <MenuItem value="OPEN">OPEN</MenuItem>
                                  <MenuItem value="ONGOING">ONGOING</MenuItem>
                                  <MenuItem value="For Disposal">FOR DISPOSAL</MenuItem>
                                  <MenuItem value="DONE">DONE</MenuItem>
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell className="font-medium text-blue-600">{item.FAC_NO}</TableCell>
                            <TableCell>{item.FAC_name}</TableCell>
                            <TableCell>{item.qty}</TableCell>
                            <TableCell>{item.uom}</TableCell>
                            <TableCell>{item.detailsOfWork}</TableCell>
                            <TableCell>{item.evaluation}</TableCell>
                            <TableCell>{item.evalremarks}</TableCell>
                            <TableCell>
                              <AutoResizeTextField
                                value={item.woRemarks || ''}
                                onChange={(e) => {
                                  const updatedItems = workOrderData.items.map((itm, idx) => idx === actualIndex ? { ...itm, woRemarks: e.target.value } : itm);
                                  setWorkOrderData({ ...workOrderData, items: updatedItems });
                                }}
                                disabled={isSaving || isOverallCompleted || !item.evaluation?.trim()}
                                placeholder="Additional Expenses"
                                fullWidth
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <span className="text-sm font-medium text-blue-600">
                                ₱{item.expenses.reduce((total, expense) => total + safeParseNumber(expense.expenseAmount), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </TableCell>
                            <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                              <button
                                disabled={isSaving || isOverallCompleted || !item.evaluation?.trim()}
                                onClick={() => handleAddExpense(item, actualIndex)}
                                className={`flex items-center gap-2 p-2 border border-gray-300 text-sm font-medium rounded-lg transition-colors ${(isSaving || !isExpenseEnabled || isOverallCompleted) ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50'}`}
                              >
                                <AddIcon fontSize="small" />Expense
                              </button>
                            </TableCell>
                            <TableCell align="right">
                              {item.status === 'For Disposal' && <span className="text-sm text-red-600">{item.disposalReason || 'No reason provided'}</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  rowsPerPageOptions={[5, 10, 25]}
                  component="div"
                  count={workOrderData.items.length}
                  rowsPerPage={woItemsRowsPerPage}
                  page={woItemsPage}
                  onPageChange={handleWoItemsChangePage}
                  onRowsPerPageChange={handleWoItemsChangeRowsPerPage}
                />
              </TableContainer>

              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Work Details and Expenses - {workOrderData.items[selectedItemIndex]?.FAC_name}
                </h4>
                {workOrderData.items[selectedItemIndex] && (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Asset No:</span> {workOrderData.items[selectedItemIndex].FAC_NO}
                        <span className="ml-4">
                          <span className="font-medium">Status:</span>
                          <Chip label={workOrderData.items[selectedItemIndex].status || 'OPEN'} size="small" className={`ml-2 ${getStatusColor(workOrderData.items[selectedItemIndex].status || 'OPEN')}`} />
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
                                <IconButton size="small" onClick={() => handleEditExpense(workOrderData.items[selectedItemIndex], idx)} color="primary" disabled={isSaving || isOverallCompleted}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                                <IconButton size="small" onClick={() => handleDeleteExpense(selectedItemIndex, idx)} color="error" disabled={isSaving || isOverallCompleted}>
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
              onChange={(e) => {
                const rawValue = e.target.value.replace(/,/g, '');
                if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
                  setExpenseData({ ...expenseData, expenseAmount: rawValue });
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
            <TextField label="Qty" type="number" value={expenseData.qty} onChange={(e) => setExpenseData({ ...expenseData, qty: e.target.value })} fullWidth variant="outlined" disabled={isSaving} />
            <TextField label="O.R No." value={expenseData.orNumber} onChange={(e) => setExpenseData({ ...expenseData, orNumber: e.target.value })} fullWidth variant="outlined" disabled={isSaving} />
            <TextField
              label="Work Done/Remarks" value={expenseData.workDone} onChange={(e) => setExpenseData({ ...expenseData, workDone: e.target.value })}
              fullWidth variant="outlined" multiline rows={3} className="sm:col-span-2" disabled={isSaving}
            />
          </div>
          {saveError && <Alert severity="error" className="mt-3">{saveError}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpenExpenseDialog(false); setEditingExpenseIndex(null); setSelectedItemForExpense(null); setSaveError(null); }} color="secondary">Cancel</Button>
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