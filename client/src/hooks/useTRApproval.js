import { useState, useCallback } from 'react';
import axios from 'axios';

export const useTRApproval = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const approveTR = async (TR_No, remarks, userInfo, appLevel = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/trApproval/approve/${encodeURIComponent(TR_No)}`, {
        approved: userInfo?.userId || userInfo?.user,
        remarks,
        userInfo: {
          user: userInfo?.user,
          fname: userInfo?.fname,
          lname: userInfo?.lname,
          multiApp: userInfo?.multiApp
        },
        appLevel // Optional: specify which level to approve
      });
      
      setLoading(false);
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message
      };
      
    } catch (err) {
      console.error('Approve error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to approve transfer request';
      setError(errorMessage);
      setLoading(false);
      return { 
        success: false, 
        error: errorMessage,
        requiredAppCode: err.response?.data?.requiredAppCode,
        userApps: err.response?.data?.userApps
      };
    }
  };
  
  const rejectTR = async (TR_No, remarks, userInfo, appLevel ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/trApproval/reject/${encodeURIComponent(TR_No)}`, {
        approved: userInfo?.userId || userInfo?.user,
        remarks,
        userInfo: {
          user: userInfo?.user,
          fname: userInfo?.fname,
          lname: userInfo?.lname,
          multiApp: userInfo?.multiApp
        },
        appLevel // Optional: specify which level is being rejected
      });
      
      setLoading(false);
      return { success: true, data: response.data.data, message: response.data.message };
      
    } catch (err) {
      console.error('Reject error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to reject transfer request';
      setError(errorMessage);
      setLoading(false);
      return { 
        success: false, 
        error: errorMessage,
        requiredAppCode: err.response?.data?.requiredAppCode,
        userApps: err.response?.data?.userApps
      };
    }
  };

  

  /**
   * Check if document can be approved based on current status
   * @param {Object} docStatus - Document status object
   * @returns {Object} Approval availability
   */
  const canApprove = (docStatus) => {
    if (!docStatus) return { canApprove: false, reason: 'No document status available' };
    
    if (docStatus.xpost === 4) {
      return { canApprove: false, reason: 'Document has been rejected' };
    }
    
    if (docStatus.xpost === 1) {
      return { canApprove: false, reason: 'Document is already fully approved' };
    }
    
    if (docStatus.xpost === 3) {
      return { canApprove: true, reason: 'Ready for initial approval' };
    }
    
    if (docStatus.xpost === 2) {
      return { canApprove: true, reason: 'Ready for next level approval' };
    }
    
    return { canApprove: false, reason: 'Document not ready for approval' };
  };
  
  const getTotalLevels = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await axios.get(`/trApproval/total-levels?module=${encodeURIComponent('Transfer (Internal)')}`, {
        signal: controller.signal,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      setLoading(false);
      return response.data;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Error getting total levels:', {
        message: err.message,
        code: err.code,
        name: err.name
      });
      setError(err.message);
      setLoading(false);
      return { success: false, error: err.message, totalLevels: 3 };
    }
  }, []);
  
    /**
   * Get the next approver level based on current appStat
   * @param {string} appStat - Current appStat value (e.g., "1,2")
   * @param {number} totalLevels - Total number of approval levels
   * @returns {number|null} Next level or null if fully approved
   */
  const getNextApproverLevel = (appStat, totalLevels) => {
    if (!appStat || appStat === '') {
      return 1; // Start with level 1
    }
    
    const approvedLevels = appStat.split(',').map(l => parseInt(l.trim())).filter(l => !isNaN(l));
    const nextLevel = approvedLevels.length + 1;
    
    return nextLevel <= totalLevels ? nextLevel : null;
  };

  /**
 * Post a Transfer Form for approval (update xpost to 3 only)
 * @param {string} TR_No - Transfer Form number
 * @returns {Promise} Post result
 */
const postTransfer = async (TR_No) => {
  setLoading(true);
  setError(null);
  
  try {
    const response = await axios.put(`/trApproval/post/${encodeURIComponent(TR_No)}`);
    
    setLoading(false);

    
    return { 
      success: true, 
      data: response.data.data,
      message: response.data.message
    };
    
  } catch (err) {
    console.error('Post Transfer Form error:', err);
    const errorMessage = err.response?.data?.error || err.message || 'Failed to post Transfer Form for approval';
    setError(errorMessage);
    setLoading(false);
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

  /**
   * Check if Transfer Form can be posted for approval
   * @param {Object} docStatus - Document status object
   * @returns {Object} Post availability
   */
  const canPost = (docStatus) => {
    if (!docStatus) return { canPost: false, reason: 'No document status available' };
    
    if (docStatus.xpost === 4) {
      return { canPost: false, reason: 'Document has been disapproved' };
    }
    
    if (docStatus.xpost === 1) {
      return { canPost: false, reason: 'Document is already fully approved' };
    }
    
    if (docStatus.xpost === 3) {
      return { canPost: false, reason: 'Document is already posted for approval' };
    }
    
    if (docStatus.xpost === 0) {
      return { canPost: true, reason: 'Ready to post for approval' };
    }
    
    return { canPost: false, reason: 'Document cannot be posted for approval' };
  };

  return {
    // Main functions
    approveTR,
    rejectTR,
    canApprove,
    getTotalLevels,
    getNextApproverLevel,

    postTransfer,
    canPost,
    // State
    loading,
    error
  };
};