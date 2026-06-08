import { useState, useMemo, useEffect } from 'react';
// MUI
import { Box, Stack, CircularProgress } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import SearchIcon from '@mui/icons-material/Search';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
// Custom Utils
import HistoryDatePicker from '../../Utils/datePicker';
import {getDefaultLast30Days} from '../../Utils/datePicker';
import {statusFilter} from '../../Utils/filters';
import SearchOverlay from '../../Utils/searchOverlay'
// Components
import MvAAForm from '../components/mvAAForm';
// Hooks
import { useAssetAccApproval } from '../../hooks/useAssetAccApproval';



function MvAssetAccPage({
    onClose,
    isClosing,
    onAnimationEnd,
    assetAccHeaders: initialDocHeaders = [],
    assetAccDetails: initialDocDetails = [],
    accHRefresh,
    accDRefresh,
    selectedUser,
    isLoading: externalLoading = false,
    error: externalError = null,
}){

    const [filter, setFilter] = useState('Waiting');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [dateRange, setDateRange] = useState(getDefaultLast30Days); //state for date range
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isSearchActive, setIsSearchActive] = useState(false);    
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedAA, setSelectedAA] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const assetAccHeaders = initialDocHeaders;
    const assetAccDetails = initialDocDetails;

    // Local state to manage data refresh
    const [isLoading, setIsLoading] = useState(externalLoading);
    const [error, setError] = useState(externalError);

    // Use the approval hook
    const { 
        canApprove,
        loading: approvalLoading 
    } = useAssetAccApproval();

    // Function to trigger refresh
    const handleRefresh = async () => {
    setIsLoading(true);

    try {
        await accHRefresh(); 
        await accDRefresh();
    } catch (err) {
        setError('Failed to refresh data');
    } finally {
        setIsLoading(false);
    }
    };

    const handleClosePage = () => {if(onClose) onClose()}; 

    const handleOptionsOpen = () => {
      setIsOptionsOpen(prev => !prev)
    };

    const handleDateRangeChange = (range) => {
      setDateRange(range);
    };

    const handleSearchClick = () => {
      setIsSearchOpen(true);
    };

    const handleSearchClose = () => {
      setIsSearchOpen(false);
    };

    const handleSelectAa = (aa) => {
      setSelectedDoc(aa);
      setIsSearchActive(true);
      setIsSearchOpen(false);
    };

    const handleClearSearch = () => {
      setSelectedDoc(null);
      setIsSearchActive(false);
    };

        // Triggered when user long-press a Accountability Form
    const handleEnterSelectionMode = (DocNo) => {
    setSelectionMode(true);
    if (!selectedAA.includes(DocNo)) {
        setSelectedAA([DocNo]); 
    }
    };

    // Toggle Select All
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedAA([]);
            setSelectAll(false);
        } else {
             const eligibleJOs = displayData
                .filter(aa => {
                    const canBeApproved = canApprove(aa);
                    return canBeApproved.canApprove;
                })
                .map(aa => aa.AAFNo);
            setSelectedAA(eligibleJOs);
            setSelectAll(true);
        }
    };

    const handleExitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedAA([]);
        setSelectAll(false);
    };

    // First, apply the status filter
    const statusFilteredAA = useMemo(() => {
      return assetAccHeaders.filter((aa) => {
        switch (filter) {
          case 'All':
            return true
          case 'Waiting':
            return aa.xPosted === 3 || aa.xPosted === 2;
          case 'Fully Approved':
            return aa.xPosted === 1;
          case 'Rejected':
            return aa.xPosted === 4 || aa.xPosted === 4;
          default:
            return true; // 'All' or any other value shows everything
        }
      });
    }, [assetAccHeaders, filter]);

    // Then, apply the date filter on top of the status-filtered data
    const filteredAA= useMemo(() => {
      // If no date range is selected, return all status-filtered data
      if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
        return statusFilteredAA;
      }

      const start = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate).setHours(23, 59, 59, 999);

      return statusFilteredAA.filter((aa) => {
        // Check multiple possible date fields
        const adDate = aa.xDate;
        
        // If no date field exists
        if (!adDate) return true;
        
        const adDateTime = new Date(adDate).getTime();
        return adDateTime >= start && adDateTime <= end;
      });
    }, [statusFilteredAA, dateRange]);

    // Final data: show selected Doc if search is active, otherwise show filtered data
    const displayData = useMemo(() => {
      if (isSearchActive && selectedDoc) {
        return [selectedDoc]; // Return as array to maintain compatibility with MvJOForm
      }
      return filteredAA;
    }, [isSearchActive, selectedDoc, filteredAA]);

    useEffect(() => {
      if (selectedAA.length === 0) {
          setSelectAll(false); // all unselected → uncheck Select All
      } else if (selectedAA.length === displayData.length) {
          setSelectAll(true);  // all selected → check Select All
      } else {
          setSelectAll(false); // partial selection → uncheck Select All
      }
    }, [selectedAA, displayData]);

    useEffect(() => {
      // Clear selection mode when data changes (after approval/rejection)
      if (selectionMode) {
        setSelectionMode(false);
        setSelectedAA([]);
        setSelectAll(false);
      }
    }, [assetAccHeaders]); // This will trigger when assetAccHeaders updates after approval

    // Show loading state
    if (isLoading) {
      return (
        <div 
          onAnimationEnd={onAnimationEnd}
          className={`fixed inset-0 z-50 w-full h-full overflow-y-auto bg-white shadow-xl ${
            isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'
          }`}
        >
          <div className="flex flex-col items-center justify-center min-h-full">
            <CircularProgress />
            <span className="mt-3 text-sm text-gray-500">
              {'Loading job orders...'}
            </span>
          </div>
        </div>
      );
    }

    return (
      <>
        <div 
          onAnimationEnd={onAnimationEnd}
          className={`fixed inset-0 z-50 w-full h-full overflow-y-auto bg-white shadow-xl 
          ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
        >
          <div className="flex flex-col ">
            <Box 
              sx={{ 
                p: 2,
                pt: 3,
                overflow: 'auto', 
                borderBottom: 1, 
                borderColor: 'grey.300', 
                position: 'sticky', 
                top: 0, 
                bgcolor: '#fafafa',
                zIndex: 10      
              }}
            >
              <Stack
                direction="row" 
                minWidth= 'max-content'
                spacing={1.5}
                sx={{
                  justifyContent: 'flex-start',
                  px: 1,
                  overflowX: 'auto',
                  alignItems: 'center'
                }}              
              >
                <div className="flex items-center gap-2">
                  <button className='w-5' onClick={handleClosePage}> 
                    <ArrowBackIosIcon fontSize='small'/>
                  </button>
                  <button 
                    className='w-5 transition-colors hover:text-blue-600'
                    onClick={handleSearchClick}
                    title="Search Job Order"
                  >
                    <SearchIcon/>
                  </button>
                </div>
                            
                <div className="flex gap-1">
                  {statusFilter.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                          setFilter(item.status);
                          if (isSearchActive) {
                              handleClearSearch();
                          }
                      }}
                      className={`px-2 py-0.5 text-sm border rounded-2xl transition-colors whitespace-nowrap ${
                          filter === item.status && !isSearchActive
                              ? 'text-slate-900 font-semibold border-slate-900' 
                              : 'bg-white text-slate-600 border-slate-400'
                      }`}
                    >
                      <span>{item.icon}</span>
                      <span className='pl-1 text-xs tracking-wide'>{item.status}</span>
                    </button>
                    ))}
                </div>
              </Stack>
            </Box>
            
            {!isSearchActive && (
              <>
                <div className='grid-cols-1 py-2'>
                  <div className='flex items-center justify-between px-4 text-sm font-semibold tracking-wide'>
                    <span>Asset Accountability</span>
                    <div className='flex'>
                      <button 
                        onClick={handleOptionsOpen}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md transition-colors ${
                            isOptionsOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'
                        }`}
                      >
                        <TuneIcon fontSize='small' />
                        <span className='text-xs'>Filter</span>
                      </button>
                      <button 
                        onClick={handleRefresh}
                        className="p-1 transition-colors rounded-full hover:bg-gray-100"
                        title="Refresh"
                      >
                        <RefreshIcon />
                      </button>
                    </div>
                  </div>
                    
                    {isOptionsOpen && (
                        <div className='flex m-1 border-t border-b bg-gray-50'>
                            <HistoryDatePicker onDateRangeChange={handleDateRangeChange} />
                        </div>
                    )}
                </div>

                {(filter !== 'All' || dateRange) && (
                  <div className='px-4 py-2 text-xs text-gray-600 border-blue-100 bg-blue-50 border-y'>
                    <div className='flex items-center gap-2'>
                      {dateRange?.startDate && dateRange?.endDate && (
                        <>
                          <span>|</span>
                          <span>
                            Date: <strong>
                                {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
                            </strong>
                          </span>
                        </>
                      )}
                      <span>|</span>
                      <span>Results: <strong>{displayData.length}</strong></span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Search Active Indicator */}
            {isSearchActive && selectedDoc && (
              <div className='px-4 py-2 text-xs text-blue-600 border-blue-100 bg-blue-50 border-y'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <SearchIcon fontSize='small' />
                    <span>Search Results: <strong>{selectedDoc.AAFNo}</strong></span>
                  </div>
                  <button
                    onClick={handleClearSearch}
                    className='text-xs text-blue-600 underline hover:text-blue-800'
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
            
            {isLoading 
              ? (<div className='flex justify-center p-8'>Loading...</div>) 
              : error ? (<div className='p-4 m-4 text-red-500 bg-red-100 rounded'>{error}</div>) 
              : displayData.length > 0
              ? <div className='flex flex-col gap-4 mt-2'>
                  <MvAAForm
                    useProps={null}
                    filteredAA = {displayData}
                    assetAccDetails = {assetAccDetails}
                    assetAccHeaders = {assetAccHeaders}
                    isLoading={isLoading}
                    error={error}
                    selectedUser={selectedUser}   
                    accHRefresh={accHRefresh}        
                    accDRefresh={accDRefresh}     
                    selectionMode={selectionMode}
                    selectedAA={selectedAA}
                    setSelectedAA={setSelectedAA} 
                    onEnterSelectionMode={handleEnterSelectionMode}        
                    onExitSelectionMode={handleExitSelectionMode}
                    onSelectAll={handleSelectAll} 
                    selectAll={selectAll}     
                  />
                </div>
              : (
                <span className='flex justify-center p-5 text-sm italic item-center text-slate-500'>
                  {isSearchActive 
                    ? 'No Accountability Form record found with that number.' 
                    : 'No record found within the selected date.'}
                </span>
              )}               
          </div>            
        </div>   
        {/* Search Overlay */}
        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={handleSearchClose}
          docHeaders={assetAccHeaders}
          onSelectDoc={handleSelectAa}
        />       
      </>
    )
}

export default MvAssetAccPage;