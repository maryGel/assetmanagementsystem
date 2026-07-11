// Utils/Toast.jsx
import { useEffect, useState } from 'react'; // ✅ Added useState

// Mobile Toast
const Toast = ({ show, message, type, onClose, duration = 5000 }) => {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(onClose, duration);
            return () => clearTimeout(timer);
        }
    }, [show, onClose, duration]);

    if (!show) return null;

    return (
        <div className={`fixed top-20 right-4 z-[10000000] px-4 text-sm py-2 shadow-lg animate-slide-in-right ${
            type === 'success' ? 'bg-green-200 text-green-700' : 
            type === 'warning' ? 'bg-yellow-200 text-yellow-700' : 
            'bg-red-500 text-white'
        }`}>
            {message}
        </div>
    );
};

// Desktop Toast

export const ToastDesktop = ({ show, message, type = 'info', onClose, duration = 5000 }) => {
    const [visible, setVisible] = useState(show);

    useEffect(() => {
        setVisible(show);
    }, [show]);

    useEffect(() => {
        if (visible) {
            const timer = setTimeout(() => {
                setVisible(false);
                onClose?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [visible, duration]); // ✅ Remove onClose from dependencies

    if (!visible) return null;

    const colors = {
        success: 'bg-green-600 text-white',
        warning: 'bg-yellow-500 text-white',
        error: 'bg-red-600 text-white',
        info: 'bg-blue-600 text-white'
    };

    const icons = {
        success: '✓',
        warning: '⚠',
        error: '✕',
        info: 'ℹ'
    };

    return (
        <div className="fixed top-20 right-4 z-[10000000] animate-slide-in-right">
            <div className={`flex items-center px-4 py-3 rounded-lg shadow-lg min-w-[300px] max-w-[500px] ${colors[type] || colors.info}`}>
                <span className="mr-2 text-lg font-bold">{icons[type] || icons.info}</span>
                <span className="flex-1 text-sm font-medium">{message}</span>
                <button 
                    onClick={() => { 
                        setVisible(false); 
                        onClose?.(); 
                    }} 
                    className="ml-4 opacity-70 hover:opacity-100"
                >
                    ✕
                </button>
            </div>
        </div>
    );
};
// Default export for mobile Toast (backward compatibility)
export default Toast;