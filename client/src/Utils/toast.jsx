import { useEffect } from 'react';

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

export default Toast;