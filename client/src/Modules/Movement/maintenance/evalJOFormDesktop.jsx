import { useState, useMemo, useCallback, useEffect } from 'react';
// MUI
import { CircularProgress, Snackbar, Alert } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CloseIcon from '@mui/icons-material/Close';
// Custom Utils
import HistoryDatePicker from '../../../Utils/datePicker';
import DateDisplay from '../../../Utils/formatDateForInput';
import { evalStatus } from '../../../Utils/filters';
// Components
import EvalJO from '../maintenance/evalJO';

const getDefaultLast30Days = () => {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);

  return { startDate: start, endDate: end };
};

function EvalJOFormDesktop({
  joHeaders,
  joDetails,
  joRefresh,
  joDetailsRefresh,
  isLoading: externalLoading = false,
  error: externalError = null,
  snackbar,
  showToast, 
  handleSnackbarClose,
  initialFilter = 'Pending',
  initialDatePreset = 'last-30'
}) {
  // ALL HOOKS AT THE TOP
  const [filter, setFilter] = useState(initialFilter);
  const [dateRange, setDateRange] = useState(() => {
    if (initialDatePreset === 'all') {
      return { startDate: null, endDate: null };
    }

    const savedRange = localStorage.getItem('evalDateRange');
    if (savedRange) {
      try {
        const parsed = JSON.parse(savedRange);
        if (parsed.startDate && parsed.endDate) {
          return {
            startDate: new Date(parsed.startDate),
            endDate: new Date(parsed.endDate)
          };
        }
      } catch (e) {
        console.warn('Failed to parse saved date range:', e);
      }
    }
    return getDefaultLast30Days();
  });
  
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isClosingJO, setIsClosingJO] = useState(false);
  const [selectedJO, setSelectedJO] = useState(null);
  const [isLoading, setIsLoading] = useState(externalLoading);
  const [refreshError, setRefreshError] = useState(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard links intentionally override the saved range so every pending
  // evaluation is visible, regardless of when the job order was created.
  useEffect(() => {
    setFilter(initialFilter);
    if (initialDatePreset === 'all') {
      setDateRange({ startDate: null, endDate: null });
    }
  }, [initialFilter, initialDatePreset]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Save date range to localStorage whenever it changes
  useEffect(() => {
    if (dateRange?.startDate && dateRange?.endDate) {
      localStorage.setItem('evalDateRange', JSON.stringify({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString()
      }));
    }
  }, [dateRange]);

  // Clear selected JO when filter changes and reset to page 1
  useEffect(() => {
    setSelectedJO(null);
    setIsClosingJO(false);
    setCurrentPage(1);
  }, [filter]);

  // Reset to page 1 when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Helper function to check if item is evaluated
  const isItemEvaluated = useCallback((item) => {
    return item.eval_status !== null && 
           item.eval_status !== undefined && 
           item.eval_status !== '';
  }, []);

  // useCallback hook for evaluation completion
  const handleEvaluationComplete = useCallback(async () => {
    console.log('Evaluation completed, refreshing data...');
    setIsLoading(true);
    setRefreshError(null);
    
    try {
      if (joRefresh && joDetailsRefresh) {
        await Promise.all([
          joDetailsRefresh(),
          joRefresh()
        ]);
        console.log('Data refreshed successfully');
        showToast('Data refreshed successfully', 'success');
        setSelectedJO(null);
        setIsClosingJO(false);
      } else {
        console.warn('Refresh functions not available');
        showToast('Refresh functions not available', 'warning');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      setRefreshError('Failed to refresh data after evaluation. Please try manual refresh.');
      showToast('Failed to refresh data after evaluation', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [joRefresh, joDetailsRefresh, showToast]);

  const handleRefresh = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setIsLoading(true);
    setRefreshError(null);
    try {
      if (joRefresh && joDetailsRefresh) {
        await Promise.all([
          joRefresh(),
          joDetailsRefresh()
        ]);
        console.log('Manual refresh successful');
        showToast('Data refreshed successfully', 'success');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      setRefreshError('Failed to refresh data. Please try again.');
      showToast('Failed to refresh data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [joRefresh, joDetailsRefresh, showToast]);

  // Filtering logic
  const statusFilteredJO = useMemo(() => {
    console.log('=== FILTERING JOs for:', filter, '===');
    const filtered = joHeaders.filter((jo) => {
      if (jo.xpost !== 1) return false;
      const joItems = joDetails?.filter((detail) => detail.JO_No === jo.JO_No) || [];
      if (joItems.length === 0) return false;
      
      const allItemsEvaluated = joItems.every((item) => {
        return item.eval_status !== null && 
               item.eval_status !== undefined && 
               item.eval_status !== '';
      });

      if (filter === 'Completed') return allItemsEvaluated;
      if (filter === 'Pending') return !allItemsEvaluated;
      return false;
    });
    
    console.log(`Total ${filter} JOs after filtering: ${filtered.length}`);
    return filtered;
  }, [joHeaders, joDetails, filter]);

  

  // Search filtering
  const searchedJO = useMemo(() => {
  if (!searchQuery.trim()) {
    return statusFilteredJO;
  }

  const query = searchQuery.toLowerCase().trim();

  return statusFilteredJO.filter((jo) => {
    return (
      jo.JO_No?.toLowerCase().includes(query) ||
      jo.Remarks?.toLowerCase().includes(query) ||
      jo.Department_Code?.toLowerCase().includes(query) ||
      jo.Description?.toLowerCase().includes(query)
    );
  });
}, [statusFilteredJO, searchQuery]);

  const filteredJO = useMemo(() => {
    // If user is searching, ignore ALL filters (date, status) and search across everything
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // Search across ALL JOs (both pending and completed) without date or status filters
      return joHeaders.filter((jo) => {
        if (jo.xpost !== 1) return false;
        
        // Check if JO has items
        const joItems = joDetails?.filter((detail) => detail.JO_No === jo.JO_No) || [];
        if (joItems.length === 0) return false;
        
        // Search across JO fields
        return (
          jo.JO_No?.toLowerCase().includes(query) ||
          jo.Remarks?.toLowerCase().includes(query) ||
          jo.Department_Code?.toLowerCase().includes(query) ||
          jo.Description?.toLowerCase().includes(query)
        );
      });
    }

    // If not searching, apply date and status filters normally
    if (!dateRange?.startDate || !dateRange?.endDate) {
      return statusFilteredJO;
    }

    const start = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
    const end = new Date(dateRange.endDate).setHours(23, 59, 59, 999);

    return statusFilteredJO.filter((jo) => {
      const joDate = new Date(jo.xDate).getTime();
      return joDate >= start && joDate <= end;
    });
  }, [joHeaders, joDetails, statusFilteredJO, dateRange, searchQuery]);

  const sortedFilteredJo = useMemo(() => {
    if (!filteredJO) return [];
    return [...filteredJO].sort((a, b) => b.JO_No.localeCompare(a.JO_No));
  }, [filteredJO]);

  // Pagination calculations
  const totalItems = sortedFilteredJo.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Ensure current page is within valid range
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  // Get current page items
  const currentItems = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    return sortedFilteredJo.slice(startIndex, endIndex);
  }, [sortedFilteredJo, validCurrentPage, itemsPerPage, totalItems]);

  // Page change handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Optional: Scroll to top of list
      const listContainer = document.getElementById('jo-list-container');
      if (listContainer) {
        listContainer.scrollTop = 0;
      }
    }
  };

  const handleItemsPerPageChange = (e) => {
    const newValue = parseInt(e.target.value, 10);
    setItemsPerPage(newValue);
  };

  // Generate page numbers for display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, validCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  };

  // Search handlers
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    // Focus the search input after clearing
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleOptionsOpen = () => {
    setIsOptionsOpen((prev) => !prev);
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setCurrentPage(1); // Reset to page 1 when date range changes
    showToast('Date range updated', 'info');
  };

  const handleOpenJo = (header) => {
    setSelectedJO(header);
    setIsClosingJO(false);
  };

  const handleClosePage = () => {
    setIsClosingJO(true);
  };

  const handleAnimationEnd = () => {
    if (isClosingJO) {
      setSelectedJO(null);
      setIsClosingJO(false);
    }
  };

  const getItemsByJONo = (JO_No) => {
    return joDetails?.filter((detail) => detail.JO_No === JO_No) || [];
  };

  if (isLoading) {
    return (
      <>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          sx={{ 
            zIndex: 999999,
            position: 'fixed',
            bottom: '24px !important',
            right: '24px !important',
          }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            variant="filled"
            sx={{ 
              width: '100%',
              minWidth: '350px',
              maxWidth: '500px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
              fontSize: '15px',
              padding: '12px 20px',
              borderRadius: '8px',
            }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <CircularProgress />
            <span className="block mt-3 text-sm text-gray-500">
              Loading job orders...
            </span>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{ 
          zIndex: 999999,
          position: 'fixed',
          bottom: '24px !important',
          right: '24px !important',
        }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ 
            width: '100%',
            minWidth: '350px',
            maxWidth: '500px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            fontSize: '15px',
            padding: '12px 20px',
            borderRadius: '8px',
            '& .MuiAlert-icon': {
              fontSize: '22px'
            },
            '& .MuiAlert-message': {
              padding: '4px 0'
            }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <div className="flex flex-col h-full">
      
      {/* Toolbar */}
  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-200">
    {/* Left side: Status Filters */}
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap gap-1 border rounded-full">
        {evalStatus.map((item) => (
          <button
            key={item.id}
            onClick={() => setFilter(item.status)}
            className={`
              px-4 py-1.5 text-xs font-medium rounded-full transition-all
              ${
                filter === item.status
                  ? 'text-white bg-blue-600 shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }
            `}
          >
            <div className="flex items-center gap-1.5">
              {item.icon}
              <span>{item.status}</span>
            </div>
          </button>
        ))}
      </div>
    </div>

  {/* Right side: Search + Actions */}
    <div className="flex items-center gap-2">
      {/* Search Field */}
      <div className="relative flex items-center">
        <div className="absolute text-gray-400 left-3">
          <SearchIcon fontSize="small" />
        </div>
        <input
          id="search-input"
          type="text"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search here"
          className="w-36 py-1.5 pl-9 pr-8 text-sm transition-colors border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:w-48"
          autoComplete="off"
        />
        {searchQuery && (
          <button
            onClick={handleClearSearch}
            className="absolute text-gray-400 transition-colors right-2 hover:text-gray-600"
            aria-label="Clear search"
          >
            <CloseIcon fontSize="small" />
          </button>
        )}
      </div>

      <div className="w-px h-6 bg-gray-300" />
      
      <button
        onClick={handleOptionsOpen}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors
          ${
            isOptionsOpen
              ? 'bg-blue-100 text-blue-600'
              : 'hover:bg-gray-100 text-gray-600'
          }
        `}
      >
        <TuneIcon fontSize="small" />
        <span>Filter</span>
      </button>
      
      <button
        onClick={handleRefresh}
        className="p-1.5 text-gray-600 transition-colors rounded-full hover:bg-gray-100"
        title="Refresh"
      >
        <RefreshIcon fontSize="small" />
      </button>
    </div>
  </div>

  {/* Filter Panel */}
  {isOptionsOpen && (
    <div className="py-3 mt-2 border-b border-gray-200 rounded-lg bg-gray-50/80">
      <HistoryDatePicker
        onDateRangeChange={handleDateRangeChange}
        initialPreset={initialDatePreset}
        includeAllPeriods={initialDatePreset === 'all'}
      />
    </div>
  )}

  {/* Filter Summary */}
  {(filter !== 'All' || dateRange || searchQuery) && (
    <div className="px-4 py-2 mt-3 text-xs text-gray-600 border border-blue-100 rounded-lg bg-blue-50">
      <div className="flex flex-wrap items-center gap-3">
        {searchQuery ? (
          // When searching, show that date filter is ignored
          <span>
            Search: <strong>"{searchQuery}"</strong> 
          </span>
        ) : (
          // Normal filter display
          <>
            <span>
              Date: <strong>
                {dateRange?.startDate && dateRange?.endDate
                  ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                  : 'All Periods'}
              </strong>
            </span>
            <span>|</span>
            <span>
              Filter: <strong>{filter}</strong>
            </span>
          </>
        )}
        <span>|</span>
        <span>
          Results: <strong>{totalItems}</strong>
        </span>
        <span>|</span>
        <span>
          Showing: <strong>{currentItems.length}</strong> of <strong>{totalItems}</strong>
        </span>
      </div>
    </div>
  )}

  {/* Refresh Error Display */}
  {refreshError && (
    <div className="px-4 py-2 mt-2 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50">
      <span className="font-medium">⚠️ Error: </span>
      {refreshError}
      <button
        onClick={() => setRefreshError(null)}
        className="ml-4 text-red-600 hover:text-red-800"
      >
        Dismiss
      </button>
    </div>
  )}

        {/* Job Orders List - Half Width on desktop, stacked on tablet/mobile */}
        <div className='grid grid-cols-1 gap-2 lg:grid-cols-[28rem_1fr] xl:grid-cols-[32rem_1fr]'>
          <div className="w-full min-w-0 p-2 mt-8 overflow-y-auto" id="jo-list-container">
            {currentItems.length === 0 ? (
              <div className="flex justify-center h-full">
                <div className="text-center text-gray-500">
                  <p className="text-lg font-medium">No job orders found</p>
                  <p className="text-sm">Try adjusting your filters or search</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-full">
                  {currentItems.map((header) => {
                    const items = getItemsByJONo(header.JO_No);
                    const evaluatedCount = items.filter(item => 
                      item.eval_status !== null && 
                      item.eval_status !== undefined && 
                      item.eval_status !== ''
                    ).length;
                    const isFullyEvaluated = items.length > 0 && evaluatedCount === items.length;
                    
                    // Highlight matching text in JO_No
                    const highlightText = (text, query) => {
                      if (!query || !text) return text;
                      const parts = text.split(new RegExp(`(${query})`, 'gi'));
                      return parts.map((part, index) => 
                        part.toLowerCase() === query.toLowerCase() ? 
                          <span key={index} className="font-medium bg-yellow-200">{part}</span> : 
                          part
                      );
                    };

                    return (
                      <div
                        key={header.ID}
                        className="flex justify-between w-full gap-2 p-3 transition-colors border-b cursor-pointer hover:bg-gray-50"
                        onClick={() => handleOpenJo(header)}
                      >
                        <div className="flex flex-col justify-between text-sm">
                          <div className="flex items-center gap-3">
                              <span className="font-semibold text-blue-600">
                                {searchQuery ? highlightText(header.JO_No, searchQuery) : header.JO_No}
                              </span>
                              <span className="text-xs text-gray-500">
                                {isFullyEvaluated ? (
                                  <span className="text-green-600">✓ Fully Evaluated ({items.length}) item/s</span>
                                ) : (
                                  <span className="text-amber-600">{evaluatedCount}/{items.length} evaluated</span>
                                )}
                              </span>
                          </div>
                          <div className="flex gap-3 pl-3 mt-1 text-xs text-gray-500">
                            <span><DateDisplay value={header.xDate} format="short" /></span>
                            <span>{header.Department_Code}</span>
                          </div>
                          <div className="flex gap-3 pl-3">
                            <span className="mt-1 italic text-gray-700 line-clamp-1">
                              {header.Remarks || 'No remarks'}
                            </span>
                          </div>
                        </div>
                          
                        <div className="justify-center w-8 h-8 ml-4 text-blue-600 transition-colors rounded-full group-hover:bg-blue-50">                      
                          <ArrowForwardIcon fontSize="small" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-3 mt-4 border-t border-gray-200">
                  {/* Left side: Items per page selector and info */}
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <label htmlFor="itemsPerPage" className="text-gray-600">
                        Show:
                      </label>
                      <select
                        id="itemsPerPage"
                        value={itemsPerPage}
                        onChange={handleItemsPerPageChange}
                        className="px-2 py-1 border border-gray-300 rounded-md outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>
                    <span className="hidden sm:inline">
                      {totalItems > 0 ? (
                        <>Showing {(validCurrentPage - 1) * itemsPerPage + 1} to {Math.min(validCurrentPage * itemsPerPage, totalItems)} of {totalItems}</>
                      ) : (
                        <>No items to display</>
                      )}
                    </span>
                  </div>

                  {/* Right side: Pagination buttons */}
                  <div className="flex items-center gap-2">
                    {/* Previous button */}
                    <button
                      onClick={() => handlePageChange(validCurrentPage - 1)}
                      disabled={validCurrentPage === 1}
                      className={`
                        p-1.5 rounded-md transition-colors
                        ${validCurrentPage === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }
                      `}
                      aria-label="Previous page"
                    >
                      <ChevronLeftIcon fontSize="small" />
                    </button>

                    {/* Page numbers */}
                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`
                            min-w-[32px] h-8 px-2 text-sm font-medium rounded-md transition-colors
                            ${pageNum === validCurrentPage
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-600 hover:bg-gray-100'
                            }
                          `}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    {/* Next button */}
                    <button
                      onClick={() => handlePageChange(validCurrentPage + 1)}
                      disabled={validCurrentPage === totalPages}
                      className={`
                        p-1.5 rounded-md transition-colors
                        ${validCurrentPage === totalPages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                        }
                      `}
                      aria-label="Next page"
                    >
                      <ChevronRightIcon fontSize="small" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className='flex min-w-0'>
            {/* Selected JO Detail View */}
            {selectedJO && (
              <EvalJO
                onClose={handleClosePage}
                onAnimationEnd={handleAnimationEnd}
                isClosingJO={isClosingJO}
                header={selectedJO}
                joDetails={joDetails}
                onEvaluationComplete={handleEvaluationComplete}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default EvalJOFormDesktop;
