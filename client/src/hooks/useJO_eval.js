import axios from 'axios';

export const evaluateJO = async (JO_No, selectedItems, eval_status, eval_remarks, userInfo) => {
  try {
    const response = await axios.put(`/jo_evalRoute/evaluate/${encodeURIComponent(JO_No)}`, {
      selectedItems: selectedItems,
      eval_status,
      eval_remarks,
      userInfo
    });

    return response.data;
  } catch (error) {
    console.error('Error evaluating JO:', error);
    
    // ✅ Better error handling
    if (error.response) {
      const errorMessage = error.response.data?.error || 'Failed to evaluate JO';
      const errorCode = error.response.status;
      
      // Handle specific error codes
      if (errorCode === 400) {
        throw new Error(`Validation Error: ${errorMessage}`);
      } else if (errorCode === 404) {
        throw new Error('JO not found. It may have been deleted.');
      } else if (errorCode === 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(errorMessage);
      }
    } else if (error.request) {
      throw new Error('No response from server. Please check your connection.');
    } else {
      throw new Error(error.message || 'Failed to evaluate JO');
    }
  }
};

export const getJOEvaluationStatus = async (JO_No) => {
  try {
    const response = await axios.get(`/jo_evalRoute/status/${encodeURIComponent(JO_No)}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching evaluation status:', error);
    if (error.response) {
      throw new Error(error.response.data.error || 'Failed to fetch evaluation status');
    } else if (error.request) {
      throw new Error('No response from server. Please check your connection.');
    } else {
      throw new Error(error.message || 'Failed to fetch evaluation status');
    }
  }
};