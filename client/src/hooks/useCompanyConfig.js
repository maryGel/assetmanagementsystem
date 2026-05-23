import {useState, useEffect} from 'react';
import {api} from '../api/axios';

export const useCompanyConfig = () => {
    const [companyConfig, setCompanyConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const getCompanyConfig = async() => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.get('/companyConfig');
            const data = response.data;

            setCompanyConfig(data);
        } catch (error) {
            console.error('Error fetching company config:', {
                message: error.message,
                response: error.response,
                config: error.config
            });

            setError(
                error.response?.data?.error ||
                error.message ||
                'Failed to fetch company configuration'
            );
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(()=> {
        getCompanyConfig()
    }, []);

    return {
        companyConfig,
        isLoading,
        error,
        refreshCompanyConfig: getCompanyConfig
    }
}