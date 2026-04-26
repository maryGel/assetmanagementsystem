import { useState } from 'react';
import ReactDOM from 'react-dom';
import { TextareaAutosize, CircularProgress } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const BulkActionDialog = ({
    isOpen,
    onClose,
    onConfirm,
    actionType, // 'approve' or 'reject'
    itemCount,
    itemName, // 'transfer order', 'job order', etc.
    loading = false,
    remarks = '',
    onRemarksChange,
    customTitle,
    customButtonText,
    customPlaceholder
}) => {
    if (!isOpen) return null;

    const getDialogConfig = () => {
        if (customTitle && customButtonText && customPlaceholder) {
            return {
                title: customTitle,
                buttonText: customButtonText,
                buttonColor: actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
                focusRingColor: actionType === 'approve' ? 'focus:ring-green-500' : 'focus:ring-red-500',
                placeholder: customPlaceholder
            };
        }

        if (actionType === 'approve') {
            return {
                title: 'Bulk Approval',
                buttonText: 'Approve All',
                buttonColor: 'bg-green-600 hover:bg-green-700',
                focusRingColor: 'focus:ring-green-500',
                placeholder: `Please enter your approval remarks for all selected ${itemName}s...`
            };
        } else {
            return {
                title: 'Bulk Rejection',
                buttonText: 'Reject All',
                buttonColor: 'bg-red-600 hover:bg-red-700',
                focusRingColor: 'focus:ring-red-500',
                placeholder: `Please enter your rejection remarks for all selected ${itemName}s...`
            };
        }
    };

    const config = getDialogConfig();

    return ReactDOM.createPortal(
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-end z-[99999] animate-fade-in'>
            <div 
                className='w-full bg-white shadow-xl rounded-t-2xl animate-slide-up'
                onClick={(e) => e.stopPropagation()}
            >
                <div className='sticky top-0 px-6 py-4 bg-white border-b rounded-t-2xl'>
                    <div className='flex items-center justify-between'>
                        <div>
                            <h3 className='text-lg font-semibold text-gray-900'>{config.title}</h3>
                            <p className='text-sm text-gray-500'>
                                You are about to {actionType} {itemCount} {itemName}{itemCount > 1 ? 's' : ''}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-1 transition-colors rounded-full hover:bg-gray-100"
                            disabled={loading}
                        >
                            <KeyboardArrowDownIcon />
                        </button>
                    </div>
                </div>
                
                <div className='p-6'>
                    <div className='mb-4'>
                        <label className='block mb-2 text-sm font-medium text-gray-700'>
                            Remarks <span className="text-red-500">*</span>
                        </label>
                        <TextareaAutosize
                            minRows={3}
                            placeholder={config.placeholder}
                            className={`w-full px-3 py-2 border border-gray-300 rounded-lg resize-y focus:outline-none focus:ring-2 ${config.focusRingColor} focus:border-transparent`}
                            value={remarks}
                            onChange={(e) => onRemarksChange(e.target.value)}
                            disabled={loading}
                            autoFocus
                        />
                    </div>
                    
                    <div className='flex flex-col gap-3'>
                        <button 
                            className={`flex-1 py-3 tracking-wide text-white transition-colors rounded-full shadow-md ${config.buttonColor} disabled:opacity-50 disabled:cursor-not-allowed`}
                            onClick={onConfirm}
                            disabled={loading || !remarks.trim()}
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <CircularProgress size={20} color="inherit" />
                                    <span>Processing {itemCount} {itemName}{itemCount > 1 ? 's' : ''}...</span>
                                </div>
                            ) : (
                                `${config.buttonText} (${itemCount})`
                            )}
                        </button>
                        <button 
                            className='flex-1 py-3 tracking-wide text-gray-600 transition-colors border border-gray-300 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BulkActionDialog;