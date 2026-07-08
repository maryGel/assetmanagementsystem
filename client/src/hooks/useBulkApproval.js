// hooks/useBulkApproval.js
import { useState, useCallback } from 'react';

export const useBulkApproval = ({
  approvalHooks,
  onRefresh,
  showToast,
  getUserInfo
}) => {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState(null);
  const [bulkItems, setBulkItems] = useState([]);
  const [bulkItemNames, setBulkItemNames] = useState([]);
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState(null);

  // Get approval function based on document type
  const getApprovalFunction = useCallback((docType, actionType) => {
    const hookMap = {
      'Job Order': approvalHooks.jobOrder,
      'Transfer Order Form': approvalHooks.transfer,
      'Disposal Form': approvalHooks.disposal,
      'Asset Accountability Form': approvalHooks.assetAcc,
      'Lost Asset Form': approvalHooks.assetLost
    };
    
    const hook = hookMap[docType];
    if (!hook) return null;
    
    return actionType === 'approve' ? hook.approveDocument : hook.rejectDocument;
  }, [approvalHooks]);

  // Open bulk dialog
  const openBulkDialog = useCallback((actionType, selectedDocs) => {
    if (!selectedDocs || selectedDocs.length === 0) {
      showToast('No documents selected', 'warning');
      return;
    }

    // Filter documents based on status
    const validDocs = selectedDocs.filter(doc => {
      // Only allow approval/rejection for status 3 (For Approval) or 2 (Partially Approved)
      return doc.Status === 3 || doc.Status === 2;
    });

    if (validDocs.length === 0) {
      showToast(
        `No ${actionType === 'approve' ? 'approvable' : 'rejectable'} documents selected. Only documents with status 'For Approval' or 'Partially Approved' can be ${actionType}d.`,
        'warning'
      );
      return;
    }

    setBulkActionType(actionType);
    setBulkItems(validDocs);
    setBulkItemNames(validDocs.map(doc => doc.DocNo));
    setBulkDialogOpen(true);
    setBulkRemarks('');
    setBulkError(null);
  }, [showToast]);

  // Execute bulk action
  const executeBulkAction = useCallback(async (remarks) => {
    if (!remarks.trim()) {
      setBulkError('Please provide remarks');
      showToast('Please provide remarks for this action', 'error');
      return;
    }

    setBulkLoading(true);
    setBulkError(null);

    let successCount = 0;
    let failCount = 0;
    const errors = [];
    let processedDocs = [];

    try {
      const userInfo = getUserInfo ? getUserInfo() : {};

      // Process each document
      for (const doc of bulkItems) {
        try {
          // Get the appropriate approval function
          const approveFn = getApprovalFunction(doc.DocType, bulkActionType);
          
          if (!approveFn) {
            failCount++;
            errors.push(`${doc.DocNo}: No approval function found for ${doc.DocType}`);
            continue;
          }

          // Get the current approval level
          let appLevel = null;
          if (doc.appStat) {
            const approvedLevels = doc.appStat.split(',').map(l => parseInt(l.trim())).filter(l => !isNaN(l));
            appLevel = approvedLevels.length + 1;
          }

          // Execute approval/rejection
          const result = await approveFn(doc.DocNo, remarks, userInfo, appLevel);

          if (result?.success) {
            successCount++;
            processedDocs.push(doc.DocNo);
          } else {
            failCount++;
            errors.push(`${doc.DocNo}: ${result?.error || 'Unknown error'}`);
          }
        } catch (err) {
          failCount++;
          errors.push(`${doc.DocNo}: ${err.message}`);
          console.error(`Error processing ${doc.DocNo}:`, err);
        }
      }

      // Show results using toast
      if (successCount > 0) {
        const actionPastTense = bulkActionType === 'approve' ? 'Approved' : 'Rejected';
        let message = `${actionPastTense} ${successCount} document${successCount > 1 ? 's' : ''}`;
        if (failCount > 0) {
          message += `, ${failCount} failed`;
        }
        
        // Use the showToast function
        showToast(message, failCount === 0 ? 'success' : 'warning');

        // Close dialog
        setBulkDialogOpen(false);
        setBulkItems([]);
        setBulkItemNames([]);
        setBulkRemarks('');
        setBulkActionType(null);

        // IMPORTANT: Call onRefresh to trigger data refresh
        if (onRefresh && successCount > 0) {
          await onRefresh();
        }

        return { success: true, successCount, failCount, errors, processedDocs };
      } else {
        const errorMessage = `Failed to ${bulkActionType} all documents`;
        setBulkError(errorMessage);
        showToast(`Failed to ${bulkActionType} all documents`, 'error');
        return { success: false, errors };
      }
    } catch (error) {
      console.error('Bulk action error:', error);
      const errorMsg = error.message || 'An unexpected error occurred';
      setBulkError(errorMsg);
      showToast('Failed to process bulk action: ' + errorMsg, 'error');
      return { success: false, error: error.message };
    } finally {
      setBulkLoading(false);
    }
  }, [bulkItems, bulkActionType, getApprovalFunction, getUserInfo, showToast, onRefresh]);

  // Close dialog
  const closeBulkDialog = useCallback(() => {
    if (!bulkLoading) {
      setBulkDialogOpen(false);
      setBulkItems([]);
      setBulkItemNames([]);
      setBulkRemarks('');
      setBulkActionType(null);
      setBulkError(null);
    }
  }, [bulkLoading]);

  return {
    // State
    bulkDialogOpen,
    bulkActionType,
    bulkItems,
    bulkItemNames,
    bulkRemarks,
    bulkLoading,
    bulkError,

    // Actions
    openBulkDialog,
    executeBulkAction,
    closeBulkDialog,
    setBulkRemarks
  };
};