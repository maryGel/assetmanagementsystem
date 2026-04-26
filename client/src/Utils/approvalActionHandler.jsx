// hooks/useApprovalActions.js

import { useState, useCallback, useRef } from 'react';

export const useApprovalActions = ({
    onApprove,
    onReject,
    getItemLevel, // Optional: function to get approval level for multi-level approval
    onRefresh,
    onExitSelectionMode,
    showToast,
    getUserInfo // New: function to get user info for approval/rejection
}) => {
    const [processingItem, setProcessingItem] = useState(null);
    const [remarks, setRemarks] = useState({});
    
    // Bulk action state
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkActionType, setBulkActionType] = useState(null);
    const [bulkRemarks, setBulkRemarks] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);

    // Process single item action
    const processSingleItem = useCallback(async (itemId, action, remarkText, itemData = null, userInfo = null) => {
        setProcessingItem(itemId);
        
        let result;
                // Get the approval level if multi-level approval is configured
        let appLevel = null;
        if (getItemLevel) {
            // For approve: get current level to approve (next level)
            // For reject: get current level being rejected
            appLevel = getItemLevel(itemData, action === 'approve');
        }
        
        if (action === 'approve') {
            // Pass appLevel as separate parameter (not inside userInfo)
            result = await onApprove(itemId, remarkText, userInfo, appLevel);
        } else {
            // For rejection - pass appLevel as separate parameter
            result = await onReject(itemId, remarkText, userInfo, appLevel);
        }
        
        setProcessingItem(null);
        return result;
    }, [onApprove, onReject, getItemLevel]);

    // Process bulk action
    const processBulkAction = useCallback(async (items, actionType, remarks, getItemData, userInfo) => {
        if (items.length === 0) {
            showToast(`No items selected`, 'error');
            return false;
        }

        if (!remarks.trim()) {
            showToast(`Please provide remarks for bulk ${actionType}`, 'error');
            return false;
        }

        setBulkLoading(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const itemId of items) {
                const itemData = getItemData ? getItemData(itemId) : null;
                const result = await processSingleItem(itemId, actionType, remarks, itemData, userInfo);
                
                if (result?.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to ${actionType} ${itemId}:`, result?.error);
                }
            }

            const actionPastTense = actionType === 'approve' ? 'Approved' : 'Rejected';
            const actionPresentTense = actionType;
            
            if (successCount > 0) {
                const message = `${actionPastTense} ${successCount} item${successCount > 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`;
                showToast(message, failCount === 0 ? 'success' : 'warning');
                
                setBulkDialogOpen(false);
                setBulkRemarks('');
                setBulkActionType(null);
                
                if (onExitSelectionMode) onExitSelectionMode();
                
                setTimeout(() => {
                    onRefresh?.();
                }, 2000);
                
                return true;
            } else {
                showToast(`Failed to ${actionPresentTense} all ${failCount} items`, 'error');
                return false;
            }
        } catch (error) {
            console.error(`Bulk ${actionType} error:`, error);
            showToast(`Failed to process bulk ${actionType}`, 'error');
            return false;
        } finally {
            setBulkLoading(false);
        }
    }, [processSingleItem, showToast, onExitSelectionMode, onRefresh]);

    // Open bulk dialog
    const openBulkDialog = useCallback((actionType) => {
        setBulkActionType(actionType);
        setBulkDialogOpen(true);
    }, []);

    // Close bulk dialog
    const closeBulkDialog = useCallback(() => {
        if (!bulkLoading) {
            setBulkDialogOpen(false);
            setBulkRemarks('');
            setBulkActionType(null);
        }
    }, [bulkLoading]);

    // Handle individual action
    const handleIndividualAction = useCallback(async (itemId, action, remarkText, itemData = null, userInfo = null) => {
        if (!remarkText?.trim()) {
            showToast(`Please provide remarks for ${action}`, 'error');
            return null;
        }
        
        const result = await processSingleItem(itemId, action, remarkText, itemData, userInfo);
        
        if (result?.success) {
            const successMessage = action === 'approve'
                ? `Successfully ${action}d ${itemId}`
                : `Successfully rejected ${itemId}`;
            showToast(successMessage, 'success');
            setTimeout(() => {
                onRefresh?.();
            }, 2000);
        } else if (result?.requiredAppCode) {
            showToast(`Access denied. Required: ${result.requiredAppCode}`, 'error');
        } else if (result?.error) {
            showToast(`Error: ${result.error}`, 'error');
        }
        
        return result;
    }, [processSingleItem, showToast, onRefresh]);

    const updateRemarks = useCallback((itemId, value) => {
        setRemarks(prev => ({ ...prev, [itemId]: value }));
    }, []);

    const clearRemarks = useCallback((itemId) => {
        setRemarks(prev => {
            const newRemarks = { ...prev };
            delete newRemarks[itemId];
            return newRemarks;
        });
    }, []);

    return {
        // State
        processingItem,
        remarks,
        bulkDialogOpen,
        bulkActionType,
        bulkRemarks,
        bulkLoading,
        
        // Actions
        handleIndividualAction,
        processBulkAction,
        openBulkDialog,
        closeBulkDialog,
        updateRemarks,
        clearRemarks,
        setBulkRemarks
    };
};