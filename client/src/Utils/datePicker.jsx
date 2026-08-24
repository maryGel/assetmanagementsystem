import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
// MUI
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';

export const getDefaultLast30Days = () => {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  return { startDate: start, endDate: end };
};

const getPresetDates = (presetId) => {
  const today = new Date();
  const endOfToday = new Date(today);
  endOfToday.setHours(23, 59, 59, 999);
  
  switch(presetId) {
    case 'today': {
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      return [startOfToday, endOfToday];
    }
    
    case 'this-month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      lastDay.setHours(23, 59, 59, 999);
      return [firstDay, lastDay];
    }
    
    case 'last-7': {
      const last7Start = new Date(today);
      last7Start.setDate(last7Start.getDate() - 7);
      last7Start.setHours(0, 0, 0, 0);
      return [last7Start, endOfToday];
    }
    
    case 'last-30': {
      const last30Start = new Date(today);
      last30Start.setDate(last30Start.getDate() - 30);
      last30Start.setHours(0, 0, 0, 0);
      return [last30Start, endOfToday];
    }
    
    case 'last-60': {
      const last60Start = new Date(today);
      last60Start.setDate(last60Start.getDate() - 60);
      last60Start.setHours(0, 0, 0, 0);
      return [last60Start, endOfToday];
    }
    
    case 'last-90': {
      const last90Start = new Date(today);
      last90Start.setDate(last90Start.getDate() - 90);
      last90Start.setHours(0, 0, 0, 0);
      return [last90Start, endOfToday];
    }
    
    default:
      return [null, null];
  }
};

const HistoryDatePicker = ({ onDateRangeChange, initialPreset = 'last-30', includeAllPeriods = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(initialPreset);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  const dropdownRef = useRef(null);
  const isInitialMount = useRef(true);

  const options = useMemo(() => [
    ...(includeAllPeriods ? [{ id: 'all', label: 'All Periods' }] : []),
    { id: 'today', label: 'Today' },
    { id: 'this-month', label: 'This Month' },
    { id: 'last-7', label: 'Last 7 Days' },
    { id: 'last-30', label: 'Last 30 Days' },
    { id: 'last-60', label: 'Last 60 Days' },
    { id: 'last-90', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' }
  ], [includeAllPeriods]);

  const safeOnDateRangeChange = useCallback((range) => {
    if (onDateRangeChange && typeof onDateRangeChange === 'function') {
      onDateRangeChange(range);
    }
  }, [onDateRangeChange]);

  // Initialize with default preset
  useEffect(() => {
    const option = options.find(opt => opt.id === initialPreset);
    if (option && option.id !== 'custom') {
      const [start, end] = getPresetDates(option.id);
      setStartDate(start);
      setEndDate(end);
      setDisplayText(option.label);
      // Only call on mount if it's the initial render
      if (isInitialMount.current) {
        safeOnDateRangeChange({ startDate: start, endDate: end });
        isInitialMount.current = false;
      }
    } else {
      setDisplayText('Select Range');
    }
  }, [initialPreset, options, safeOnDateRangeChange]);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionSelect = (option) => {
    setSelectedOption(option.id);
    setDisplayText(option.label);
    setIsOpen(false);
    
    if (option.id !== 'custom') {
      const [start, end] = getPresetDates(option.id);
      setStartDate(start);
      setEndDate(end);
      // Clear custom date inputs
      setDateRange({ startDate: '', endDate: '' });
      
      safeOnDateRangeChange({ startDate: start, endDate: end });
    } else {
      setStartDate(null);
      setEndDate(null);
      setDateRange({ startDate: '', endDate: '' });
      // Don't call onDateRangeChange yet - wait for user to select dates
    }
  };

  // Handle date range changes
  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Parse dates and update
    if (field === 'startDate') {
      const start = value ? new Date(value) : null;
      const end = dateRange.endDate ? new Date(dateRange.endDate) : null;
      setStartDate(start);
      if (start && end) {
        const displayStart = start.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        const displayEnd = end.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        setDisplayText(`${displayStart} - ${displayEnd}`);
        safeOnDateRangeChange({ startDate: start, endDate: end });
      } else if (start) {
        // Only start date is set, update display
        const displayStart = start.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        setDisplayText(`${displayStart} - Select End Date`);
      }
    } else if (field === 'endDate') {
      const end = value ? new Date(value) : null;
      const start = dateRange.startDate ? new Date(dateRange.startDate) : null;
      setEndDate(end);
      if (start && end) {
        const displayStart = start.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        const displayEnd = end.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        setDisplayText(`${displayStart} - ${displayEnd}`);
        safeOnDateRangeChange({ startDate: start, endDate: end });
      } else if (end) {
        // Only end date is set, update display
        const displayEnd = end.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
        setDisplayText(`Select Start Date - ${displayEnd}`);
      }
    }
  };

  // Clear date range filter
  const clearDateRange = () => {
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setStartDate(null);
    setEndDate(null);
    setSelectedOption('custom');
    setDisplayText('Custom Range');
    // Pass null to indicate clearing
    safeOnDateRangeChange({ startDate: null, endDate: null });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getDateRangeDisplay = () => {
    if (selectedOption === 'custom' && startDate && endDate) {
      return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    }
    return displayText;
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2 font-sans">
      {/* Preset Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center justify-between gap-2 px-3 py-1.5 text-sm 
            bg-white border border-gray-300 rounded-lg 
            hover:border-blue-400 hover:shadow-sm 
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            min-w-[140px]
            ${isOpen ? 'border-blue-400 ring-2 ring-blue-200' : ''}
          `}
        >
          <span className="text-gray-700">{getDateRangeDisplay()}</span>
          <span className="text-gray-400">
            {isOpen ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 min-w-[150px] bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {options.map((option, index) => (
              <div
                key={option.id}
                onClick={() => handleOptionSelect(option)}
                className={`
                  px-3 py-2 cursor-pointer text-sm transition-colors duration-150
                  ${selectedOption === option.id ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}
                  ${index !== options.length - 1 ? 'border-b border-gray-100' : ''}
                `}
              >
                {option.label}
                {selectedOption === option.id && (
                  <span className="ml-2 text-blue-400">✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Date Range Filter - Only shows when Custom Range is selected */}
      {selectedOption === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Start Date"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="End Date"
            />
          </div>
          {(dateRange.startDate || dateRange.endDate) && (
            <button
              onClick={clearDateRange}
              className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Quick stats - Only shows for presets, not custom */}
      {/* {startDate && endDate && selectedOption !== 'custom' && (
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-50">
          <span className="text-sm text-gray-500">
            {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} days
          </span>
        </div>
      )} */}
    </div>
  );
};

export default HistoryDatePicker;
