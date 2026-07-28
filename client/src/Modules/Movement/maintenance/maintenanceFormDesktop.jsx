import { useState, useMemo, useEffect, useCallback } from 'react';
// MUI
import { CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Select, 
  MenuItem, FormControl, InputLabel, Table, TableBody, TableCell, TableContainer, TableHead, 
  TableRow, Paper, IconButton, Chip, TablePagination, Alert, Snackbar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune';

// Custom Utils
import DateDisplay from '../../../Utils/formatDateForInput';
import HistoryDatePicker from '../../../Utils/datePicker';
import {AutoResizeTextField} from '../../../Utils/textAreaResizable';
import formatWithCommas from '../../../Utils/formatWithCommas';
// Hooks
import { useJO_woe } from '../../../hooks/useJO_woe';

// Get default last 30 days
const getDefaultLast30Days = () => {
    const today = new Date();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    return { startDate: start, endDate: end };
};

function MaintenanceFormDesktop({
    joHeaders,
    joDetails,
    joRefresh,
    joDetailsRefresh,
    updateJOHeader,
    updateJODetails,
    isLoading: externalLoading = false,
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(externalLoading);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [validationError, setValidationError] = useState(null);

    const {
      fetchWorkOrderWithExpenses,
      createWorkOrderExpense,
      updateWorkOrderExpense,
      deleteWorkOrderExpense,
      generateExpenseId
    } = useJO_woe();
    
    // Date range state with localStorage persistence
    const [dateRange, setDateRange] = useState(() => {
        const savedRange = localStorage.getItem('maintenanceDateRange');
        if (savedRange) {
            try {
                const parsed = JSON.parse(savedRange);
                if (parsed.startDate && parsed.endDate) {
                    return {
                        startDate: new Date(parsed.startDate),
                        endDate: new Date(parsed.endDate)
                    };
                }
            } catch (e) {
                console.warn('Failed to parse saved date range:', e);
            }
        }
        return getDefaultLast30Days();
    });

    // Save date range to localStorage whenever it changes
    useEffect(() => {
        if (dateRange?.startDate && dateRange?.endDate) {
            localStorage.setItem('maintenanceDateRange', JSON.stringify({
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString()
            }));
        }
    }, [dateRange]);

    // Pagination states for main table
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Pagination states for work order items table
    const [woItemsPage, setWoItemsPage] = useState(0);
    const [woItemsRowsPerPage, setWoItemsRowsPerPage] = useState(5);

    // Work Order Dialog states
    const [openWorkOrderDialog, setOpenWorkOrderDialog] = useState(false);
    const [selectedJO, setSelectedJO] = useState(null);
    const [selectedItemForExpense, setSelectedItemForExpense] = useState(null);
    const [selectedItemIndex, setSelectedItemIndex] = useState(0);
    const [workOrderData, setWorkOrderData] = useState({
        joNo: "",
        workNo: '',
        woDate: new Date().toISOString().split('T')[0],
        maintenanceStatus: '',
        items: []
    });
    
    // Expense Dialog states
    const [openExpenseDialog, setOpenExpenseDialog] = useState(false);
    const [expenseData, setExpenseData] = useState({
        date: new Date().toISOString().split('T')[0],
        expenseType: '',
        expenseAmount: '',
        qty: '',
        orNumber: '',
        workDone: '',
        disposalReason: '',
        // woRemarks: '',
    });
    const [editingExpenseIndex, setEditingExpenseIndex] = useState(null);
    
    // Disposal Dialog states
    const [openDisposalDialog, setOpenDisposalDialog] = useState(false);
    const [disposalReason, setDisposalReason] = useState('');

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [searchTerm, dateRange]);

    // Generate Work Order number
    const generateWorkOrderNumber = () => {
        const lastNumber = joHeaders.reduce((max, jo) => {
            if (!jo.workNo) return max;
            const number = Number(
                jo.workNo.replace("DB-WO-", "")
            );
            return Math.max(max, number);
        }, 0);
        return `DB-WO-${String(lastNumber + 1).padStart(7, "0")}`;
    };

    // Validation function
    const validateWorkOrder = () => {
        // Check if overall status is "Completed"
        if (workOrderData.maintenanceStatus === 'Completed') {
            // Check if all items are either "For Disposal" or "Done"
            const allItemsValid = workOrderData.items.every(item => 
                item.status === 'For Disposal' || item.status === 'DONE'
            );
            
            if (!allItemsValid) {
                setValidationError(
                    'To mark as Completed, all items must be either "For Disposal" or "Done". ' +
                    'Please update all item statuses first.'
                );
                return false;
            }
        }
        
        // Check if overall status is "Ongoing" - no validation needed
        setValidationError(null);
        return true;
    };

    // Handle Create Work Order
    const handleCreateWorkOrder = (jo) => {
        setSelectedJO(jo);
        const items = joDetails.filter(detail => detail.JO_No === jo.JO_No).map(detail => ({
            FAC_NO: detail.FAC_NO || 'DBIT1506514000950',
            FAC_name: detail.FAC_name || 'Analog HD Video Recorder',
            qty: detail.qty || 1,
            uom: detail.UOM || 'PIECE',
            detailsOfWork: detail.workDet,
            evaluation: detail.eval_status,
            evalremarks: detail.eval_remarks,
            reasonForDisposal: detail.disposal_reason || '',
            status: 'OPEN', // Default status
            woRemarks: detail.Main_Remarks|| "Additional Expenses",
            expenses: []
        }));
        setWorkOrderData({
            joNo: jo.JO_No,
            workNo: generateWorkOrderNumber(),
            woDate: new Date().toISOString().split("T")[0],
            maintenanceStatus: '', // Empty string for new work orders
            items
        });
        setSelectedItemIndex(0);
        setWoItemsPage(0);
        setValidationError(null);
        setOpenWorkOrderDialog(true);
        setSelectedJO(null);
    };

    const handleEditWorkOrder = async (jo) => {
        setSelectedJO(jo);

        try {
            let expenses = [];
            
            // Fetch the work order with its expenses
            if (jo.workNo) {
                try {
                    const workOrderData = await fetchWorkOrderWithExpenses(jo.workNo);
                    if (workOrderData && workOrderData.expenses) {
                        expenses = workOrderData.expenses;
                    }
                } catch (error) {
                    // If no expenses found, just continue with empty expenses
                    // Don't show error message - it's fine to have no expenses
                    console.log('No expenses found for work order:', jo.workNo);
                    // expenses remains []
                }
            }

            const items = joDetails
                .filter(detail => detail.JO_No === jo.JO_No)
                .map(detail => {
                // Find expenses for this FAC_NO
                const itemExpenses = expenses
                    .filter(exp => exp.FAC_NO === detail.FAC_NO)
                    .map(exp => ({
                        id: exp.ID,
                        date: exp.xDate,
                        expenseType: exp.Expense_Type,
                        expenseAmount: exp.expense_amount,
                        qty: exp.qty || '1',
                        orNumber: exp.OR_No,
                        workDone: exp.workDet
                    }));

                return {
                    FAC_NO: detail.FAC_NO,
                    FAC_name: detail.FAC_name,
                    qty: detail.qty,
                    uom: detail.UOM,
                    detailsOfWork: detail.workDet,
                    evaluation: detail.eval_status,
                    evalremarks: detail.eval_remarks,
                    reasonForDisposal: detail.disposal_reason || '',
                    status: detail.Main_Status || "OPEN",
                    woRemarks: detail.Main_Remarks || "",
                    expenses: itemExpenses
                };
                });

            let status = jo.main_stat || '';
            if (status === 'Done') {
                status = 'Completed';
            }

            setWorkOrderData({
                joNo: jo.JO_No,
                workNo: jo.workNo,
                woDate: jo.wo_date,
                maintenanceStatus: status,
                items: items
            });

            setValidationError(null);
            setOpenWorkOrderDialog(true);
            setSelectedJO(null);
        } catch (error) {
            console.error('Error loading work order:', error);
            // Only show error for actual errors (not for "no expenses found")
            if (!error.message?.includes('not found') && !error.message?.includes('no expenses')) {
                setSaveError('Failed to load work order: ' + error.message);
            }
            
            // Continue with opening the dialog without expenses
            const items = joDetails
                .filter(detail => detail.JO_No === jo.JO_No)
                .map(detail => ({
                FAC_NO: detail.FAC_NO,
                FAC_name: detail.FAC_name,
                qty: detail.qty,
                uom: detail.UOM,
                detailsOfWork: detail.workDet,
                evaluation: detail.eval_status,
                evalremarks: detail.eval_remarks,
                reasonForDisposal: detail.disposal_reason || '',
                status: detail.Main_Status || "OPEN",
                woRemarks: detail.Main_Remarks || "",
                expenses: []
                }));

            let status = jo.main_stat || '';
            if (status === 'Done') {
                status = 'Completed';
            }

            setWorkOrderData({
                joNo: jo.JO_No,
                workNo: jo.workNo,
                woDate: jo.wo_date,
                maintenanceStatus: status,
                items: items
            });
            setOpenWorkOrderDialog(true);
        }
        };

    // Handle Item Status Change with validation and auto-update of Overall Status
    const handleItemStatusChange = (itemIndex, newStatus) => {
        const updatedItems = workOrderData.items.map((item, index) => {
            if (index === itemIndex) {
                return {
                    ...item,
                    status: newStatus,
                    disposalReason: newStatus === 'For Disposal' ? item.disposalReason || '' : item.disposalReason
                };
            }
            return item;
        });
        
        setWorkOrderData({
            ...workOrderData,
            items: updatedItems
        });

        // Check if any item is ONGOING and update Overall Status accordingly
        const hasOngoingItem = updatedItems.some(item => item.status === 'ONGOING');
        const allItemsCompleted = updatedItems.every(item => 
            item.status === 'DONE' || item.status === 'For Disposal'
        );

        // Auto-update Overall JO Status based on item statuses
        let newOverallStatus = workOrderData.maintenanceStatus;
        
        if (hasOngoingItem) {
            // If any item is ONGOING, set overall to ONGOING
            newOverallStatus = 'Ongoing';
        } else if (allItemsCompleted && updatedItems.length > 0) {
            // If all items are DONE or For Disposal, set overall to Completed
            newOverallStatus = 'Completed';
        } else {
            // If no items are ONGOING but not all are completed, keep current or set to empty
            if (workOrderData.maintenanceStatus === 'Ongoing' && !hasOngoingItem) {
                // If overall was Ongoing but no items are Ongoing anymore, check if all are done
                if (allItemsCompleted) {
                    newOverallStatus = 'Completed';
                } else {
                    newOverallStatus = '';
                }
            }
        }

        setWorkOrderData(prev => ({
            ...prev,
            maintenanceStatus: newOverallStatus
        }));

        // Clear any validation errors when status changes
        setValidationError(null);

        if (newStatus === 'For Disposal') {
            setSelectedItemIndex(itemIndex);
            setOpenDisposalDialog(true);
        }
    };

    // Handle Overall JO Status Change with validation
    const handleOverallStatusChange = (event) => {
        const newStatus = event.target.value;
        
        // If trying to set to Completed, validate item statuses
        if (newStatus === 'Completed') {
            const allItemsValid = workOrderData.items.every(item => 
                item.status === 'For Disposal' || item.status === 'DONE'
            );
            
            if (!allItemsValid) {
                setValidationError(
                    'Cannot mark as Completed. All items must be either "For Disposal" or "Done".'
                );
                return; // Don't update the status
            }
        }
        
        // If setting to Ongoing or empty, clear validation error
        setValidationError(null);
        
        setWorkOrderData({
            ...workOrderData,
            maintenanceStatus: newStatus
        });
    };

    // Handle Disposal Reason Submit for specific item
    const handleDisposalSubmit = () => {
        const updatedItems = workOrderData.items.map((item, index) => {
            if (index === selectedItemIndex) {
                return {
                    ...item,
                    disposalReason: disposalReason,
                    status: 'For Disposal'
                };
            }
            return item;
        });
        
        setWorkOrderData({
            ...workOrderData,
            items: updatedItems
        });
        setOpenDisposalDialog(false);
        setDisposalReason('');
        
        // Check if all items are now For Disposal or Done
        const allItemsCompleted = updatedItems.every(item => 
            item.status === 'For Disposal' || item.status === 'DONE'
        );
        
        // If all items are completed, auto-update overall status to Completed
        if (allItemsCompleted) {
            setWorkOrderData(prev => ({
                ...prev,
                maintenanceStatus: 'Completed'
            }));
        }
    };

    // Handle Update Work Order with validation
    const handleUpdateWorkOrder = async () => {
    // Validate before saving
    if (!validateWorkOrder()) {
        return;
    }

    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    try {
        // Map "Completed" to "Done" for database compatibility
        const dbStatus = workOrderData.maintenanceStatus === 'Completed' ? 'Done' : workOrderData.maintenanceStatus;

        // Prepare the data for JO header update
        const headerUpdateData = {
            workNo: workOrderData.workNo,
            wo_date: workOrderData.woDate,
            main_stat: dbStatus,

        };

        console.log('Updating JO header with:', headerUpdateData);

        // Update JO header
        await updateJOHeader(workOrderData.joNo, headerUpdateData);

        // Prepare the data for JO details update - SEND ALL FIELDS
        const detailsUpdateData = workOrderData.items.map(item => ({
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
            eval_status: item.evaluation || '',        // Send eval_status
            eval_remarks: item.evalremarks || '',      // Send eval_remarks
            disposal_reason: item.disposalReason || '',
            Main_Status: item.status || 'OPEN',
            Main_Remarks: item.woRemarks
        }));

        console.log('Updating JO details with:', detailsUpdateData);

        // Update JO details
        await updateJODetails(workOrderData.joNo, detailsUpdateData);

        setSaveSuccess(true);
        
        // Refresh the data
        await joRefresh();
        await joDetailsRefresh();
        
        setTimeout(() => {
            setOpenWorkOrderDialog(false);
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

    // Add this after your state declarations (around line 40-50)
    const isOverallCompleted = workOrderData.maintenanceStatus === 'Completed';
    // Handle Finish JO - sets all items to DONE and status to Completed
    const handleFinishJO = async () => {
        // Update all items that are not For Disposal to DONE
        const updatedItems = workOrderData.items.map(item => ({
            ...item,
            status: item.status === 'For Disposal' ? 'For Disposal' : 'DONE'
        }));
        
        // Check if all items are now either For Disposal or Done
        const allItemsCompleted = updatedItems.every(item => 
            item.status === 'For Disposal' || item.status === 'DONE'
        );
        
        if (!allItemsCompleted) {
            setValidationError('Unable to finish JO. Some items are not in a valid state.');
            return;
        }
        
        setWorkOrderData({
            ...workOrderData,
            items: updatedItems,
            maintenanceStatus: 'Completed'
        });

        setSaveError(null);
        setSaveSuccess(false);
        setIsSaving(true);

        try {
            // Prepare data for API update
            const headerUpdateData = {
                workNo: workOrderData.workNo,
                wo_date: workOrderData.woDate,
                main_stat: 'Done',
            };

            // Update JO header
            await updateJOHeader(workOrderData.joNo, headerUpdateData);

            // Prepare details for update - SEND ALL FIELDS
            const detailsUpdateData = updatedItems.map(item => ({
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
                eval_status: item.evaluation || '',        // Send eval_status
                eval_remarks: item.evalremarks || '',      // Send eval_remarks
                disposal_reason: item.disposalReason || '',
                Main_Status: item.status || 'OPEN',
                Main_Remarks: item.woRemarks
            }));

            // Update JO details
            await updateJODetails(workOrderData.joNo, detailsUpdateData);

            setSaveSuccess(true);
            
            // Refresh the data
            await joRefresh();
            await joDetailsRefresh();
            
            setTimeout(() => {
                setOpenWorkOrderDialog(false);
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

    // Handle Add Expense
    const handleAddExpense = (item, index) => {
        setSelectedItemForExpense(item);
        setSelectedItemIndex(index);
        setEditingExpenseIndex(null);
        setExpenseData({
            date: new Date().toISOString().split('T')[0],
            expenseType: 'LABOR EXPENSE',
            expenseAmount: '',
            qty: '',
            orNumber: '',
            workDone: ''
        });
        setOpenExpenseDialog(true);
    };

    // Handle Edit Expense
    const handleEditExpense = (item, expenseIndex) => {
        setSelectedItemForExpense(item);
        setExpenseData({
            date: item.expenses[expenseIndex].date,
            expenseType: item.expenses[expenseIndex].expenseType,
            expenseAmount: item.expenses[expenseIndex].expenseAmount,
            qty: item.expenses[expenseIndex].qty || '',
            orNumber: item.expenses[expenseIndex].orNumber,
            workDone: item.expenses[expenseIndex].workDone
        });
        setEditingExpenseIndex(expenseIndex);
        setOpenExpenseDialog(true);
    };

    // Handle Save Expense
    const handleSaveExpense = async () => {
      try {
            setIsSaving(true);
            setSaveError(null);

            const selectedItem = workOrderData.items[selectedItemIndex];
            
            // Parse the amount safely
            const cleanAmount = String(expenseData.expenseAmount || '0').replace(/,/g, '');
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
                jo_no: workOrderData.joNo
            };

            let result;
            
            if (editingExpenseIndex !== null) {
                // Update existing expense
                const existingExpense = selectedItem.expenses[editingExpenseIndex];
                result = await updateWorkOrderExpense(existingExpense.id, expensePayload);
            } else {
                // Create new expense
                result = await createWorkOrderExpense(expensePayload);
            }

            if (result.success) {
                // Update local state with the new/updated expense
                const updatedItems = workOrderData.items.map((item, index) => {
                    if (index === selectedItemIndex) {
                        const expenses = [...item.expenses];
                        if (editingExpenseIndex !== null) {
                            // Update existing expense
                            expenses[editingExpenseIndex] = { 
                                ...expenseData, 
                                id: result.data.id || generateExpenseId()
                            };
                        } else {
                            // Add new expense
                            expenses.push({ 
                                ...expenseData, 
                                id: result.data.id || generateExpenseId()
                            });
                        }
                        return {
                            ...item,
                            expenses: expenses
                        };
                    }
                    return item;
                });
                
                setWorkOrderData({
                    ...workOrderData,
                    items: updatedItems
                });
                
                setOpenExpenseDialog(false);
                setExpenseData({
                    date: new Date().toISOString().split('T')[0],
                    expenseType: '',
                    expenseAmount: '',
                    qty: '',
                    orNumber: '',
                    workDone: ''
                });
                setEditingExpenseIndex(null);
                setSelectedItemForExpense(null);
                
                // Show success message
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

    // Add this helper function inside your component or in a utility file
    const safeParseNumber = (value) => {
        if (value === null || value === undefined || value === '') return 0;
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const cleanValue = value.replace(/,/g, '').trim();
            const parsed = parseFloat(cleanValue);
            return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
    };

    // Handle Delete Expense
    const handleDeleteExpense = async (itemIndex, expenseIndex) => {
      try {
        setIsSaving(true);
        setSaveError(null);

        const selectedItem = workOrderData.items[itemIndex];
        const expenseToDelete = selectedItem.expenses[expenseIndex];
          
        if (!expenseToDelete || !expenseToDelete.id) {
            // If expense doesn't have an ID (local only), just remove from local state
            const updatedItems = workOrderData.items.map((item, idx) => {
                if (idx === itemIndex) {
                    const expenses = item.expenses.filter((_, expIdx) => expIdx !== expenseIndex);
                    return {
                        ...item,
                        expenses: expenses
                    };
                }
                return item;
            });
            setWorkOrderData({
                ...workOrderData,
                items: updatedItems
            });
            return;
        }

        // Delete from database
        const result = await deleteWorkOrderExpense(expenseToDelete.id);
        
        if (result.success) {
            // Update local state
            const updatedItems = workOrderData.items.map((item, idx) => {
                if (idx === itemIndex) {
                    const expenses = item.expenses.filter((_, expIdx) => expIdx !== expenseIndex);
                    return {
                        ...item,
                        expenses: expenses
                    };
                }
                return item;
            });
            setWorkOrderData({
                ...workOrderData,
                items: updatedItems
            });
            
            // Show success message
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


    const handleSelectItem = (jo) => {
        const transNo = jo.JO_No;
        return window.open(`/assetMovement/pages/JOFormPage?docId=${transNo}`, '_blank');
    };

    // Handle Print
    const handlePrint = () => {
        window.print();
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            await joRefresh();
            await joDetailsRefresh();
        } finally {
            setIsLoading(false);
        }
    };

    // Handle date range change from HistoryDatePicker
    const handleDateRangeChange = useCallback((range) => {
        if (range && range.startDate && range.endDate) {
            const start = range.startDate instanceof Date ? range.startDate : new Date(range.startDate);
            const end = range.endDate instanceof Date ? range.endDate : new Date(range.endDate);
            
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            setDateRange({ startDate: start, endDate: end });
        } else {
            const defaultRange = getDefaultLast30Days();
            setDateRange(defaultRange);
        }
        setPage(0);
    }, []);

    const handleOptionsOpen = () => {
        setIsOptionsOpen((prev) => !prev);
    };

    // Get status color
    const getStatusColor = (status) => {
        switch(status) {
            case 'Completed':
                return 'bg-green-100 text-green-700';
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

    // Get status display label
    const getStatusLabel = (status) => {
        if (!status) return 'Not Started';
        if (status === 'Done') return 'Completed'; // Map Done to Completed for display
        return status;
    };

    // Filter JO based on search, date range
    const filteredJO = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        let filtered = joHeaders
            .filter(jo =>
                jo.eval_status &&
                jo.eval_status.trim() !== ""
            )
            .sort((a, b) =>
                b.JO_No.localeCompare(a.JO_No)
            );

        if (keyword) {
            filtered = filtered.filter(jo => {
                const status = jo.main_stat || "Not Started";
                const displayStatus = status === 'Done' ? 'Completed' : status;
                return (
                    jo.JO_No?.toLowerCase().includes(keyword) ||
                    jo.Department_Code?.toLowerCase().includes(keyword) ||
                    displayStatus.toLowerCase().includes(keyword) ||
                    status.toLowerCase().includes(keyword) ||
                    jo.workNo?.toLowerCase().includes(keyword) ||
                    jo.Remarks?.toLowerCase().includes(keyword)
                );
            });
            return filtered;
        }

        if (dateRange?.startDate && dateRange?.endDate) {
            const start = new Date(dateRange.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateRange.endDate);
            end.setHours(23, 59, 59, 999);

            filtered = filtered.filter(jo => {
                if (!jo.xDate) return false;
                const joDate = new Date(jo.xDate);
                return joDate >= start && joDate <= end;
            });
        }

        return filtered;
    }, [joHeaders, searchTerm, dateRange]);

    // Get total items count
    const totalItems = filteredJO.length;

    // Handle page change for main table
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    // Handle rows per page change for main table
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Handle page change for work order items table
    const handleWoItemsChangePage = (event, newPage) => {
        setWoItemsPage(newPage);
    };

    // Handle rows per page change for work order items table
    const handleWoItemsChangeRowsPerPage = (event) => {
        setWoItemsRowsPerPage(parseInt(event.target.value, 10));
        setWoItemsPage(0);
    };

    // Get current page data for main table
    const paginatedJO = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredJO.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredJO, page, rowsPerPage]);

    // Get current page data for work order items
    const paginatedWOItems = useMemo(() => {
        const startIndex = woItemsPage * woItemsRowsPerPage;
        return workOrderData.items.slice(startIndex, startIndex + woItemsRowsPerPage);
    }, [workOrderData.items, woItemsPage, woItemsRowsPerPage]);

    // Highlight matching text
    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() ? 
                <span key={index} className="font-medium bg-yellow-200">{part}</span> : 
                part
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with Search and Filters */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Maintenance</h3>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <SearchIcon className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" fontSize="small" />
                        <input
                            type="text"
                            placeholder="Search here"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                        />
                    </div>
                    <button
                        onClick={handleOptionsOpen}
                        className={`
                            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
                            ${
                                isOptionsOpen
                                    ? 'bg-blue-100 text-blue-600'
                                    : 'hover:bg-gray-100 text-gray-600'
                            }
                        `}
                    >
                        <TuneIcon fontSize="small" />
                        <span>Filter</span>
                    </button>
                    <button
                        onClick={() => handleCreateWorkOrder(selectedJO)}
                        disabled={
                            !selectedJO ||
                            Boolean(selectedJO.workNo)
                        }
                        className={`
                            flex items-center gap-2 px-4 py-2
                            text-sm font-medium rounded-lg transition-colors
                            ${
                                !selectedJO || selectedJO.workNo
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            }
                        `}
                    >
                        <AddIcon fontSize="small" />
                        Create Work Order
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                    >
                        <RefreshIcon fontSize="small" />
                    </button>
                </div>
            </div>

            {/* Filter Panel */}
            {isOptionsOpen && (
                <div className="py-3 mt-2 border-b border-gray-200 rounded-lg bg-gray-50/80">
                    <HistoryDatePicker 
                        onDateRangeChange={handleDateRangeChange}
                        initialPreset="last-30"
                    />
                </div>
            )}

            {/* Filter Summary */}
            {(dateRange?.startDate || searchTerm) && (
                <div className="px-4 py-2 mt-3 text-xs text-gray-600 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex flex-wrap items-center gap-3">
                        {dateRange?.startDate && dateRange?.endDate && (
                            <span>
                                Date: <strong>
                                    {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                                </strong>
                            </span>
                        )}
                        {searchTerm && (
                            <>
                                <span>|</span>
                                <span>
                                    Search: <strong>"{searchTerm}"</strong>
                                </span>
                            </>
                        )}
                        <span>|</span>
                        <span>
                            Results: <strong>{totalItems}</strong>
                        </span>
                        <span>|</span>
                        <span>
                            Showing: <strong>{paginatedJO.length}</strong> of <strong>{totalItems}</strong>
                        </span>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="flex-1 mt-4 overflow-auto">
              <TableContainer component={Paper}>
                  <Table>
                      <TableHead className="sticky top-0 bg-gray-50">
                          <TableRow className="text-xs font-medium tracking-wider text-gray-500 uppercase border-b border-gray-200">
                              <TableCell className="px-4 py-3">JO Number</TableCell>
                              <TableCell className="px-4 py-3">Date</TableCell>
                              <TableCell className="px-4 py-3">Department</TableCell>
                              <TableCell className="px-4 py-3">Remarks</TableCell>
                              <TableCell className="px-4 py-3">Status</TableCell>
                              <TableCell className="px-4 py-3">Work Order</TableCell>
                              <TableCell className="px-4 py-3">WO Date</TableCell>
                              <TableCell className="px-4 py-3">Action</TableCell>
                          </TableRow>
                      </TableHead>
                      <TableBody>
                          {paginatedJO.length === 0 ? (
                              <TableRow>
                                  <TableCell colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                      No maintenance records found
                                  </TableCell>
                              </TableRow>
                          ) : (
                              paginatedJO.map((jo) => (
                                  <TableRow
                                      key={jo.ID}
                                      onClick={() => setSelectedJO(jo)}
                                      className={`
                                          text-sm
                                          cursor-pointer
                                          transition-colors
                                          hover:bg-blue-50
                                          ${
                                              selectedJO?.JO_No === jo.JO_No
                                                  ? "bg-blue-100 border-l-4 border-blue-600"
                                                  : ""
                                          }
                                      `}
                                  >
                                      <TableCell 
                                          className="px-4 py-3 font-medium text-blue-600"
                                          sx={{ 
                                              fontWeight: 'bold', 
                                              color: 'primary.main', 
                                              textDecoration: 'underline',                      
                                              '&:hover': { fontSize: '.9rem', color: '#43a047' }
                                          }}
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectItem(jo);
                                          }}
                                      >
                                          {searchTerm ? highlightText(jo.JO_No, searchTerm) : jo.JO_No}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-gray-600">
                                          <DateDisplay value={jo.xDate} format="short" />
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-gray-600">{jo.Department_Code}</TableCell>
                                      <TableCell className="max-w-xs px-4 py-3 text-gray-600 truncate">
                                          {jo.Remarks || '-'}
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                          <span className={`
                                              px-2 py-1 text-xs font-medium rounded-full
                                              ${jo.main_stat === 'Done' 
                                                  ? 'bg-green-100 text-green-700'
                                                  : jo.main_stat === 'Ongoing'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-gray-100 text-gray-700'
                                              }
                                          `}>
                                              {getStatusLabel(jo.main_stat)}
                                          </span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium rounded-full">{jo.workNo}</span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium rounded-full">{jo.wo_date}</span>
                                      </TableCell>
                                      <TableCell className="">
                                          <Button
                                              size="small"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditWorkOrder(jo);
                                              }}
                                              disabled={!jo.workNo}
                                          >
                                              <EditIcon fontSize="small" />
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
                  <TablePagination
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      component="div"
                      count={filteredJO.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                  />
              </TableContainer>
            </div>

            {/* Work Order Dialog */}
            <Dialog open={openWorkOrderDialog} onClose={() => setOpenWorkOrderDialog(false)} maxWidth="xl" fullWidth>
                <DialogTitle>
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-semibold">
                                Work Order
                            </h2>
                            <div className="mt-1 text-sm text-gray-500">
                                <div>
                                    <strong>Job Order :</strong> {workOrderData.joNo}
                                </div>
                                <div>
                                    <strong>Work Order :</strong> {workOrderData.workNo}
                                </div>
                            </div>
                        </div>
                        <Chip
                            label={getStatusLabel(workOrderData.maintenanceStatus)}
                            className={getStatusColor(workOrderData.maintenanceStatus)}
                        />
                    </div>
                </DialogTitle>
                <DialogContent>
                    {/* Success/Error Messages */}
                    {saveSuccess && (
                        <Alert severity="success" className="mb-4">
                            Work order updated successfully!
                        </Alert>
                    )}
                    {saveError && (
                        <Alert severity="error" className="mb-4">
                            Error: {saveError}
                        </Alert>
                    )}
                    {validationError && (
                        <Alert severity="warning" className="mb-4" onClose={() => setValidationError(null)}>
                            {validationError}
                        </Alert>
                    )}

                    {/* Overall Status and Remarks */}
                    <div className="grid grid-cols-[1fr_2fr] gap-4 mt-2 mb-4">
                        <FormControl fullWidth>
                            <InputLabel>Overall JO Status</InputLabel>
                            <Select
                                value={workOrderData.maintenanceStatus}
                                onChange={handleOverallStatusChange}
                                label="Overall JO Status"
                                disabled={isSaving}
                            >
                                <MenuItem value="">Not Started</MenuItem>
                                <MenuItem value="Ongoing">Ongoing</MenuItem>
                                <MenuItem value="Completed">Completed</MenuItem>
                            </Select>
                        </FormControl>
                    </div>

                    {/* Status Info - Shows validation hints */}
                    {workOrderData.maintenanceStatus === 'Completed' && (
                        <Alert severity="info" className="mb-4">
                            All items must be either "For Disposal" or "Done" to keep this status.
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 mb-4">
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleUpdateWorkOrder}
                            disabled={isSaving}
                        >
                            {isSaving ? <CircularProgress size={24} /> : 'Update'}
                        </Button>
                    </div>

                    {/* Items Table */}
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
                                        <TableCell colSpan="11" className="px-4 py-8 text-center text-gray-500">
                                            No items found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedWOItems.map((item, index) => {
                                        const actualIndex = woItemsPage * woItemsRowsPerPage + index;
                                        
                                        // Determine if expense button should be enabled
                                        const isExpenseEnabled = 
                                            item.status === 'OPEN' ||
                                            item.status === 'ONGOING' || 
                                            item.status === 'DONE' || 
                                            (item.evaluation && item.evaluation.trim() !== '');
                                        
                                        return (
                                            <TableRow 
                                                key={item.FAC_NO || actualIndex}
                                                onClick={() => setSelectedItemIndex(actualIndex)}
                                                className={`cursor-pointer transition-colors ${
                                                    selectedItemIndex === actualIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                                                }`}
                                            >
                                                <TableCell>
                                                    <FormControl 
                                                        size="small" 
                                                        disabled={isSaving || isOverallCompleted || !item.evaluation?.trim()} 
                                                        fullWidth 
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <Select
                                                            value={item.status || 'OPEN'}
                                                            onChange={(e) => handleItemStatusChange(actualIndex, e.target.value)}
                                                            sx={{ minWidth: 120 }}
                                                        >
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
                                                            const updatedItems = workOrderData.items.map((itm, idx) => {
                                                                if (idx === actualIndex) {
                                                                    return { ...itm, woRemarks: e.target.value };
                                                                }
                                                                return itm;
                                                            });
                                                            setWorkOrderData({
                                                                ...workOrderData,
                                                                items: updatedItems
                                                            });
                                                        }}
                                                        disabled={isSaving || isOverallCompleted || !item.evaluation?.trim()}
                                                        placeholder="Additional Expenses"
                                                        fullWidth
                                                        variant="outlined"
                                                    />
                                                </TableCell>    
                                                <TableCell align="center">
                                                    <span className="text-sm font-medium text-blue-600">
                                                        ₱
                                                        {item.expenses
                                                            .reduce((total, expense) => total + safeParseNumber(expense.expenseAmount), 0)  
                                                            .toLocaleString(undefined, {
                                                                minimumFractionDigits: 2,
                                                                maximumFractionDigits: 2,
                                                            })}
                                                    </span>
                                                </TableCell>
                                                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                    <button
                                                        size="small"
                                                        disabled={isSaving || isOverallCompleted || !item.evaluation?.trim()} 
                                                        onClick={() => handleAddExpense(item, actualIndex)}
                                                        className={`
                                                            flex items-center gap-2 p-2 border border-gray-300
                                                            text-sm font-medium rounded-lg transition-colors
                                                            ${(isSaving || !isExpenseEnabled || isOverallCompleted) 
                                                                ? 'opacity-50 cursor-not-allowed bg-gray-100' 
                                                                : 'hover:bg-gray-50'
                                                            }
                                                        `}
                                                    >
                                                        <AddIcon fontSize="small" />Expense
                                                    </button>
                                                </TableCell>
                                                <TableCell align="right">
                                                    {item.status === 'For Disposal' && (
                                                        <span className="text-sm text-red-600">
                                                            {item.disposalReason || 'No reason provided'}
                                                        </span>
                                                    )}
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

                    {/* Work Details and Expenses for Selected Item */}
                    <div className="mt-4">
                        <h4 className="mb-2 text-sm font-semibold text-gray-700">
                            Work Details and Expenses - {workOrderData.items[selectedItemIndex]?.FAC_name}
                        </h4>
                        {workOrderData.items[selectedItemIndex] && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-sm text-gray-600">
                                        <span className="font-medium">Asset No:</span> {workOrderData.items[selectedItemIndex].FAC_NO}
                                        <span className="ml-4">
                                            <span className="font-medium">Status:</span> 
                                            <Chip 
                                                label={workOrderData.items[selectedItemIndex].status || 'OPEN'}
                                                size="small"
                                                className={`ml-2 ${getStatusColor(workOrderData.items[selectedItemIndex].status || 'OPEN')}`}
                                            />
                                        </span>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">
                                        Total Expenses: ₱{formatWithCommas(
                                            workOrderData.items[selectedItemIndex]?.expenses.reduce((sum, exp) => sum + safeParseNumber(exp.expenseAmount), 0)
                                        )}
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
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleEditExpense(
                                                                workOrderData.items[selectedItemIndex], 
                                                                idx
                                                            )}
                                                            color="primary"
                                                            disabled={isSaving || isOverallCompleted}
                                                        >
                                                            <EditIcon fontSize="small" />
                                                        </IconButton>
                                                        <IconButton 
                                                            size="small" 
                                                            onClick={() => handleDeleteExpense(selectedItemIndex, idx)}
                                                            color="error"
                                                            disabled={isSaving || isOverallCompleted}
                                                        >
                                                            <span className="text-sm">×</span>
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {workOrderData.items[selectedItemIndex].expenses.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan="6" align="center" className="py-4 text-sm text-gray-400">
                                                        No expenses recorded for this item
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </div>
                        )}
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handlePrint} startIcon={<PrintIcon />} color="primary">
                        Print
                    </Button>
                    <Button onClick={() => setOpenWorkOrderDialog(false)} color="secondary">
                        Cancel
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Expense Dialog */}
           <Dialog open={openExpenseDialog} onClose={() => {
              setOpenExpenseDialog(false);
              setEditingExpenseIndex(null);
              setSelectedItemForExpense(null);
            }} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingExpenseIndex !== null ? 'Modify Expense' : 'Add Expense'} - {selectedItemForExpense?.FAC_name}
                    {editingExpenseIndex !== null && (
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            (Editing existing expense)
                        </span>
                    )}
                </DialogTitle>
                <DialogContent>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <TextField
                          label="Date"
                          type="date"
                          value={expenseData.date}
                          onChange={(e) => setExpenseData({...expenseData, date: e.target.value})}
                          fullWidth
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          disabled={isSaving || isOverallCompleted}
                        />
                        <FormControl fullWidth>
                          <InputLabel>Expense Type</InputLabel>
                          <Select
                            value={expenseData.expenseType}
                            onChange={(e) => setExpenseData({...expenseData, expenseType: e.target.value})}
                            label="Expense Type"
                            disabled={isSaving}
                          >
                            <MenuItem value="LABOR EXPENSE">LABOR EXPENSE</MenuItem>
                            <MenuItem value="PARTS">PARTS</MenuItem>
                          </Select>
                        </FormControl>
                        <TextField
    label="Expense Amount"
    type="text"
    value={expenseData.expenseAmount || ''}
    onChange={(e) => {
        // Allow only numbers and decimal point while typing
        const rawValue = e.target.value.replace(/,/g, '');
        if (rawValue === '' || /^\d*\.?\d*$/.test(rawValue)) {
            setExpenseData({
                ...expenseData,
                expenseAmount: rawValue, // Store as raw number string
            });
        }
    }}
    onBlur={() => {
        // Format for display only, but store as formatted string
        const value = expenseData.expenseAmount;
        if (value && value !== '' && !isNaN(parseFloat(value))) {
            const num = parseFloat(value);
            if (!isNaN(num) && num > 0) {
                // Store as formatted string for display
                setExpenseData({
                    ...expenseData,
                    expenseAmount: num.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }),
                });
            } else if (num === 0) {
                setExpenseData({
                    ...expenseData,
                    expenseAmount: '0.00',
                });
            }
        }
    }}
    onFocus={() => {
        // Remove formatting for editing
        if (expenseData.expenseAmount) {
            // Use safeParseNumber to get the raw number
            const rawValue = String(safeParseNumber(expenseData.expenseAmount));
            setExpenseData({
                ...expenseData,
                expenseAmount: rawValue,
            });
        }
    }}
    fullWidth
    variant="outlined"
    disabled={isSaving}
    InputProps={{
        startAdornment: <span style={{ marginRight: '8px', color: '#666' }}>₱</span>,
    }}
/>
                        <TextField
                          label="Qty"
                          type="number"
                          value={expenseData.qty}
                          onChange={(e) => setExpenseData({...expenseData, qty: e.target.value})}
                          fullWidth
                          variant="outlined"
                          disabled={isSaving}
                        />
                        <TextField
                          label="O.R No."
                          value={expenseData.orNumber}
                          onChange={(e) => setExpenseData({...expenseData, orNumber: e.target.value})}
                          fullWidth
                          variant="outlined"
                          disabled={isSaving}
                        />
                        <TextField
                          label="Work Done/Remarks"
                          value={expenseData.workDone}
                          onChange={(e) => setExpenseData({...expenseData, workDone: e.target.value})}
                          fullWidth
                          variant="outlined"
                          multiline
                          rows={3}
                          className="col-span-2"
                          disabled={isSaving}
                        />
                    </div>
                    {saveError && (
                        <Alert severity="error" className="mt-3">
                            {saveError}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                      onClick={() => {
                        setOpenExpenseDialog(false);
                        setEditingExpenseIndex(null);
                        setSelectedItemForExpense(null);
                        setSaveError(null);
                      }} 
                      color="secondary"
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleSaveExpense} 
                        variant="contained" 
                        color="primary"
                        disabled={isSaving}
                    >
                        {isSaving ? <CircularProgress size={24} /> : (editingExpenseIndex !== null ? 'Update' : 'Add')}
                    </Button>
                </DialogActions>
          </Dialog>

            {/* Disposal Dialog */}
            <Dialog open={openDisposalDialog} onClose={() => setOpenDisposalDialog(false)}>
                <DialogTitle>Reason for Disposal - Item #{workOrderData.items[selectedItemIndex]?.FAC_NO}</DialogTitle>
                <DialogContent>
                    <TextField
                      autoFocus
                      margin="dense"
                      label="Disposal Reason"
                      type="text"
                      fullWidth
                      value={disposalReason}
                      onChange={(e) => setDisposalReason(e.target.value)}
                      multiline
                      rows={4}
                      variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDisposalDialog(false)} color="secondary">
                        Cancel
                    </Button>
                    <Button onClick={handleDisposalSubmit} variant="contained" color="primary">
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default MaintenanceFormDesktop;