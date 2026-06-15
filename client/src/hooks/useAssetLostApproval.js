import { useState, useCallback } from 'react';
import axios from 'axios';

export const useAssetLostApproval = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const approveAssetLost = async (AAFNo, remarks, userInfo, appLevel = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/alostApproval/approve/${encodeURIComponent(AAFNo)}`, {
        approver: userInfo?.userId || userInfo?.user,
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
  
  const rejectAssetLost = async (AAFNo, remarks, userInfo, appLevel ) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/alostApproval/reject/${encodeURIComponent(AAFNo)}`, {
        approver: userInfo?.userId || userInfo?.user,
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
   * Check if document can be approver based on current status
   * @param {Object} docStatus - Document status object
   * @returns {Object} Approval availability
   */
  const canApprove = (docStatus) => {
    if (!docStatus) return { canApprove: false, reason: 'No document status available' };
    
    if (docStatus.disapproved === 1) {
      return { canApprove: false, reason: 'Document has been disapproved' };
    }
    
    if (docStatus.xPosted === 1) {
      return { canApprove: false, reason: 'Document is already fully approver' };
    }
    
    if (docStatus.xPosted === 3) {
      return { canApprove: true, reason: 'Ready for initial approval' };
    }
    
    if (docStatus.xPosted === 2) {
      return { canApprove: true, reason: 'Ready for next level approval' };
    }
    
    return { canApprove: false, reason: 'Document not ready for approval' };
  };
  
const getTotalLevels = useCallback(async () => {
  try {
    console.log('🔄 Fetching total levels from API...');
    
    const response = await axios.get(`/approval/total-levels?module=${encodeURIComponent('Lost Asset')}`, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Full API Response:', response);
    console.log('📡 Response data:', response.data);
    
    // The backend returns: { success: true, totalLevels: number, module: string }
    if (response.data && response.data.success === true) {
      const totalLevels = response.data.totalLevels || 3;
      console.log('✅ Successfully fetched total levels:', totalLevels);
      return { success: true, totalLevels: totalLevels };
    } else {
      console.warn('⚠️ API returned unexpected structure:', response.data);
      return { success: true, totalLevels: 3 }; // Default fallback
    }
    
  } catch (err) {
    console.error('❌ Error fetching total levels:', {
      message: err.message,
      code: err.code,
      name: err.name,
      response: err.response?.data
    });
    
    // Return default value on error
    return { success: true, totalLevels: 3 };
  }
}, []);

 /**
   * Post a Asset Accountability Form for approval (update xPosted to 3 only)
   * @param {string} AAFNo - Asset Accountability Form number
   * @returns {Promise} Post result
   */
  const postAssetLost = async (AAFNo) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.put(`/alostApproval/post/${encodeURIComponent(AAFNo)}`);
      
      setLoading(false);

      
      return { 
        success: true, 
        data: response.data.data,
        message: response.data.message
      };
      
    } catch (err) {
      console.error('Post Asset Accountability Form error:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to post Asset Accountability Form for approval';
      setError(errorMessage);
      setLoading(false);
      return { 
        success: false, 
        error: errorMessage
      };
    }
  };

  /**
   * Check if Asset Accountability Form can be posted for approval
   * @param {Object} docStatus - Document status object
   * @returns {Object} Post availability
   */
  const canPost = (docStatus) => {
    if (!docStatus) return { canPost: false, reason: 'No document status available' };
    
    if (docStatus.xPosted === 4) {
      return { canPost: false, reason: 'Document has been disapproved' };
    }
    
    if (docStatus.xPosted === 1) {
      return { canPost: false, reason: 'Document is already fully approved' };
    }
    
    if (docStatus.xPosted === 3) {
      return { canPost: false, reason: 'Document is already posted for approval' };
    }
    
    if (docStatus.xPosted === 0) {
      return { canPost: true, reason: 'Ready to post for approval' };
    }
    
    return { canPost: false, reason: 'Document cannot be posted for approval' };
  };
  
  

  return {
    // Main functions
    approveAssetLost,
    rejectAssetLost,
    canApprove,
    getTotalLevels,

    postAssetLost,
    canPost,

    // State
    loading,
    error
  };
};