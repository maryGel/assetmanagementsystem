import { useEffect, useReducer, useCallback } from 'react';
import { api } from '../api/axios';

const initialState = {
    // List state
    users: [],
    page: 1,
    limit: 5,
    total: 0,
    totalPages: 1,
    search: '',
    loading: false,
    error: null,

    // Selected user state
    selectedUser: null,  
    formData: null,                 // Current for data during editing
    isEditing: false,               // edit mode
    isCreating: false,              // creating new user
    hasUnsavedChanges: false,       // with unsaved changes

    // UI State
    saving: false,
    cancelDialogOpen: false,
    saveDialogOpen: false,
    snackbar: { open : false, message: '', severity: 'success'}
};

function usersReducer(state, action) {
    switch (action.type) {
        case 'FETCH_START':
            return { ...state, loading: true, error: null };
            
        case 'FETCH_USERS_SUCCESS':
            const total = Number(action.payload.total || 0);
            const totalPages = Math.max(1, Math.ceil(total / state.limit));
            return {
                ...state,
                users: action.payload.results || [],
                total,
                totalPages,
                loading: false,
                error: null,
            };
            
        case 'FETCH_USER_SUCCESS':
            return {
                ...state,
                selectedUser: action.payload,
                formData: { ...action.payload, password: '' },
                loading: false,
                error: null,
            };
            
        case 'FETCH_ERROR':
            return { ...state, loading: false, saving: false, error: action.payload };
        
        case 'START_CREATE':
            return {
                ...state,
                isEditing: true,
                isCreating: true,
                selectedUser: null,
                formData: {
                    user: '',
                    fname: '',
                    password: '',
                    mname: '',
                    lname: '',
                    xPosi: '',
                    xDept: '',
                    xlevel: '',
                    xSection: '',
                    Admin: 0,
                    Log: 0,
                    Approver: 0,
                    MULTI_DEPT: '',
                    MULTI_APP: ''
                },
                hasUnsavedChanges: false
            };
        
        case 'START_EDIT':
            // FIXED: Use state.selectedUser, not selectedUser
            if (!state.selectedUser) return state;
            return {
                ...state,
                isEditing: true,
                isCreating: false,
                // FIXED: Use state.selectedUser, not selectedUser
                formData: { ...state.selectedUser, password: '' },
                hasUnsavedChanges: false
            };
        
        case 'UPDATE_FORM':
            return {
                ...state,
                formData: { ...state.formData, ...action.payload },
                hasUnsavedChanges: true
            };
        
        case 'CANCEL_EDIT':
            return {
                ...state,
                isEditing: false,
                isCreating: false,
                formData: {...state.selectedUser},
                hasUnsavedChanges: false,
                cancelDialogOpen: false
            };
        
        case 'CLEAR_SELECTED':
            return {
                ...state,
                selectedUser: null,
                formData: null,
                isEditing: false,
                isCreating: false
            };
        
        case 'OPEN_CANCEL_DIALOG':
            return { ...state, cancelDialogOpen: true };
        case 'CLOSE_CANCEL_DIALOG':
            return { ...state, cancelDialogOpen: false };
        case 'OPEN_SAVE_DIALOG':
            return { ...state, saveDialogOpen: true };
        case 'CLOSE_SAVE_DIALOG':
            return { ...state, saveDialogOpen: false };
        
        case 'SAVE_START':
            return { ...state, saving: true, error: null };
        case 'SAVE_END':
            return { ...state, saving: false };
        case 'SAVE_SUCCESS':
        return {
            ...state,
            isEditing: false,
            isCreating: false,
            hasUnsavedChanges: false,
            saving: false,
            cancelDialogOpen: false,
            saveDialogOpen: false
        };

        
        case 'SHOW_SNACKBAR':
            return {
                ...state,
                snackbar: {
                    open: true,
                    message: action.payload.message,
                    severity: action.payload.severity || 'success'
                }
            };
        case 'HIDE_SNACKBAR':
            return { ...state, snackbar: { ...state.snackbar, open: false } };
        
        case 'SET_PAGE':
            return { ...state, page: action.payload };
        case 'SET_SEARCH':
            return { ...state, search: action.payload, page: 1 };
            
        default:
            return state;
    }
}

