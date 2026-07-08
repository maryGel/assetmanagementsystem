// SearchTransactions.jsx
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
// MUI import
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { Snackbar, Alert, CircularProgress, Box } from '@mui/material';
//Custom Utils
import { CustomBtn } from '../../../Utils/groupbtns';
// Hooks/pages import
import { useRefLocation } from '../../../hooks/refLocation';
import { useRefDepartment } from '../../../hooks/refDepartment';
import { useCombinedDocHeaders } from '../../../hooks/combinedDocHeaders';
import { useJOData } from '../../../hooks/useJO_reducer';
import SearchTransactionTable from './../searchTrans/searchTransTable';
import { useBulkApproval } from '../../../hooks/useBulkApproval';
import BulkActionDialogDesktop from '../../../Utils/BulkActionDialogDesktop';
import { useJobOrderApproval } from '../../../hooks/useJobOrderApproval';
import { useTRApproval } from '../../../hooks/useTRApproval';
import { useDisposalApproval } from '../../../hooks/useADApproval';
import { useAssetAccApproval } from '../../../hooks/useAssetAccApproval';
import { useAssetLostApproval } from '../../../hooks/useAssetLostApproval';
import { useUsers } from '../../../hooks/useUsers';

const transTypes = [
  'Job Order',
  'Transfer Order Form',
  'Disposal Form',
  'Asset Accountability Form',
  'Lost Asset Form'
];
const statusOptions = [
  {status: 0, label: 'Draft'},
  {status: 3, label: 'For Approval'},
  {status: 2, label: 'Partially Approved'},
  {status: 1, label: 'Fully Approved'},
  {status: 4, label: 'Rejected'}
];

