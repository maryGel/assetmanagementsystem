import { useState, useCallback } from 'react';
import axios from 'axios';

export const useDisposalApproval = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const approveDisposal = async (AD_No, remarks, userInfo, appLevel = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/adApproval/approve/${encodeURIComponent(AD_No)}`, {
        approved_by: userInfo?.userId || userInfo?.user,
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
  
  const rejectDisposal = async (AD_No, remarks, userInfo, appLevel ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/adApproval/reject/${encodeURIComponent(AD_No)}`, {
        approved_by: userInfo?.userId || userInfo?.user,
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
   * Check if document can be approved_by based on current status
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
      
      const response = await axios.get(`/adApproval/total-levels?module=${encodeURIComponent('Disposal')}`, {
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
   * @returns {number|null} Next level or null if fully approved_by
   */
  const getNextApproverLevel = (appStat, totalLevels) => {
    if (!appStat || appStat === '') {
      return 1; // Start with level 1
    }
    
    const approvedLevels = appStat.split(',').map(l => parseInt(l.trim())).filter(l => !isNaN(l));
    const nextLevel = approvedLevels.length + 1;
    
    return nextLevel <= totalLevels ? nextLevel : null;
  };

  return {
    // Main functions
    approveDisposal,
    rejectDisposal,
    canApprove,
    getTotalLevels,
    getNextApproverLevel,
    // State
    loading,
    error
  };
};