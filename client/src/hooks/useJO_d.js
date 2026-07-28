import {useState, useEffect, useCallback} from 'react';
import {api} from '../api/axios';

export const useJO_d = () => {
    const [joDetails, setJoDetails] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get All Jo Details
      const getJODetails = useCallback(async() => {
        try {
          setIsLoading(true);
          setError(null)

          const response = await api.get('/jo_dRoute');
          const data = response.data;
          
          setJoDetails(data);
        } catch (error) {
          console.error('Error details:', {
              message: error.message,
              response: error.response,
              config: error.config
            });
            
            setError(
              error.response?.data?.error || 
              error.message || 
              'Failed to fetch JO headers'
            );
        } finally {
          setIsLoading(false);
        }
      }, []);

     // Get JO details by JO_No
    const getJODetailsByJO = useCallback(async (joNo) => {
        try {
            setIsLoading(true);
            setError(null);

            const encodedJoNo = encodeURIComponent(joNo);
            const response = await api.get(`/jo_dRoute/${encodedJoNo}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching JO details:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to fetch JO details'
            );
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Update JO details - ONLY send fields that need to be updated
    const updateJODetails = useCallback(async (joNo, detailsData) => {
    try {
        setIsLoading(true);
        setError(null);

        const encodedJoNo = encodeURIComponent(joNo);
        
        // Ensure all fields are included
        const completeDetails = detailsData.map(item => ({
            FAC_NO: item.FAC_NO || '',
            FAC_name: item.FAC_name || '',
            qty: item.qty || 1,
            UOM: item.UOM || '',
            workDet: item.workDet || '',
            TargetDate: item.TargetDate || null,
            Status: item.Status || 'OPEN',
            brand: item.brand || '',
            serialNo: item.serialNo || '',
            ItemLocation: item.ItemLocation || '',
            xDate: item.xDate || null,
            xpost: item.xpost || 0,
            eval_status: item.eval_status || '',        // IMPORTANT: Include this
            eval_remarks: item.eval_remarks || '',      // IMPORTANT: Include this
            disposal_reason: item.disposal_reason || '',
            Main_Status: item.Main_Status || 'OPEN',
            Main_Remarks: item.Main_Remarks || ''
        }));
        
        const response = await api.put(`/jo_dRoute/${encodedJoNo}`, completeDetails);
        
        // Refresh the list after update
        await getJODetails();
        
        return response.data;
    } catch (error) {
        console.error('Error updating JO details:', error);
        setError(
            error.response?.data?.error || 
            error.message || 
            'Failed to update JO details'
        );
        throw error;
    } finally {
        setIsLoading(false);
    }
}, [getJODetails]);

    // Create JO details (bulk insert)
    const createJODetails = useCallback(async (detailsData) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post('/jo_dRoute', detailsData);
            
            // Refresh the list after creation
            await getJODetails();
            
            return response.data;
        } catch (error) {
            console.error('Error creating JO details:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to create JO details'
            );
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [getJODetails]);

        useEffect(()=>{
          getJODetails()
        }, [getJODetails]);

    return {
      joDetails,
      isLoading,
      error,
      joDetailsRefresh : getJODetails,
      updateJODetails,
      createJODetails,
      getJODetailsByJO
    }
};