import {useState, useEffect, useCallback} from 'react';
import {api} from '../api/axios';

export const useReturnItem = () => {
    const [returnItems, setReturnItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);


    const getReturnItems = useCallback(async() => {
      try {
        setIsLoading(true);
        setError(null)

        const response = await api.get('/returnitemRoute');
        const data = response.data;
        
        setReturnItems(data);


      } catch (error) {
        console.error('Error details:', {
              message: error.message,
              response: error.response,
              config: error.config
          });
          
          setError(
              error.response?.data?.error || 
              error.message || 
              'Failed to fetch Asset Account Details'
          );
      } finally {
        setIsLoading(false);
      }
    } , []);

    useEffect(() => {
      getReturnItems();
    }, [getReturnItems]);

    return {
      returnItems,
      isLoading,
      error,
      returnItemRefresh: getReturnItems 
    }
};