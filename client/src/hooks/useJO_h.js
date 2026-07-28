import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/axios';

export const useJO_h = () => {
    const [joHeaders, setJoHeaders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get all JO headers
    const getJOHeaders = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.get('/jo_hRoute', {
                params: { _: Date.now() } // prevent caching
            });
            
            const data = response.data;
            setJoHeaders(data);
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

    // Get single JO header by JO_No
    const getJOHeader = useCallback(async (joNo) => {
        try {
            setIsLoading(true);
            setError(null);

            const encodedJoNo = encodeURIComponent(joNo);
            const response = await api.get(`/jo_hRoute/${encodedJoNo}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching JO header:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to fetch JO header'
            );
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Update JO header - ONLY send fields that need to be updated
    const updateJOHeader = useCallback(async (joNo, updateData) => {
        try {
            setIsLoading(true);
            setError(null);

            const encodedJoNo = encodeURIComponent(joNo);
            
            // Clean the data - remove undefined or null fields
            const cleanData = {};
            Object.keys(updateData).forEach(key => {
                if (updateData[key] !== undefined && updateData[key] !== null) {
                    cleanData[key] = updateData[key];
                }
            });
            
            const response = await api.put(`/jo_hRoute/${encodedJoNo}`, cleanData);
            
            // Refresh the list after update
            await getJOHeaders();
            
            return response.data;
        } catch (error) {
            console.error('Error updating JO header:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to update JO header'
            );
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [getJOHeaders]);

    // Create JO header
    const createJOHeader = useCallback(async (joData) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post('/jo_hRoute', joData);
            
            // Refresh the list after creation
            await getJOHeaders();
            
            return response.data;
        } catch (error) {
            console.error('Error creating JO header:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Failed to create JO header'
            );
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [getJOHeaders]);

    useEffect(() => {
        getJOHeaders();
    }, [getJOHeaders]);

    return {
        joHeaders,
        isLoading,
        error,
        joRefresh: getJOHeaders,
        getJOHeader,
        updateJOHeader,
        createJOHeader
    };
};