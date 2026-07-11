// EvalJO.jsx
import { useState, useEffect, useCallback } from 'react';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Checkbox, Snackbar, Alert } from '@mui/material';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';

import { evaluateJO } from '../../../hooks/useJO_eval';
//Custom Utils  
import DateDisplay from '../../../Utils/formatDateForInput';
import EvaluationModal from '../../../Utils/evaluationModal';
// import {ToastDesktop} from '../../../Utils/Toast'; // Remove this import

function EvalJO({
    header,
    joDetails,
    isClosingJO,
    onEvaluationComplete,
}){
    const [selectedItems, setSelectedItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // MUI Snackbar state - copied from SearchTransactions
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info'
    });

    // Filter joDetails by JO_No
    const getItemsByJONo = (JO_No) => {
        return joDetails?.filter(detail => detail.JO_No === JO_No) || [];
    };

    const items = getItemsByJONo(header.JO_No);
    
    // Helper: Check if item is evaluated
    const isItemEvaluated = (item) => {
        return item.eval_status !== null && 
               item.eval_status !== undefined && 
               item.eval_status !== '';
    };
    
    // Get unevaluated items (still available for evaluation)
    const unevaluatedItems = items.filter(item => !isItemEvaluated(item));
    const isAllSelected = unevaluatedItems.length > 0 && 
      selectedItems.length === unevaluatedItems.length;

    // Toast function - copied from SearchTransactions
    const showToast = useCallback((message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    }, []);

    // Handle snackbar close - copied from SearchTransactions
    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbar(prev => ({ ...prev, open: false }));
    };

    // Handle individual item selection - Only allow unevaluated items
    const handleItemSelect = (item, index) => {
        // Don't allow selection of already evaluated items
        if (isItemEvaluated(item)) return;
        
        setSelectedItems(prev => {
            const isSelected = prev.some(selected => selected.FAC_NO === item.FAC_NO);
            
            if (isSelected) {
                return prev.filter(selected => selected.FAC_NO !== item.FAC_NO);
            } else {
                return [...prev, {
                    JO_No: item.JO_No,
                    FAC_NO: item.FAC_NO,
                    FAC_name: item.FAC_name
                }];
            }
        });
    };

    // Handle select all - Only unevaluated items
    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedItems([]);
            showToast('Cleared all selections', 'warning');
        } else {
            const allUnevaluatedItems = unevaluatedItems.map(item => ({
                JO_No: item.JO_No,
                FAC_NO: item.FAC_NO,
                FAC_name: item.FAC_name
            }));
            setSelectedItems(allUnevaluatedItems);
            showToast(`Selected all ${allUnevaluatedItems.length} unevaluated items`, 'success');
        }
    };

    const isItemSelected = (item) => {
        return selectedItems.some(selected => selected.FAC_NO === item.FAC_NO);
    };

    const handleEvaluate = () => {
        if (selectedItems.length === 0) {
            showToast('Please select at least one item to evaluate', 'error');
            return;
        }
        setIsModalOpen(true);
    };

    // Handle evaluation confirmation - Keep the panel open for more evaluations
    const handleConfirmEvaluation = async (evalStatus, evalRemarks) => {
        setIsSubmitting(true);
        
        try {
            console.log('Selected items to evaluate:', selectedItems);
            
            const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');

            const result = await evaluateJO(
                header.JO_No,
                selectedItems,
                evalStatus,
                evalRemarks,
                userInfo
            );

            if (result.success) {
                showToast(result.message || 'Evaluation submitted successfully!', 'success');
                
                // ✅ Clear selected items
                setSelectedItems([]);
                setIsModalOpen(false);
                
                // ✅ Refresh data to show updated status
                if (onEvaluationComplete) {
                    setIsRefreshing(true);
                    await onEvaluationComplete();
                    setIsRefreshing(false);
                }
                
                // ✅ Show warnings if any
                if (result.warnings && result.warnings.length > 0) {
                    setTimeout(() => {
                        showToast(`${result.warnings.length} item(s) had warnings`, 'warning');
                    }, 500);
                }

                // ✅ Check if all items are now evaluated
                const updatedItems = joDetails?.filter(detail => detail.JO_No === header.JO_No) || [];
                const allEvaluated = updatedItems.every(item => isItemEvaluated(item));
                
                if (allEvaluated) {
                    showToast('🎉 All items in this JO have been evaluated!', 'success');
                } else {
                    const remaining = updatedItems.filter(item => !isItemEvaluated(item)).length;
                    showToast(`✅ ${selectedItems.length} item(s) evaluated. ${remaining} item(s) remaining.`, 'success');
                }

            } else {
                showToast(result.error || 'Failed to submit evaluation', 'error');
            }
        } catch (error) {
            console.error('Evaluation error:', error);
            showToast(error.message || 'Failed to submit evaluation. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Clear selections when component unmounts or JO changes
    useEffect(() => {
        setSelectedItems([]);
    }, [header.JO_No]);

    // Auto-refresh when items change
    useEffect(() => {
        // If all items are evaluated, we could auto-close or show a message
        const allEvaluated = items.length > 0 && items.every(item => isItemEvaluated(item));
        if (allEvaluated && items.length > 0) {
            // Optionally auto-close or just show a message
            console.log('All items evaluated for JO:', header.JO_No);
        }
    }, [items, header.JO_No]);

    return (
        <>
            {/* MUI Snackbar - Same as SearchTransactions */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            {isRefreshing ? (
                <div className="flex items-center justify-center w-full h-full p-8">
                    <div className="text-center">
                        <div className="w-8 h-8 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
                        <p className="mt-2 text-sm text-gray-500">Refreshing data...</p>
                    </div>
                </div>
            ) : (
                <div className={`items-start w-full text-sm mt-8 bg-white ${isClosingJO ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
                    <div className='flex justify-between px-5 py-2 font-sans tracking-wide'>
                        <span className='font-semibold'>{header.JO_No}</span>
                        <span><DateDisplay value={header.xDate} format="short" /></span>
                    </div>
                    
                    <div className='flex flex-col gap-3 p-5 text-sm border-b text-slate-500'>
                        <span>{header.Department_Code}</span>
                        <span className='text-base text-black'>Remarks: {header.Remarks}</span>
                        <div className='flex flex-col gap-1 mt-1'>
                            <span>For inspection by: {header.Sector_name}</span>
                            <span>Requestor: {header.requested_by}</span>
                        </div>
                    </div>
                 
                    <div className='px-3 py-1'>
                        <div className='flex items-center justify-between'>
                            {/* Show select all if there are unevaluated items */}
                            {unevaluatedItems.length > 0 && (
                                <>
                                    <div className='flex items-center gap-2'>
                                        <Checkbox
                                            checked={isAllSelected}
                                            onChange={handleSelectAll}
                                            size="small"
                                            color="primary"
                                            disabled={isSubmitting || isRefreshing}
                                        />
                                        <span className='text-sm text-slate-600'>
                                            Select All ({unevaluatedItems.length} unevaluated)
                                        </span>
                                    </div>  
                                    <div 
                                        className={`px-3 py-1 tracking-wide rounded-md shadow-md 
                                            ${selectedItems.length > 0 && !isSubmitting && !isRefreshing
                                                ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700' 
                                                : 'text-green-600 border border-green-600 cursor-not-allowed'
                                            }`}
                                    >
                                        <button 
                                            className='flex gap-1'
                                            onClick={handleEvaluate}
                                            disabled={selectedItems.length === 0 || isSubmitting || isRefreshing}
                                        >
                                            <DriveFileRenameOutlineIcon fontSize='small'/>
                                            Evaluate ({selectedItems.length})
                                        </button>
                                    </div>
                                </>              
                            )}
                            {/* Show message when all items are evaluated */}
                            {unevaluatedItems.length === 0 && items.length > 0 && (
                                <div className="w-full py-2 text-center text-green-600">
                                    ✓ All {items.length} items have been evaluated
                                </div>
                            )}
                        </div>
                        
                        {items.map((item, index) => {
                            const evaluated = isItemEvaluated(item);
                            return (
                                <div 
                                    key={`${item.JO_No}-${item.FAC_NO}-${item.workDet}`}
                                    className={`flex flex-col mb-2 rounded-lg transition-colors duration-200
                                        ${evaluated 
                                            ? 'bg-gray-50 border border-gray-200' 
                                            : isItemSelected(item) 
                                                ? 'bg-blue-50 border border-blue-200 cursor-pointer' 
                                                : 'hover:bg-gray-50 border border-transparent cursor-pointer'
                                        }`}
                                    onClick={() => !evaluated && !isRefreshing && handleItemSelect(item, index)}
                                >
                                    <div className='flex items-center gap-1 mt-1'>
                                        {/* Show checkbox only for unevaluated items */}
                                        {!evaluated && (
                                            <Checkbox
                                                checked={isItemSelected(item)}
                                                onChange={() => handleItemSelect(item, index)}
                                                onClick={(e) => e.stopPropagation()}
                                                size="small"
                                                color="primary"
                                                disabled={isSubmitting || isRefreshing}
                                            />
                                        )}
                                        {/* Show checkmark for evaluated items */}
                                        {evaluated && (
                                            <div className="flex items-center justify-center w-9 h-9">
                                                <span className="text-xl text-green-600">✓</span>
                                            </div>
                                        )}
                                        <div className='flex flex-col gap-1 pl-2'>
                                            <div>
                                                <span className={`font-semibold ${evaluated ? 'text-gray-600' : 'text-blue-800'}`}>
                                                    {item.FAC_name}
                                                </span>
                                                <span className='pl-2 text-slate-500'>({item.FAC_NO})</span>
                                                {/* {evaluated && (
                                                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                                        Evaluated
                                                    </span>
                                                )} */}
                                            </div>
                                            <span className={`italic ${evaluated ? 'text-gray-400' : 'text-slate-500'}`}>
                                                {item.workDet}
                                            </span>
                                        </div>
                                    </div>
                                    {/* ✅ Show evaluation details for evaluated items */}
                                    {evaluated && (
                                        <div className='flex flex-col px-3 py-1 text-black'>
                                            <span className='pl-2 mt-1 font-semibold text-blue-500'>
                                                Evaluation: {item.eval_status}
                                            </span>
                                            <span className='pl-2 text-gray-400'>Remarks: {item.eval_remarks || 'N/A'}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        
                        {selectedItems.length > 0 && !isRefreshing && (
                            <div className='px-5 py-3 mt-4 text-sm text-blue-600 rounded-lg bg-blue-50'>
                                {selectedItems.length} item(s) selected for evaluation
                            </div>
                        )}
                        
                        {isRefreshing && (
                            <div className='px-5 py-3 mt-4 text-sm text-blue-600 rounded-lg bg-blue-50'>
                                <span className="inline-block mr-2 animate-spin">⟳</span>
                                Refreshing data...
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <EvaluationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmEvaluation}
                selectedItems={selectedItems} 
                isSubmitting={isSubmitting}
                items={items}
            />
        </>
    );
}

export default EvalJO;