import { useState, useEffect, useMemo } from 'react';
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
import SearchOverlay from '../../Utils/searchOverlay';
// Components
import MvTRForm from '../components/mvTRForm';
// Hooks
import { useTRApproval } from '../../hooks/useTRApproval';

function MvTransferPage({
    onClose,
    isClosing,
    onAnimationEnd,
    trHeaders: initialTrHeaders =[],
    trDetails: initialTrDetails =[],
    trHRefresh,
    trDRefresh,
    selectedUser,
    isLoading: externalLoading = false,
    error: externalError = null,
}){

    const [filter, setFilter] = useState('Waiting');
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [dateRange, setDateRange] = useState(getDefaultLast30Days);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedTR, setSelectedTR] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    
    const trHeaders = initialTrHeaders;
    const trDetails = initialTrDetails;

    // Local state to manage data refresh
    const [isLoading, setIsLoading] = useState(externalLoading);
    const [error, setError] = useState(externalError);
    
    // Use the approval hook
    const { 
        canApprove,
        loading: approvalLoading 
    } = useTRApproval();


    // Function to trigger refresh
    const handleRefresh = async () => {
        setIsLoading(true);

        try {
            await trHRefresh(); 
            await trDRefresh();
        } catch (err) {
            setError('Failed to refresh data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClosePage = () => {if (onClose) onClose()}; 

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

    const handleSelectTr = (tr) => {
        setSelectedDoc(tr);
        setIsSearchActive(true);
        setIsSearchOpen(false);
    };

    const handleClearSearch = () => {
        setSelectedDoc(null);
        setIsSearchActive(false);
    };

    // Triggered when user long-press a TR
    const handleEnterSelectionMode = (trNo) => {
        setSelectionMode(true);
        if (!selectedTR.includes(trNo)) {
            setSelectedTR([trNo]);
        }
    };

    // Toggle Select All - Only select documents that are eligible for approval
    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedTR([]);
            setSelectAll(false);
        } else {
            // Only select documents that are not fully approved and not disapproved
            const eligibleTRs = displayData
                .filter(tr => {
                    const canBeApproved = canApprove(tr);
                    return canBeApproved.canApprove;
                })
                .map(tr => tr.TR_No);
            setSelectedTR(eligibleTRs);
            setSelectAll(true);
        }
    };

    const handleExitSelectionMode = () => {
        setSelectionMode(false);
        setSelectedTR([]);
        setSelectAll(false);
    };


    // First, apply the status filter with multi-level support
    const statusFilteredTR = useMemo(() => {
        return trHeaders.filter((tr) => {
            if(filter === 'All') return true;
            
            if(filter === 'Waiting'){
                // Waiting includes: Not Started (xpost=3) and Partially Approved (xpost=2)
                return (tr.xpost === 3 || tr.xpost === 2) && tr.DISAPPROVED === 0; 
            }
            if(filter === 'Fully Approved'){
                return tr.xpost === 1 && tr.DISAPPROVED === 0;
            }
            if(filter === 'Rejected'){
                return (tr.xpost === 3 || tr.xpost === 2) && tr.DISAPPROVED === 1;
            }
            if(filter === 'Partially Approved'){
                return tr.xpost === 2 && tr.DISAPPROVED === 0;
            }
            return false;
        });
    }, [trHeaders, filter]);

    // Then, apply the date filter on top of the status-filtered data
    const filteredTR = useMemo(() => {
        if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
            return statusFilteredTR;
        }

        const start = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
        const end = new Date(dateRange.endDate).setHours(23, 59, 59, 999);

        return statusFilteredTR.filter((tr) => {
            const trDate = tr.xDate;
            if (!trDate) return true;        
            const trDateTime = new Date(trDate).getTime();
            return trDateTime >= start && trDateTime <= end;
        });
    }, [statusFilteredTR, dateRange]);

    // Final data: show selected Doc if search is active, otherwise show filtered data
    const displayData = useMemo(() => {
        if (isSearchActive && selectedDoc) {
            return [selectedDoc];
        }
        // Add computed fields to each TR without fetching
        return filteredTR.map(tr => ({
            ...tr,
            canBeApproved: canApprove(tr),
        }));
    }, [isSearchActive, selectedDoc, filteredTR,  canApprove]);

    useEffect(() => {
        if (selectedTR.length === 0) {
            setSelectAll(false);
        } else if (selectedTR.length === displayData.filter(tr => tr.canBeApproved?.canApprove).length) {
            setSelectAll(true);
        } else {
            setSelectAll(false);
        }
    }, [selectedTR, displayData]);

    useEffect(() => {
        // Clear selection mode when data changes (after approval/rejection)
        if (selectionMode) {
            setSelectionMode(false);
            setSelectedTR([]);
            setSelectAll(false);
        }
    }, [trHeaders]); // This will trigger when trHeaders updates after approval

    // Show loading state
    if (isLoading || approvalLoading) {
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
                        {'Loading transfers...'}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div onAnimationEnd={onAnimationEnd} className={`          
                fixed inset-0 z-50 items-start w-full max-h-screen overflow-y-auto shadow-xl bg-white  
                ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
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
                                    title="Search Transfer"
                                >
                                    <SearchIcon/>
                                </button>
                            </div>
                            <div className='flex gap-1'>
                                {statusFilter.map((item)=> (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setFilter(item.status);
                                            // Clear search when changing filters
                                            if (isSearchActive) {
                                                handleClearSearch();
                                            }
                                        }}
                                        className={`px-2 text-sm border py-0.5 rounded-2xl transition-colors whitespace-nowrap ${
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

                    {/* Date Range Filter - Hide when search is active */}
                    {!isSearchActive && (
                        <>
                            <div className='grid-cols-1 py-2'>
                                <div className='flex items-center justify-between px-4 text-sm font-semibold tracking-wide'>
                                    <span>Transfers</span>
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
                                    <div className='flex flex-wrap items-center gap-2'>
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
                                    <span>Search Results: <strong>{selectedDoc.TR_No}</strong></span>
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
                    
                    {error ? (
                        <div className='p-4 m-4 text-red-500 bg-red-100 rounded'>{error}</div>
                    ) : displayData.length > 0 ? (
                        <div className='flex flex-col gap-4 mt-2'>
                            <MvTRForm
                                useProps={null}
                                trHeaders={trHeaders}
                                trDetails={trDetails}
                                filteredTR={displayData}
                                isLoading={isLoading}
                                error={error}
                                selectedUser={selectedUser}  
                                trRefresh={trHRefresh} 
                                trDetailsRefresh={trDRefresh}            
                                selectionMode={selectionMode}
                                selectedTR={selectedTR}
                                setSelectedTR={setSelectedTR} 
                                onEnterSelectionMode={handleEnterSelectionMode}        
                                onExitSelectionMode={handleExitSelectionMode} 
                                onSelectAll={handleSelectAll} 
                                selectAll={selectAll}
                            />
                        </div>
                    ) : (
                        <span className='flex justify-center p-5 text-sm italic item-center text-slate-500'>
                            {isSearchActive 
                                ? 'No transfer record found with that number.' 
                                : 'No record found within the selected date.'}
                        </span>
                    )}    
                               
                </div>            
            </div>   
            {/* Search Overlay */}
            <SearchOverlay
                isOpen={isSearchOpen}
                onClose={handleSearchClose}
                docHeaders={trHeaders}
                onSelectDoc={handleSelectTr}
            />     
        </>
    )
}

export default MvTransferPage;