function SearchTransactions(useProps) {
  // Use the combined hook - only need refetch
  const { docHeaders, isLoading, error, refetch } = useCombinedDocHeaders(useProps);
  const { refLocData } = useRefLocation(useProps);
  const { refDeptData } = useRefDepartment(useProps);
  const { selectedUser, setSelectedUser } = useUsers();
  // Input State (What the user is typing/selecting now)
  const [draftTransType, setDraftTransType] = useState([]);
  const [draftSelectedLocation, setDraftSelectedLocation] = useState([]);
  const [draftSelectedDepartment, setDraftSelectedDepartment] = useState([]);
  const [draftStatus, setDraftStatus] = useState([]);
  const [draftTransNo, setDraftTransNo] = useState(null);
  // Table State
  const [filters, setFilters] = useState({});
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // Force re-render of table
  
  // Local Snackbar state for toast notifications
  const [localSnackbar, setLocalSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // Initialize approval hooks
  const jobOrderHook = useJobOrderApproval();
  const trHook = useTRApproval();
  const disposalHook = useDisposalApproval();
  const assetAccHook = useAssetAccApproval();
  const assetLostHook = useAssetLostApproval();

  const userName = localStorage.getItem('username') || 'User';
  const rawUserId = localStorage.getItem('userId') || userName;

  useEffect(() => {
    if (userName && userName !== 'User') {
      setSelectedUser(userName);
    }
  }, [userName, setSelectedUser]);

  // Get user info
  const cleanUserId = String(rawUserId).replace(/\s*-\s*$/, '').trim();
  const getUserInfo = useCallback(() => {
    return {
    user: cleanUserId,
    fname: selectedUser?.fname || '',
    lname: selectedUser?.lname || '',
    multiApp: selectedUser?.multiApp || []
    };
  }, [selectedUser, cleanUserId]);

  // Toast function - matches the one in JOFormPage
  const showToast = useCallback((message, severity = 'info') => {
    setLocalSnackbar({ open: true, message, severity });
  }, []);

  // Handle local snackbar close
  const handleLocalSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setLocalSnackbar(prev => ({ ...prev, open: false }));
  };

  // SIMPLE REFRESH FUNCTION - Just use refetch
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing data using refetch...');
      
      // Use refetch to refresh all data
      if (refetch) {
        await refetch();
        console.log('✅ Refetch completed');
      } else {
        console.warn('⚠️ No refetch function available');
      }
      
      // Force data version increment to trigger re-render
      setDataVersion(prev => {
        const newVersion = prev + 1;
        console.log('📊 Data version updated to:', newVersion);
        return newVersion;
      });
      
      // Trigger a re-apply of filters
      setRefreshTrigger(prev => {
        const newTrigger = prev + 1;
        console.log('🔄 Refresh trigger updated to:', newTrigger);
        return newTrigger;
      });

      // Clear selections
      setSelected([]);
      
      // Show toast with new data count
      setTimeout(() => {
        console.log('📊 New docHeaders length after refresh:', docHeaders.length);
        showToast(`Data refreshed successfully)`, 'success');
      }, 300);
      
    } catch (err) {
      console.error('Refresh error:', err);
      showToast('Failed to refresh data: ' + err.message, 'error');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, showToast, docHeaders.length]);

  // Bulk approval hook with toast integration
  const {
    bulkDialogOpen,
    bulkActionType,
    bulkItemNames,
    bulkRemarks,
    bulkLoading,
    bulkError,
    openBulkDialog,
    executeBulkAction,
    closeBulkDialog,
    setBulkRemarks
  } = useBulkApproval({
    approvalHooks: {
      jobOrder: {
        approveDocument: jobOrderHook.approveJobOrder,
        rejectDocument: jobOrderHook.rejectJobOrder
      },
      transfer: {
        approveDocument: trHook.approveTR,
        rejectDocument: trHook.rejectTR
      },
      disposal: {
        approveDocument: disposalHook.approveDisposal,
        rejectDocument: disposalHook.rejectDisposal
      },
      assetAcc: {
        approveDocument: assetAccHook.approveAssetAcc,
        rejectDocument: assetAccHook.rejectAssetAcc
      },
      assetLost: {
        approveDocument: assetLostHook.approveAssetLost,
        rejectDocument: assetLostHook.rejectAssetLost
      }
    },
    onRefresh: async () => {
      console.log('🔄 Bulk action completed, refreshing...');
      
      // Refresh data while keeping filters
      await refreshData();
      
      // Force another re-apply of filters after a short delay
      setTimeout(() => {
        console.log('🔄 Re-applying filters after refresh...');
        setRefreshTrigger(prev => prev + 1);
        // Increment data version again to ensure table updates
        setDataVersion(prev => prev + 1);
      }, 300);
    },
    showToast,
    getUserInfo
  });

  // Function to apply filters
  const applyFilters = useCallback(() => {
    console.log('📊 Applying filters...');
    console.log('📊 docHeaders length:', docHeaders.length);
    console.log('📊 hasSearched:', hasSearched);
    console.log('📊 filters:', filters);
    
    if (!hasSearched || !filters) {
      console.log('📊 No filters or search not performed, clearing results');
      setFilteredDocuments([]);
      return;
    }
    
    // Make sure we're using the latest docHeaders
    let filtered = [...docHeaders];
    console.log('📊 Starting with all documents:', filtered.length);
    
    // Filter by transaction number
    if (filters.transNo) {
      filtered = filtered.filter(doc => 
        doc.transNo && doc.transNo.toLowerCase().includes(filters.transNo.toLowerCase())
      );
      console.log('📊 After transNo filter:', filtered.length);
    }
    // Filter by document type
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(doc => 
        doc.type && filters.type.includes(doc.type)
      );
      console.log('📊 After type filter:', filtered.length);
    }
    // Filter by location
    if (filters.location && filters.location.length > 0) {
      filtered = filtered.filter(doc => 
        doc.Location && filters.location.includes(doc.Location)
      );
      console.log('📊 After location filter:', filtered.length);
    }
    // Filter by department
    if (filters.department && filters.department.length > 0) {
      filtered = filtered.filter(doc => 
        (doc.Departmnet || doc.Department_Code) && 
        filters.department.includes(doc.Departmnet || doc.Department_Code)
      );
      console.log('📊 After department filter:', filtered.length);
    }
    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(doc =>
        filters.status.includes(doc.status)
      );
      console.log('📊 After status filter:', filtered.length);
    }
    // Filter rejected
    if (filters.rejected && filters.rejected.length > 0) {
      filtered = filtered.filter(doc =>
        filters.rejected.includes(doc.rejected)
      );
      console.log('📊 After rejected filter:', filtered.length);
    }
    
    console.log('📊 Final filtered results:', filtered.length);
    setFilteredDocuments(filtered);
    setPage(0);
  }, [docHeaders, filters, hasSearched]);

  // Apply filters when docHeaders or filters change
  useEffect(() => {
    applyFilters();
  }, [docHeaders, filters, hasSearched, refreshTrigger, applyFilters]);

  // CRITICAL: Auto-refresh when docHeaders change (from any source)
  useEffect(() => {
    if (docHeaders.length > 0 && hasSearched) {
      console.log('📄 Document headers updated, re-applying filters automatically');
      // Increment data version to force table re-render
      setDataVersion(prev => prev + 1);
    }
  }, [docHeaders, hasSearched]);

  // Get unique location and department options from docHeaders
  const locationOptions = useMemo(() => { 
    return refLocData.map(loc => loc.LocationName) 
  }, [refLocData]);
  const departmentOptions = useMemo(() => { 
    return refDeptData.map(dept => dept.Department) 
  }, [refDeptData]);

  // Combined Transaction Numbers for Autocomplete
  const transactionNumbers = useMemo(() => {
    if (!Array.isArray(docHeaders)) return [];
    
    const validDocs = docHeaders.filter(doc => 
      doc && 
      doc.transNo !== null && 
      doc.transNo !== undefined && 
      typeof doc.transNo === 'string'
    );
    
    return [...validDocs]
      .sort((a, b) => {
        const transNoA = a.transNo?.toString() || '';
        const transNoB = b.transNo?.toString() || '';
        return transNoB.localeCompare(transNoA, undefined, {
          numeric: true,
          sensitivity: 'base'
        });
      })
      .map(doc => ({
        transNo: doc.transNo,
        type: doc.type || '',
        fullLabel: `${doc.type || 'Unknown'} - ${doc.transNo}`
      }));
  }, [docHeaders]);

  const handleGoClick = () => {
    const newFilters = {
      type: draftTransType,
      location: draftSelectedLocation,
      department: draftSelectedDepartment,
      status: draftStatus.map(option => option.status),
      transNo: draftTransNo?.transNo || ''
    };
    setFilters(newFilters);
    setHasSearched(true);
    // Show count after filters apply
    // setTimeout(() => {
    //   const count = filteredDocuments.length;
    //   showToast(`Found ${count} document${count !== 1 ? 's' : ''}`, 'info');
    // }, 100);
  };

  const handleClearClick = () => {
    setDraftTransType([]);
    setDraftSelectedLocation([]);
    setDraftSelectedDepartment([]);
    setDraftStatus([]);
    setDraftTransNo(null);
    setFilters({});
    setHasSearched(false);
    setSelected([]);
    setFilteredDocuments([]);
    showToast('Filters cleared', 'info');
  };

  // Transform documents to match table expected format - NOW WITH DATA VERSION DEPENDENCY
  const tableData = useMemo(() => {
    console.log('🔄 Transforming table data, filteredDocuments length:', filteredDocuments.length);
    
    const transformedDocuments = filteredDocuments.map(doc => ({
      DocNo: doc.transNo,
      DocType: doc.type,
      Date: doc.date,
      Status: doc.status,
      Remarks: doc.Remarks,
      Department: doc.Departmnet,
      Location: doc.Location || doc.Maintenance || '',
      Rejected: doc.DISAPPROVED,
      appStat: doc.appStat || '',
      FacName: doc.type,
      ItemClass: '',
      CATEGORY: '',
      balance_unit: '',
      Unit: '',
      ItemLocation: doc.Location || doc.Maintenance || '',
    }));
    
    return transformedDocuments;
  }, [filteredDocuments, dataVersion]); // Added dataVersion dependency

  // Get selected documents with their full data
  const selectedDocuments = useMemo(() => {
    return filteredDocuments
      .filter(doc => selected.includes(doc.transNo))
      .map(doc => ({
        DocNo: doc.transNo,
        DocType: doc.type,
        Status: doc.status,
        appStat: doc.appStat || '',
        Remarks: doc.Remarks,
        Department: doc.Departmnet,
        Location: doc.Location || doc.Maintenance || '',
        Rejected: doc.DISAPPROVED,
        ...doc
      }));
  }, [filteredDocuments, selected, dataVersion]); // Added dataVersion dependency

  // Handle bulk approve
  const handleBulkApprove = useCallback(() => {
    if (selectedDocuments.length === 0) {
      showToast('Please select documents to approve', 'warning');
      return;
    }
    openBulkDialog('approve', selectedDocuments);
  }, [openBulkDialog, selectedDocuments, showToast]);

  // Handle bulk reject
  const handleBulkReject = useCallback(() => {
    if (selectedDocuments.length === 0) {
      showToast('Please select documents to reject', 'warning');
      return;
    }
    openBulkDialog('reject', selectedDocuments);
  }, [openBulkDialog, selectedDocuments, showToast]);

  return (
    <div>
      {/* Toast Snackbar - Same as JOFormPage */}
      <Snackbar
        open={localSnackbar.open}
        autoHideDuration={4000}
        onClose={handleLocalSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleLocalSnackbarClose}
          severity={localSnackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {localSnackbar.message}
        </Alert>
      </Snackbar>

      <form className="flex w-full h-auto p-5">
        <Autocomplete
          size="small"  
          options={transactionNumbers}
          value={draftTransNo}
          onChange={(e, newValue) => setDraftTransNo(newValue)}
          getOptionLabel={(option) => option?.fullLabel || ''}
          isOptionEqualToValue={(option, value) => option?.transNo === value?.transNo}
          renderInput={(params) => (
            <TextField {...params} label="Document No." placeholder="Search Document No." />
          )}
          sx={{ width: 300, marginRight: '1rem' }}
        />
        <Autocomplete
          multiple
          limitTags={1}
          size="small"              
          options={transTypes}
          value={draftTransType}
          onChange={(event, newValue) => setDraftTransType(newValue)}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Document Type" placeholder="DocumentType" />
          )}
          sx={{ width: '20rem', marginRight: '1rem' }}
        />
        <Autocomplete
          multiple
          limitTags={1}
          size="small"              
          options={locationOptions}
          value={draftSelectedLocation}
          onChange={(event, newValue) => setDraftSelectedLocation(newValue)}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Location" placeholder="Location" />
          )}
          sx={{ width: '15rem', marginRight: '1rem' }}
        />
        <Autocomplete
          multiple
          limitTags={1}
          size="small"              
          options={departmentOptions}
          value={draftSelectedDepartment}
          onChange={(event, newValue) => setDraftSelectedDepartment(newValue)}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Department" placeholder="Department" />
          )}
          sx={{ width: '15rem', marginRight: '1rem' }}
        />
        <Autocomplete
          multiple
          limitTags={1}
          size="small"              
          options={statusOptions}
          value={draftStatus}
          onChange={(event, newValue) => setDraftStatus(newValue)}
          getOptionLabel={(option) => option.label}
          isOptionEqualToValue={(option, value) => option.status === value.status}
          renderInput={(params) => (
            <TextField {...params} label="Status" placeholder="Status" />
          )}
          sx={{ width: '15rem', marginRight: '1rem' }}
        />   
        
        <TextField
          label="Created by"
          id="outlined-size-small"
          defaultValue=""
          size="small"
        />     
      </form>
      <div className='flex w-full h-auto gap-2 p-2 pr-5 ml-auto bg-gray-100 place-content-end'>
        <CustomBtn variant='goBtn' iconType='go' onClick={handleGoClick}>
          Go  
        </CustomBtn>
        <CustomBtn variant='clearBtn' iconType='clear' onClick={handleClearClick}>
          Clear   
        </CustomBtn>
        {/* Manual Refresh Button with Spinner */}
        {isRefreshing ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2 }}>
            <CircularProgress size={20} />
            <span className="text-sm text-gray-600">Refreshing...</span>
          </Box>
        ) : (
          <CustomBtn variant='refreshBtn' iconType='refresh' onClick={refreshData}>
            Refresh
          </CustomBtn>
        )}
      </div>
      
      {/* Child Table Component with key to force re-render */}
      <SearchTransactionTable 
        key={`table-${dataVersion}`} // Force re-render when data changes
        loading={isRefreshing}
        error={error}
        displayedDocs={tableData}
        page={page}
        total={filteredDocuments.length}
        setPage={setPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        isTableActive={true}
        selected={selected}
        setSelected={setSelected}
        onBulkApprove={handleBulkApprove}
        onBulkReject={handleBulkReject}
        selectedDocuments={selectedDocuments}
        isRefreshing={isRefreshing}
        dataVersion={dataVersion} // Pass data version to trigger re-render
      />

      {/* Bulk Action Dialog */}
      <BulkActionDialogDesktop
        isOpen={bulkDialogOpen}
        onClose={closeBulkDialog}
        onConfirm={executeBulkAction}
        actionType={bulkActionType}
        itemCount={bulkItemNames.length}
        itemNames={bulkItemNames}
        loading={bulkLoading}
        remarks={bulkRemarks}
        onRemarksChange={setBulkRemarks}
        error={bulkError}
      />
    </div>
  );
}

export default SearchTransactions;