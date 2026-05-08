import { useState, useMemo, useEffect } from 'react';
// MUI import
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
//Custom Utils
import { CustomBtn } from '../../../Utils/groupbtns';
// Hooks/pages import
import { useRefLocation } from '../../../hooks/refLocation';
import { useRefDepartment } from '../../../hooks/refDepartment';
import { useCombinedDocHeaders } from '../../../hooks/combinedDocHeaders';
import SearchTransactionTable from './../searchTrans/searchTransTable';

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
  // {status: 0, label: 'Rejected'}
];


function SearchTransactions(useProps) {
  // Use the combined hook instead of individual ones
  const { docHeaders, isLoading, error } = useCombinedDocHeaders(useProps);
  const { refLocData } = useRefLocation(useProps);
  const { refDeptData } = useRefDepartment(useProps);

  // Input State (What the user is typing/selecting now)
  const [draftTransType, setDraftTransType] = useState([]);
  const [draftSelectedLocation, setDraftSelectedLocation] = useState([]);
  const [draftSelectedDepartment, setDraftSelectedDepartment] = useState([]);
  const [draftStatus, setDraftStatus] = useState([]);
  const [draftTransNo, setDraftTransNo] = useState(null); // Changed to single object

  console.log(`draftStat: ${draftStatus}`)
  // Table State
  const [filters, setFilters] = useState({});
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selected, setSelected] = useState([]);
  const [headerTitle, setHeaderTitle] = useState('Document List');
  const [hasSearched, setHasSearched] = useState(false);

  // Get unique location and department options from docHeaders
  const locationOptions = useMemo(() => { return refLocData.map(loc => loc.LocationName) }, [refLocData]);
  const departmentOptions = useMemo(() => { return refDeptData.map(dept => dept.Department) }, [refDeptData]);

  // Combined Transaction Numbers for Autocomplete
  const transactionNumbers = useMemo(() => {
    return [...docHeaders]
      .sort((a,b) => {
      return b.transNo.localeCompare(a.transNo, undefined, {
        numeric: true,
        sensitivity: 'base'
      });
    }) // Sort by date descending
      
      .map(doc => ({
      transNo: doc.transNo,
      type: doc.type,
      fullLabel: `${doc.type} - ${doc.transNo}`
    }));
  }, [docHeaders]);

  console.log(`transNo: ${draftTransNo ? draftTransNo.transNo : 'null'}, type: ${draftTransType}, location: ${draftSelectedLocation}, department: ${draftSelectedDepartment}, status: ${draftStatus}`);

  // Apply filters to documents
  useEffect(() => {
    if (!hasSearched) {
      setFilteredDocuments([]);
      return;
    }
    
    let filtered = [...docHeaders];

    // Filter by transaction number
    if (filters.transNo) {
      filtered = filtered.filter(doc => 
        doc.transNo.toLowerCase().includes(filters.transNo.toLowerCase())
      );
    }

    // Filter by document type
    if (filters.type && filters.type.length > 0) {
      filtered = filtered.filter(doc => filters.type.includes(doc.type));
    }

    // Filter by location
    if (filters.location && filters.location.length > 0) {
      filtered = filtered.filter(doc => 
        doc.Location && filters.location.includes(doc.Location)
      );
    }

    // Filter by department
    if (filters.department && filters.department.length > 0) {
      filtered = filtered.filter(doc => 
        doc.Departmnet && filters.department.includes(doc.Departmnet || doc.Department_Code)
      );
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(doc =>
        filters.status.includes(doc.status)
      );
    }

    setFilteredDocuments(filtered);
    setPage(0); // Reset to first page when filters change
  }, [docHeaders, filters]);

  const handleGoClick = () => {
    
    const newFilters = {
      type: draftTransType,
      location: draftSelectedLocation,
      department: draftSelectedDepartment,
      status: draftStatus.map(option => option.status), // Extract status values from selected options
      transNo: draftTransNo?.transNo || ''
    };

    setFilters(newFilters);
    setHasSearched(true);
  };

  const handleClearClick = () => {
    // Clear all filter states
    setDraftTransType([]);
    setDraftSelectedLocation([]);
    setDraftSelectedDepartment([]);
    setDraftStatus([]);
    setDraftTransNo(null);
    setFilters({});
    setHasSearched(false);
    setSelected([]);
  };

  // Transform documents to match table expected format
  const tableData = useMemo(() => {

    const transformedDocuments = filteredDocuments.map(doc => ({
      DocNo: doc.transNo,
      DocType: doc.type,
      Date: doc.date,
      Status: doc.status,
      Remarks: doc.Remarks,
      Department: doc.Departmnet,
      Location: doc.Location || doc.Maintenance || '',
      // Add placeholder fields for asset-specific data
      FacName: doc.type,
      ItemClass: '',
      CATEGORY: '',
      balance_unit: '',
      Unit: '',
      ItemLocation: doc.Location || doc.Maintenance || '',
      status: doc.status
    }));

    
    return transformedDocuments;

  }, [filteredDocuments]);

  console.log(`Filtered documents count: ${filteredDocuments.length}`);

  return (
    <div>
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
      </div>

      {/* Child Table Component */}
      <SearchTransactionTable 
        loading={isLoading}
        error={error}
        displayedDocs={tableData}
        page={page}
        total={filteredDocuments.length}
        setPage={setPage}
        rowsPerPage={rowsPerPage}
        setRowsPerPage={setRowsPerPage}
        isTableActive={true}
        setHeaderTitle={setHeaderTitle}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
  );
}

export default SearchTransactions;