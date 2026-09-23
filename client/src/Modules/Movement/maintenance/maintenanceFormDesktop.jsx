import { useState, useMemo, useEffect, useCallback } from 'react';
// MUI
import { CircularProgress, Button, Select, MenuItem, FormControl, InputLabel, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import TuneIcon from '@mui/icons-material/Tune';

// Custom Utils
import DateDisplay from '../../../Utils/formatDateForInput';
import HistoryDatePicker from '../../../Utils/datePicker';
// Work Order / Expense / Disposal dialog flow, extracted so it can be reused
// wherever a Work Order needs to be opened (e.g. from the Line Item Report).
import WorkOrderDialog, { getStatusLabel } from './workOrderDialog';

// Get default last 30 days
const getDefaultLast30Days = () => {
    const today = new Date();
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    return { startDate: start, endDate: end };
};

const MAINTENANCE_STATUS_OPTIONS = [
    { value: 'Not Started', label: 'Not Started' },
    { value: 'Ongoing', label: 'Ongoing' },
    { value: 'Completed', label: 'Completed' }
];

const normalizeMaintenanceStatus = (status) => {
    const value = String(status || '').trim().toLowerCase();
    if (value === 'ongoing') return 'Ongoing';
    if (value === 'not-started' || value === 'not started' || value === '') return 'Not Started';
    if (value === 'done' || value === 'completed') return 'Completed';
    return status;
};

function MaintenanceFormDesktop({
    joHeaders,
    joDetails,
    joRefresh,
    joDetailsRefresh,
    updateJOHeader,
    updateJODetails,
    isLoading: externalLoading = false,
    initialDatePreset = 'last-30',
    initialStatuses = [],
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(externalLoading);
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [maintenanceStatuses, setMaintenanceStatuses] = useState(() =>
        initialStatuses.map(normalizeMaintenanceStatus).filter(Boolean)
    );

    // Date range state with localStorage persistence
    const [dateRange, setDateRange] = useState(() => {
        if (initialDatePreset === 'all') {
            return { startDate: null, endDate: null };
        }

        const savedRange = localStorage.getItem('maintenanceDateRange');
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

    // Dashboard links deliberately override the saved range/statuses to show
    // maintenance needing attention across all periods.
    useEffect(() => {
        setMaintenanceStatuses(initialStatuses.map(normalizeMaintenanceStatus).filter(Boolean));
        if (initialDatePreset === 'all') {
            setDateRange({ startDate: null, endDate: null });
        }
    }, [initialDatePreset, initialStatuses]);

    // Save date range to localStorage whenever it changes
    useEffect(() => {
        if (dateRange?.startDate && dateRange?.endDate) {
            localStorage.setItem('maintenanceDateRange', JSON.stringify({
                startDate: dateRange.startDate.toISOString(),
                endDate: dateRange.endDate.toISOString()
            }));
        }
    }, [dateRange]);

    // Pagination states for main table
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [selectedJO, setSelectedJO] = useState(null);

    // The Work Order dialog (with its nested Expense/Disposal dialogs) now
    // lives in its own component. This just tracks which JO header it's open
    // for; the dialog fetches/builds everything else itself.
    const [workOrderDialogTarget, setWorkOrderDialogTarget] = useState(null);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [searchTerm, dateRange, maintenanceStatuses]);

    // Opens the Work Order dialog in 'create' mode (jo has no workNo yet).
    const handleCreateWorkOrder = (jo) => {
        if (!jo) return;
        setWorkOrderDialogTarget(jo);
        setSelectedJO(null);
    };

    // Opens the Work Order dialog in 'edit' mode (jo already has a workNo).
    const handleEditWorkOrder = (jo) => {
        setWorkOrderDialogTarget(jo);
    };

    const handleSelectItem = (jo) => {
        const transNo = jo.JO_No;
        return window.open(`/assetMovement/pages/JOFormPage?docId=${transNo}`, '_blank');
    };

    const handleRefresh = async () => {
        setIsLoading(true);
        try {
            await joRefresh();
            await joDetailsRefresh();
        } finally {
            setIsLoading(false);
        }
    };

    // Handle date range change from HistoryDatePicker
    const handleDateRangeChange = useCallback((range) => {
        if (range && range.startDate && range.endDate) {
            const start = range.startDate instanceof Date ? range.startDate : new Date(range.startDate);
            const end = range.endDate instanceof Date ? range.endDate : new Date(range.endDate);
            
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            
            setDateRange({ startDate: start, endDate: end });
        } else {
            setDateRange({ startDate: null, endDate: null });
        }
        setPage(0);
    }, []);

    const handleOptionsOpen = () => {
        setIsOptionsOpen((prev) => !prev);
    };

    // Filter JO based on search, date range
    const filteredJO = useMemo(() => {
        const keyword = searchTerm.trim().toLowerCase();
        let filtered = joHeaders
            .filter(jo =>
                jo.eval_status &&
                jo.eval_status.trim() !== ""
            )
            .sort((a, b) =>
                b.JO_No.localeCompare(a.JO_No)
            );

        if (maintenanceStatuses.length > 0) {
            filtered = filtered.filter(jo =>
                maintenanceStatuses.includes(normalizeMaintenanceStatus(jo.main_stat))
            );
        }

        if (keyword) {
            filtered = filtered.filter(jo => {
                const status = jo.main_stat || "Not Started";
                const displayStatus = status === 'Done' ? 'Completed' : status;
                return (
                    jo.JO_No?.toLowerCase().includes(keyword) ||
                    jo.Department_Code?.toLowerCase().includes(keyword) ||
                    displayStatus.toLowerCase().includes(keyword) ||
                    status.toLowerCase().includes(keyword) ||
                    jo.workNo?.toLowerCase().includes(keyword) ||
                    jo.Remarks?.toLowerCase().includes(keyword)
                );
            });
            return filtered;
        }

        if (dateRange?.startDate && dateRange?.endDate) {
            const start = new Date(dateRange.startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(dateRange.endDate);
            end.setHours(23, 59, 59, 999);

            filtered = filtered.filter(jo => {
                if (!jo.xDate) return false;
                const joDate = new Date(jo.xDate);
                return joDate >= start && joDate <= end;
            });
        }

        return filtered;
    }, [joHeaders, searchTerm, dateRange, maintenanceStatuses]);

    // Get total items count
    const totalItems = filteredJO.length;

    // Handle page change for main table
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    // Handle rows per page change for main table
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Get current page data for main table
    const paginatedJO = useMemo(() => {
        const startIndex = page * rowsPerPage;
        return filteredJO.slice(startIndex, startIndex + rowsPerPage);
    }, [filteredJO, page, rowsPerPage]);

    // Highlight matching text
    const highlightText = (text, query) => {
        if (!query || !text) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, index) => 
            part.toLowerCase() === query.toLowerCase() ? 
                <span key={index} className="font-medium bg-yellow-200">{part}</span> : 
                part
        );
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <CircularProgress />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header with Search and Filters */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">Maintenance</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <SearchIcon className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" fontSize="small" />
                        <input
                            type="text"
                            placeholder="Search here"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-44 sm:w-56 md:w-64"
                        />
                    </div>
                    <FormControl size="small" sx={{ minWidth: 220 }}>
                        <InputLabel id="maintenance-status-filter-label">Status</InputLabel>
                        <Select
                            labelId="maintenance-status-filter-label"
                            multiple
                            value={maintenanceStatuses}
                            onChange={(event) => {
                                const value = event.target.value;
                                setMaintenanceStatuses(typeof value === 'string' ? value.split(',') : value);
                            }}
                            label="Status"
                            renderValue={(selected) => selected.length ? selected.join(', ') : 'All statuses'}
                        >
                            {MAINTENANCE_STATUS_OPTIONS.map(option => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                        onClick={() => handleCreateWorkOrder(selectedJO)}
                        disabled={
                            !selectedJO ||
                            Boolean(selectedJO.workNo)
                        }
                        className={`
                            flex items-center gap-2 px-4 py-2
                            text-sm font-medium rounded-lg transition-colors
                            ${
                                !selectedJO || selectedJO.workNo
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                            }
                        `}
                    >
                        <AddIcon fontSize="small" />
                        Create Work Order
                    </button>
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100"
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
            {(dateRange?.startDate || searchTerm || maintenanceStatuses.length > 0) && (
                <div className="px-4 py-2 mt-3 text-xs text-gray-600 border border-blue-100 rounded-lg bg-blue-50">
                    <div className="flex flex-wrap items-center gap-3">
                        <span>
                            Date: <strong>
                                {dateRange?.startDate && dateRange?.endDate
                                    ? `${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`
                                    : 'All Periods'}
                            </strong>
                        </span>
                        {maintenanceStatuses.length > 0 && (
                            <>
                                <span>|</span>
                                <span>Status: <strong>{maintenanceStatuses.join(', ')}</strong></span>
                            </>
                        )}
                        {searchTerm && (
                            <>
                                <span>|</span>
                                <span>
                                    Search: <strong>"{searchTerm}"</strong>
                                </span>
                            </>
                        )}
                        <span>|</span>
                        <span>
                            Results: <strong>{totalItems}</strong>
                        </span>
                        <span>|</span>
                        <span>
                            Showing: <strong>{paginatedJO.length}</strong> of <strong>{totalItems}</strong>
                        </span>
                    </div>
                </div>
            )}

            {/* Main Table */}
            <div className="flex-1 mt-4 overflow-auto">
              <TableContainer component={Paper}>
                  <Table>
                      <TableHead className="sticky top-0 bg-gray-50">
                          <TableRow className="text-xs font-medium tracking-wider text-gray-500 uppercase border-b border-gray-200">
                              <TableCell className="px-4 py-3">JO Number</TableCell>
                              <TableCell className="px-4 py-3">Date</TableCell>
                              <TableCell className="px-4 py-3">Department</TableCell>
                              <TableCell className="px-4 py-3">Remarks</TableCell>
                              <TableCell className="px-4 py-3">Status</TableCell>
                              <TableCell className="px-4 py-3">Work Order</TableCell>
                              <TableCell className="px-4 py-3">WO Date</TableCell>
                              <TableCell className="px-4 py-3">Action</TableCell>
                          </TableRow>
                      </TableHead>
                      <TableBody>
                          {paginatedJO.length === 0 ? (
                              <TableRow>
                                  <TableCell colSpan="8" className="px-4 py-8 text-center text-gray-500">
                                      No maintenance records found
                                  </TableCell>
                              </TableRow>
                          ) : (
                              paginatedJO.map((jo) => (
                                  <TableRow
                                      key={jo.ID}
                                      onClick={() => setSelectedJO(jo)}
                                      className={`
                                          text-sm
                                          cursor-pointer
                                          transition-colors
                                          hover:bg-blue-50
                                          ${
                                              selectedJO?.JO_No === jo.JO_No
                                                  ? "bg-blue-100 border-l-4 border-blue-600"
                                                  : ""
                                          }
                                      `}
                                  >
                                      <TableCell 
                                          className="px-4 py-3 font-medium text-blue-600"
                                          sx={{ 
                                              fontWeight: 'bold', 
                                              color: 'primary.main', 
                                              textDecoration: 'underline',                      
                                              '&:hover': { fontSize: '.9rem', color: '#43a047' }
                                          }}
                                          onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectItem(jo);
                                          }}
                                      >
                                          {searchTerm ? highlightText(jo.JO_No, searchTerm) : jo.JO_No}
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-gray-600">
                                          <DateDisplay value={jo.xDate} format="short" />
                                      </TableCell>
                                      <TableCell className="px-4 py-3 text-gray-600">{jo.Department_Code}</TableCell>
                                      <TableCell className="max-w-xs px-4 py-3 text-gray-600 truncate">
                                          {jo.Remarks || '-'}
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                          <span className={`
                                              px-2 py-1 text-xs font-medium rounded-full
                                              ${jo.main_stat === 'Done' 
                                                  ? 'bg-green-100 text-green-700'
                                                  : jo.main_stat === 'Ongoing'
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : 'bg-gray-100 text-gray-700'
                                              }
                                          `}>
                                              {getStatusLabel(jo.main_stat)}
                                          </span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium rounded-full">{jo.workNo}</span>
                                      </TableCell>
                                      <TableCell className="px-4 py-3">
                                          <span className="px-2 py-1 text-xs font-medium rounded-full">{jo.wo_date}</span>
                                      </TableCell>
                                      <TableCell className="">
                                          <Button
                                              size="small"
                                              onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleEditWorkOrder(jo);
                                              }}
                                              disabled={!jo.workNo}
                                          >
                                              <EditIcon fontSize="small" />
                                          </Button>
                                      </TableCell>
                                  </TableRow>
                              ))
                          )}
                      </TableBody>
                  </Table>
                  <TablePagination
                      rowsPerPageOptions={[5, 10, 25, 50]}
                      component="div"
                      count={filteredJO.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={handleChangePage}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                  />
              </TableContainer>
            </div>

            <WorkOrderDialog
                open={Boolean(workOrderDialogTarget)}
                onClose={() => setWorkOrderDialogTarget(null)}
                jo={workOrderDialogTarget}
                joDetails={workOrderDialogTarget ? joDetails.filter((detail) => detail.JO_No === workOrderDialogTarget.JO_No) : undefined}
                joHeaders={joHeaders}
                updateJOHeader={updateJOHeader}
                updateJODetails={updateJODetails}
                joRefresh={joRefresh}
                joDetailsRefresh={joDetailsRefresh}
            />
        </div>
    );
}

export default MaintenanceFormDesktop;