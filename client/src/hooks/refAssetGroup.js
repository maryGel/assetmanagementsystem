import {useState, useEffect, useCallback} from 'react';
import {api} from '../api/axios';

export const useRefAssetGroup = () => {
    const [assetGroups, setAssetGroups] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const getAssetGroups = useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null)

        const response = await api.get('/refAssetGroup');
        const data = response.data;

        setAssetGroups(data);

      } catch (error) {
        console.error('Error details:', {
              message: error.message,
              response: error.response,
              config: error.config
          });

          setError(
              error.response?.data?.error ||
              error.message ||
              'Failed to fetch asset groups'
          );
      } finally {
        setIsLoading(false);
      }
    } , []);

    useEffect(() => {
      getAssetGroups();
    }, [getAssetGroups]);

    return {
      assetGroups,
      isLoading,
      error,
      assetGroupsRefresh: getAssetGroups
    }
};