import {useState, useEffect} from 'react';
import {api} from '../api/axios';

export const useCompanyConfig = () => {
    const [companyConfig, setCompanyConfig] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState(null);

    const getCompanyConfig = async() => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await api.get('/companyConfig');
            const data = response.data;

            // GET / returns an array (SELECT * ... LIMIT 1), so unwrap the single row
            setCompanyConfig(Array.isArray(data) ? (data[0] || null) : data);
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

    // Saves Company Setup fields (basic info + advanced/auto-numbering fields).
    // `payload` should be a plain object keyed by the user0002inv column names,
    // e.g. { Company, address, CompTel, ReportHeader, Cinitial, XJONum, XTRNum, XADNum, XAANum, XALNum, AutoWO }
    const saveCompanyConfig = async(payload) => {
        try {
            setIsSaving(true);
            setError(null);

            const response = await api.post('/companyConfig', payload);

            // Refresh local state from the server rather than trusting the echoed payload
            await getCompanyConfig();

            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error saving company config:', {
                message: error.message,
                response: error.response,
                config: error.config
            });

            const message =
                error.response?.data?.error ||
                error.message ||
                'Failed to save company configuration';

            setError(message);
            return { success: false, error: message };
        } finally {
            setIsSaving(false);
        }
    }

    // Uploads a company logo file (multipart/form-data) and refreshes companyConfig
    // with the new ReportHeader path returned by the server.
    const uploadCompanyLogo = async(file) => {
        try {
            setIsSaving(true);
            setError(null);

            const formData = new FormData();
            formData.append('logo', file);

            const response = await api.post('/companyConfig/logo', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setCompanyConfig((prev) => ({
                ...(prev || {}),
                ReportHeader: response.data.ReportHeader
            }));

            return { success: true, data: response.data };
        } catch (error) {
            console.error('Error uploading company logo:', {
                message: error.message,
                response: error.response,
                config: error.config
            });

            const message =
                error.response?.data?.error ||
                error.message ||
                'Failed to upload company logo';

            setError(message);
            return { success: false, error: message };
        } finally {
            setIsSaving(false);
        }
    }

    useEffect(()=> {
        getCompanyConfig()
    }, []);

    return {
        companyConfig,
        isLoading,
        isSaving,
        error,
        refreshCompanyConfig: getCompanyConfig,
        saveCompanyConfig,
        uploadCompanyLogo
    }
}