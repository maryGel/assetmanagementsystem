// MvEvalJO.jsx - With Existing Toast Component
import { useState } from 'react'
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Checkbox } from '@mui/material';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import DateDisplay from '../../Utils/formatDateForInput';
import EvaluationModal from '../../Utils/evaluationModal';
import { evaluateJO } from '../../hooks/useJO_eval';
import Toast from '../../Utils/toast'; // Import your Toast component

function MvEvalJO({
    onClose,
    onAnimationEnd,
    header,
    joDetails,
    isClosingJO,
    onEvaluationComplete
}){
    const [selectedItems, setSelectedItems] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Toast state
    const [toast, setToast] = useState({
        show: false,
        message: '',
        type: 'success'
    });

    // Filter joDetails by JO_No
    const getItemsByJONo = (JO_No) => {
        return joDetails?.filter(detail => detail.JO_No === JO_No) || [];
    };

    const items = getItemsByJONo(header.JO_No);
    const isAllSelected = items.length > 0 && selectedItems.length === items.length;

    // Show toast helper function
    const showToast = (message, type = 'success') => {
        setToast({
            show: true,
            message: message,
            type: type
        });
    };

    // Handle individual item selection - Simplified
    const handleItemSelect = (item, index) => {
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

    // Handle select all - Simplified
    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedItems([]);
            showToast('Cleared all selections', 'warning');
        } else {
            const allItems = items.map(item => ({
                JO_No: item.JO_No,
                FAC_NO: item.FAC_NO,
                FAC_name: item.FAC_name
            }));
            setSelectedItems(allItems);
            showToast(`Selected all ${allItems.length} items`, 'success');
        }
    };

    // Check if a specific item is selected - Simplified
    const isItemSelected = (item) => {
        return selectedItems.some(selected => selected.FAC_NO === item.FAC_NO);
    };

    // Handle evaluation
    const handleEvaluate = () => {
        if (selectedItems.length === 0) {
            showToast('Please select at least one item to evaluate', 'error');
            return;
        }
        setIsModalOpen(true);
    };

    // Handle evaluation confirmation - With Toast
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
                // Show success toast
                showToast(result.message || 'Evaluation submitted successfully!', 'success');
                
                setSelectedItems([]);
                setIsModalOpen(false);
                
                if (onEvaluationComplete) {
                    onEvaluationComplete();
                }
                
                // Show warning toast if there were warnings
                if (result.warnings && result.warnings.length > 0) {
                    setTimeout(() => {
                        showToast(`${result.warnings.length} item(s) had warnings`, 'warning');
                    }, 500);
                }
                
                setTimeout(() => {
                    onClose();
                }, 1500);
            } else {
                // Show error toast
                showToast(result.error || 'Failed to submit evaluation', 'error');
            }
        } catch (error) {
            console.error('Evaluation error:', error);
            // Show error toast
            showToast(error.message || 'Failed to submit evaluation. Please try again.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Toast Component */}
            <Toast
                show={toast.show}
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, show: false })}
                duration={3000}
            />

            <div onAnimationEnd={onAnimationEnd} className={`          
                fixed inset-0 z-50 items-start w-full max-h-screen overflow-y-auto text-sm
                bg-white ${isClosingJO ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
                
                <div className='p-5'>
                    <button className='w-3' onClick={onClose}> 
                        <ArrowBackIosIcon fontSize='small'/>
                    </button>
                </div>
                
                <div className='flex justify-between px-5 py-2 font-sans tracking-wide border-b'>
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
                        {!header.eval_status && (
                            <>
                                <div className='flex items-center gap-2'>
                                    <Checkbox
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        size="small"
                                        color="primary"
                                        disabled={isSubmitting}
                                    />
                                    <span className='text-sm text-slate-600'>Select All</span>
                                </div>  
                                <div 
                                    className={`px-3 py-1 tracking-wide rounded-md shadow-md 
                                        ${selectedItems.length > 0 && !isSubmitting
                                            ? 'bg-green-600 text-white cursor-pointer hover:bg-green-700' 
                                            : 'text-green-600 border border-green-600 cursor-not-allowed'
                                        }`}
                                >
                                    <button 
                                        className='flex gap-1'
                                        onClick={handleEvaluate}
                                        disabled={selectedItems.length === 0 || isSubmitting}
                                    >
                                        <DriveFileRenameOutlineIcon fontSize='small'/>
                                        Evaluate ({selectedItems.length})
                                    </button>
                                </div>
                            </>              
                        )}
                    </div>
                    
                    {items.map((item, index) => (
                        <div 
                            key={`${item.JO_No}-${item.FAC_NO}-${item.workDet}`}
                            className={`flex flex-col mb-2 rounded-lg cursor-pointer transition-colors duration-200
                                ${isItemSelected(item) && !header.eval_status
                                    ? 'bg-blue-50 border border-blue-200' 
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                            onClick={() => !header.eval_status && handleItemSelect(item, index)}
                        >
                            <div className='flex items-center gap-1 mt-1'>
                                {!item.eval_status && !header.eval_status && (
                                    <Checkbox
                                        checked={isItemSelected(item)}
                                        onChange={() => handleItemSelect(item, index)}
                                        onClick={(e) => e.stopPropagation()}
                                        size="small"
                                        color="primary"
                                        disabled={isSubmitting}
                                    />
                                )}
                                <div className='flex flex-col gap-1 pl-2'>
                                    <div>
                                        <span className='font-semibold text-blue-800'>{item.FAC_name}</span>
                                        <span className='pl-2 text-slate-500'>({item.FAC_NO})</span>
                                    </div>
                                    <span className='italic text-slate-500'>{item.workDet}</span>
                                </div>
                            </div>
                            {item.eval_status && 
                                <div className='flex flex-col px-3 py-1 text-black'>
                                    <span className='pl-2 mt-1 font-semibold'>{item.eval_status}</span>
                                    <span className='pl-2'>Eval. Remarks: {item.eval_remarks}</span>
                                </div>
                            }
                        </div>
                    ))}
                    
                    {selectedItems.length > 0 && !header.eval_status && !isSubmitting && (
                        <div className='px-5 py-3 mt-4 text-sm text-blue-600 rounded-lg bg-blue-50'>
                            {selectedItems.length} item(s) selected for evaluation
                        </div>
                    )}
                </div>
            </div>

            {/* Evaluation Modal */}
            <EvaluationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmEvaluation}
                selectedCount={selectedItems.length}
                isSubmitting={isSubmitting}
            />
        </>
    );
}

export default MvEvalJO;