export const useUsers = () => {
    const [state, dispatch] = useReducer(usersReducer, initialState);

    // Get all users
    const getUsers = useCallback(async (pageNum = state.page, searchText = state.search) => {

        try {
            dispatch({ type: 'FETCH_START' });
            const res = await api.get('/users', {
                params: { page: pageNum, limit: state.limit, q: searchText },
                withCredentials: true
            });

            const data = res.data;
            if (!data) throw new Error('Failed to fetch users');

            dispatch({ type: 'FETCH_USERS_SUCCESS', payload: data });
            
        } catch (err) {
            dispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to fetch users' });
        }
    }, [state.limit]);

    // Get single user
    const getUser = useCallback(async (username) => {
        
        if (!username) {
            dispatch({ type: 'CLEAR_SELECTED' });
            return null;
        }

        try {
            dispatch({ type: 'FETCH_START' });
            
            const res = await api.get(`/users/${encodeURIComponent(username)}`, { 
                withCredentials: true 
            });

            const data = res.data;
            if (!data) throw new Error('Failed to fetch user');
            dispatch({ type: 'FETCH_USER_SUCCESS', payload: data });

            return data;
        } catch (err) {
            dispatch({ type: 'FETCH_ERROR', payload: err.message || 'Failed to fetch user' });
            return null;
        }
    }, []);

    // Create user
    const createUser = useCallback(async (userData) => {
        dispatch({ type: 'SAVE_START' });
        try {
            const res = await api.post('/users', userData, {
                headers: { 'Content-Type': 'application/json' },
                withCredentials: true,
            });

            if (!res.data) throw new Error('Failed to save user');

            await getUsers(1, state.search);
            dispatch({ type: 'SAVE_END' });
            
            dispatch({
                type: 'SHOW_SNACKBAR',
                payload: { message: 'User created successfully', severity: 'success' }
            });
            
            // IMPORTANT: Reset edit state and unsaved changes
            dispatch({ type: 'SAVE_SUCCESS' });   // ← Add this to exit create mode

            return { success: true, data: res.data };

        } catch (err) {
            console.error('[createUser] error:', err);
            dispatch({ type: 'FETCH_ERROR', payload: err.response?.data?.error || err.message || 'Failed to save user' });
            return { success: false, error: err.response?.data?.error || err.message };
        }
    }, [getUsers, state.search]);

    // Update user
    const updateUser = useCallback(async (username, userData) => {
        dispatch({ type: 'SAVE_START' });
        try {
            const res = await api({
                method: 'put',
                url: `/users/${encodeURIComponent(username)}`,
                data: userData,
                withCredentials: true
            });

            await getUsers(state.page, state.search);
            
            if (state.selectedUser && state.selectedUser.user === username) {
                await getUser(username);
            }
            
            dispatch({ type: 'SAVE_END' });
            
            // Show success message
            dispatch({
                type: 'SHOW_SNACKBAR',
                payload: { message: 'User updated successfully', severity: 'success' }
            });
            
            // IMPORTANT: Reset edit state and unsaved changes
            dispatch({ type: 'SAVE_SUCCESS' });   // ← Add this to exit edit mode
            
            return { success: true, data: res.data };
        } catch (err) {
            console.error("AXIOS ERROR:", err.response || err);
            dispatch({ type: 'FETCH_ERROR', payload: err.response?.data?.error || 'Update error' });
            return { success: false, error: err.response?.data?.error || err.message };
        }
    }, [getUsers, state.page, state.search, state.selectedUser, getUser]);


    // Delete user
    const deleteUser = useCallback(async (username) => {
        dispatch({ type: 'SAVE_START' });
        try {
            const res = await api.delete(`/users/${encodeURIComponent(username)}`, {
                withCredentials: true,
            });

            await getUsers(state.page, state.search);

            if(state.selectedUser && state.selectedUser.user === username){
                dispatch ({ type: 'CLEAR_SELECTED'});
            }

            dispatch({ type: 'SAVE_END' });

            dispatch({
                type: 'SNOW_SNACKBAR',
                payload: { message: 'User deleted successfully', severity: 'success' }
            });

            return { success: true, data: res.data };
        } catch (err) {
            dispatch({ type: 'ERROR', payload: err.response?.data?.error || err.message || 'Delete failed' });
            return { success: false, error: err.response?.data?.error || err.message };
        }
    }, [getUsers, state.page, state.search, state.selectedUser]);

    // Form actions
    const startCreate = () => dispatch({ type: 'START_CREATE'});
    const startEdit = () => dispatch({ type: 'START_EDIT'});
    const updateForm = (formData) => {  // Renamed parameter to avoid confusion

        dispatch({ type: 'UPDATE_FORM', payload: formData });
    };
    const cancelEdit = useCallback(() => {        
        if (state.hasUnsavedChanges) {
            dispatch({ type: 'OPEN_CANCEL_DIALOG' });
        } else {
            dispatch({ type: 'CANCEL_EDIT' });
        }
    }, [state.hasUnsavedChanges]); // Add dependency

    // And confirmCancel should just dispatch CANCEL_EDIT
    const confirmCancel = useCallback(() => {
        dispatch({ type: 'CANCEL_EDIT' });
    }, []);

    // Dialog Actions
    const openSaveDialog = () => dispatch({ type: 'OPEN_SAVE_DIALOG'});
    const closeSaveDialog = () => dispatch({ type: 'CLOSE_SAVE_DIALOG'});
    const closeCancelDialog = () => dispatch({ type: 'CLOSE_CANCEL_DIALOG'});
    const closeSnackDialog = () => dispatch({ type: 'HIDE_SNACKBAR'});

    // Set selected user
    const setSelectedUser = useCallback((username) => {
        console.log('[setSelectedUser] called with:', username);
        
        if (!username) {
            dispatch({ type: 'CLEAR_SELECTED' });
            return;
        }
        
        // Directly call getUser with the username
        getUser(username);
    }, [getUser]);

    // Set page and search
    const setPage = (page) => dispatch({ type: 'SET_PAGE', payload: page });
    const setSearch = (search) => dispatch({ type: 'SET_SEARCH', payload: search });


    useEffect(() => {
        getUsers(state.page, state.search);
    }, [state.page, state.search]);


    return {
         // State
        users: state.users,
        selectedUser: state.selectedUser,
        formData: state.formData,
        page: state.page,
        limit: state.limit,
        total: state.total,
        totalPages: state.totalPages,
        search: state.search,
        loading: state.loading,
        saving: state.saving,
        error: state.error,
        
        // UI State
        isEditing: state.isEditing,
        isCreating: state.isCreating,
        hasUnsavedChanges: state.hasUnsavedChanges,
        cancelDialogOpen: state.cancelDialogOpen,
        saveDialogOpen: state.saveDialogOpen,
        snackbar: state.snackbar,

        // Functions
        getUsers,
        getUser,
        createUser,
        updateUser,
        deleteUser,
        setPage,
        setSearch,
        setSelectedUser,
        
        // Form actions
        startCreate,
        startEdit,
        updateForm,
        cancelEdit,
        confirmCancel,
        
        // Dialog actions
        openSaveDialog,
        closeSaveDialog,
        closeCancelDialog,
        closeSnackDialog,
    };
};