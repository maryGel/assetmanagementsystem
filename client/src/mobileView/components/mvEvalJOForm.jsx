import {useState, useMemo} from 'react';
// MUI
import { CircularProgress } from '@mui/material';
import TuneIcon from '@mui/icons-material/Tune';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
// Custom Utils
import HistoryDatePicker from '../../Utils/datePicker';
import DateDisplay from '../../Utils/formatDateForInput';
import {evalStatus} from '../../Utils/filters';
//Components
import MvEvalJO from './mvEvalJO';
import SearchOverlay from '../../Utils/searchOverlay'; // Import the SearchOverlay component

const getDefaultLast30Days = () => {
  const today = new Date();
  const end = new Date(today);
  end.setHours(23, 59, 59, 999);

  const start = new Date(today);
  start.setDate(start.getDate() - 29); // 30 days total
  start.setHours(0, 0, 0, 0);

  return { startDate: start, endDate: end };
};

function MvEvalJOForm({  
    onClose,
    onAnimationEnd,
    isClosing,
    joHeaders,
    joDetails,
    joRefresh,
    joDetailsRefresh,
    isLoading: externalLoading = false,
    error: externalError = null,
}){
    const [filter, setFilter] = useState('Pending');
    const [dateRange, setDateRange] = useState(getDefaultLast30Days); 
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [isClosingJO, setIsClosingJO] = useState(false);
    const [selectedJO, setSelectedJO] = useState(null);
    const [isSearchOpen, setIsSearchOpen] = useState(false); // State for search overlay

        // Local state to manage data refresh
    const [isLoading, setIsLoading] = useState(externalLoading);
    const [error, setError] = useState(externalError);

        // Function to trigger refresh
    const handleRefresh = async () => {
    setIsLoading(true);

    try {
        await joRefresh(); 
        await joDetailsRefresh();
    } catch (err) {
        setError('Failed to refresh data');
    } finally {
        setIsLoading(false);
    }
    };

     // First, apply the status filter
    const statusFilteredJO = useMemo(() => {
      return joHeaders.filter((jo) => {
        if(filter === 'Completed') {
          return jo.xpost === 1 && jo.eval_status;
        };
        
        if(filter === 'Pending'){
          return jo.xpost === 1 && !jo.eval_status; 
        }
        return false;
      });
    }, [joHeaders, filter]);

    // Then, apply the date filter on top of the status-filtered data
    const filteredJO = useMemo(() => {
      // If no date range is selected, return all status-filtered data
      if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
        return statusFilteredJO;
      }

      const start = new Date(dateRange.startDate).setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate).setHours(23, 59, 59, 999);

      return statusFilteredJO.filter((jo) => {
        // Check multiple possible date fields
        const joDate = jo.xDate;
        // console.log(`joDate: ${joDate}`)
        
        // If no date field exists, include it (or exclude based on your needs)
        if (!joDate) return null;
        
        const joDateTime = new Date(joDate).getTime();
        return joDateTime >= start && joDateTime <= end;
      });
    }, [statusFilteredJO, dateRange]);

        // Sort the filteredJO array by date (latest first)
    const sortedFilteredJo = useMemo(() => {
        if (!filteredJO) return [];
        
        return [...filteredJO].sort((a, b) => {
            // Sort by JO number in descending order
            // This assumes JO numbers like DB-JO-0000007 (higher number = newer)
            return b.JO_No.localeCompare(a.JO_No);
        });
    }, [filteredJO]);

    // handle open date range selection
    const handleOptionsOpen = () => {
      setIsOptionsOpen(prev => !prev)
    };
    const handleDateRangeChange = (range) => {
      setDateRange(range);
    };

    // Handle animation end
    const handleOpenJo = (header) => {
      setSelectedJO(header);
    };
    // Handle closing a page
    const handleClosePage = () => {
        setIsClosingJO(true);
    };

    // Handle animation end
    const handleAnimationEnd = () => {
        if (isClosingJO) {
            setSelectedJO(null);
            setIsClosingJO(false);
        }
    };

    // Handle search overlay open/close
    const handleSearchOpen = () => {
      setIsSearchOpen(true);
    };

    const handleSearchClose = () => {
      setIsSearchOpen(false);
    };

    // Handle document selection from search
    const handleSelectDocument = (doc) => {
      setSelectedJO(doc);
    };
    
        // Filter functions
    const getItemsByJONo = (JO_No) => {
        return joDetails?.filter(detail => detail.JO_No === JO_No) || [];
    };

    if (isLoading) {
        return (
            <div 
                className={`fixed inset-0 z-50 w-full h-full overflow-y-auto bg-white shadow-xl `}
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
        <div className='flex flex-col justify-center gap-3' onAnimationEnd={onAnimationEnd}>

          <div className='flex flex-col'>
            
            <div className='flex items-center justify-between px-2 my-3 text-sm tracking-wide'>
              <div className='flex justify-center border rounded-full'>
                {evalStatus.map((item)=> (
                    <button
                      key={item.id}
                      onClick={() => setFilter(item.status)}
                      className={`px-3 text-sm py-1 rounded-2xl transition-colors whitespace-nowrap ${
                          filter === item.status 
                          ? 'text-white  bg-blue-700' 
                          : 'bg-white text-slate-600 '
                      }`}
                    >
                    <div className='flex items-center justify-center gap-1'>
                     {item.icon}
                      {/* <img className='w-4 h-4' src={item.icon}/> */}
                      <span>{item.status}</span>
                    </div>
                    </button>
                  ))}
              </div>
              <div className='flex gap-2 '>
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
                  onClick={handleSearchOpen}
                  className="p-1 transition-colors rounded-md hover:bg-gray-100"
                >
                  <SearchIcon />
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
              <div className='mt-2 border-t border-b bg-gray-50'>
                <HistoryDatePicker onDateRangeChange={handleDateRangeChange} />
              </div>
            )}
          </div>

          {/* Filter Summary - Optional but helpful */}
          {(filter !== 'All' || dateRange) && (
            <div className='px-4 py-2 text-xs text-gray-600 border-blue-100 bg-blue-50 border-y'>
              <div className='flex items-center gap-2'>
                {/* <span>Status: <strong>{filter}</strong></span> */}
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
                <span>Results: <strong>{filteredJO.length}</strong></span>
              </div>
            </div>
          )}          
        </div>  

        {/* Job orders List  */}

        <div className='mt-3 border-t'>
          {sortedFilteredJo?.map((header ) => {
            const items = getItemsByJONo(header.JO_No);
            return (
              <div 
                key={header.ID} 
                className='grid grid-cols-[1fr_2rem] gap-2 px-4 py-1 text-sm border-b'
                onClick={()=> {handleOpenJo(header)}}>
                <div className='flex flex-col h-auto '>
                  <div className='flex justify-between'>
                    <span className='font-semibold'>{header.JO_No} ({items.length})</span>
                    <span><DateDisplay value={header.xDate} format="short" /></span>
                  </div>
                  <span className='pl-2'>{header.Remarks}</span>
                  <span className='text-[10px] pl-2 text-slate-500'>{header.Department_Code}</span>
                </div>
                <div className='flex items-center w-4'>
                  <button className='p-2' >
                  <ArrowForwardIosIcon className='p-1 text-blue-800' fontSize='small'/>
                  </button>
                </div>
              </div>
            )
          })}
            {selectedJO &&
                (<MvEvalJO 
                  onClose={handleClosePage}
                  onAnimationEnd={handleAnimationEnd}
                  isClosingJO={isClosingJO}
                  header = {selectedJO}
                  joDetails = {joDetails}
                />)
            }
        </div>

        {/* Search Overlay */}
        <SearchOverlay
          isOpen={isSearchOpen}
          onClose={handleSearchClose}
          docHeaders={joHeaders}
          onSelectDoc={handleSelectDocument}
        />
      </>
    )
}

export default MvEvalJOForm;