import { useState, useEffect } from 'react';
import { api } from '../api/axios';

export const useJO_woe = () => {
    const [joWorkOrders, setJoWorkOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expensesByWorkNo, setExpensesByWorkNo] = useState({});

    // Get All JO Work Orders
    useEffect(() => {
        const getJOWorkOrders = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const response = await api.get('/jo_woeRoute');
                const data = response.data;
                
                setJoWorkOrders(data);

                // Group expenses by workNo
                const grouped = data.reduce((acc, item) => {
                    if (!acc[item.workNo]) {
                        acc[item.workNo] = [];
                    }
                    acc[item.workNo].push(item);
                    return acc;
                }, {});
                setExpensesByWorkNo(grouped);

            } catch (error) {
                console.error('Error details:', {
                    message: error.message,
                    response: error.response,
                    config: error.config
                });
                
                setError(
                    error.response?.data?.error || 
                    error.message || 
                    'Failed to fetch JO work Orders'
                );
            } finally {
                setIsLoading(false);
            }
        };
        getJOWorkOrders();
    }, []);

    // Get expenses for a specific workNo
    const getExpensesForWorkNo = (workNo) => {
        return expensesByWorkNo[workNo] || [];
    };

    // Fetch a single work order with its expenses
    const fetchWorkOrderWithExpenses = async (workNo) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.get(`/jo_woeRoute/${workNo}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching work order with expenses:', error);
            const errorMessage = error.response?.data?.error || 
                               error.message || 
                               'Failed to fetch work order';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    // POST - Create new work order expense
    const createWorkOrderExpense = async (expenseData) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.post('/jo_woeRoute', expenseData);
            
            // Refresh the list after creation
            const refreshResponse = await api.get('/jo_woeRoute');
            const data = refreshResponse.data;
            setJoWorkOrders(data);
            
            // Update grouped expenses
            const grouped = data.reduce((acc, item) => {
                if (!acc[item.workNo]) {
                    acc[item.workNo] = [];
                }
                acc[item.workNo].push(item);
                return acc;
            }, {});
            setExpensesByWorkNo(grouped);
            
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('Error creating work order expense:', error);
            const errorMessage = error.response?.data?.error || 
                               error.message || 
                               'Failed to create work order expense';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    };

    // PUT - Update existing work order expense
    const updateWorkOrderExpense = async (id, expenseData) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.put(`/jo_woeRoute/${id}`, expenseData);
            
            // Refresh the list after update
            const refreshResponse = await api.get('/jo_woeRoute');
            const data = refreshResponse.data;
            setJoWorkOrders(data);
            
            // Update grouped expenses
            const grouped = data.reduce((acc, item) => {
                if (!acc[item.workNo]) {
                    acc[item.workNo] = [];
                }
                acc[item.workNo].push(item);
                return acc;
            }, {});
            setExpensesByWorkNo(grouped);
            
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('Error updating work order expense:', error);
            const errorMessage = error.response?.data?.error || 
                               error.message || 
                               'Failed to update work order expense';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    };

    // DELETE - Delete work order expense
    const deleteWorkOrderExpense = async (id) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.delete(`/jo_woeRoute/${id}`);
            
            // Refresh the list after deletion
            const refreshResponse = await api.get('/jo_woeRoute');
            const data = refreshResponse.data;
            setJoWorkOrders(data);
            
            // Update grouped expenses
            const grouped = data.reduce((acc, item) => {
                if (!acc[item.workNo]) {
                    acc[item.workNo] = [];
                }
                acc[item.workNo].push(item);
                return acc;
            }, {});
            setExpensesByWorkNo(grouped);
            
            return {
                success: true,
                data: response.data.data,
                message: response.data.message
            };
        } catch (error) {
            console.error('Error deleting work order expense:', error);
            const errorMessage = error.response?.data?.error || 
                               error.message || 
                               'Failed to delete work order expense';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage
            };
        } finally {
            setIsLoading(false);
        }
    };

    // Utility function to generate unique ID
    const generateExpenseId = () => {
        return Math.floor(Math.random() * 1000000000) + 1;
    };

    return {
        joWorkOrders,
        isLoading,
        error,
        createWorkOrderExpense,
        updateWorkOrderExpense,
        deleteWorkOrderExpense,
        generateExpenseId,
        getExpensesForWorkNo,
        fetchWorkOrderWithExpenses
    };
};