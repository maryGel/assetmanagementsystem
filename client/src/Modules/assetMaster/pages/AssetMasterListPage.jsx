import { useState, useMemo, useEffect } from 'react';

// MUI import
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { createFilterOptions } from '@mui/material/Autocomplete';

//Custom Utils
import { CustomBtn } from '../../../Utils/groupbtns';

// Hooks/pages import
import AssetMasterTable from '../assetMaster/assetMasterTable'
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefItemClass } from '../../../hooks/refClass';
import { useRefLocation } from '../../../hooks/refLocation';
import { useRefDepartment } from '../../../hooks/refDepartment';

function AssetMasterListPage({ useProps, setHeaderTitle }) {

  const { 
    assets,        
    allAssets,     
    isLoading, 
    error, 
    page, 
    setPage, 
    setPageSize, 
    pageSize, 
    total,
    setFilters,
    filters  
  } = useAssetMasterData();

  const { refCategoryData } = useRefCategory(useProps);
  const { refItemClassData } = useRefItemClass(useProps);
  const { refLocData } = useRefLocation(useProps);
  const { refDeptData } = useRefDepartment(useProps);

  // INPUT STATE (What the user is typing/selecting now)
  const [draftSearchQuery, setDraftSearchQuery] = useState("");
  const [draftSelectedAssets, setDraftSelectedAssets] = useState([]); 
  const [draftSelectedAssetCategories, setDraftSelectedAssetCategories] = useState([]);
  const [draftSelectedAssetClass, setDraftSelectedAssetClass] = useState([]);
  const [draftSelectedLocation, setDraftSelectedLocation] = useState([]);
  const [draftSelectedDepartment, setDraftSelectedDepartment] = useState([]);

  // Table state
  const [selected, setSelected] = useState([]);
  const [filterKey, setFilterKey] = useState(0);

  const assetCat = useMemo(() => refCategoryData.map(item => item.category), [refCategoryData]);
  const assetClass = useMemo(() => refItemClassData.map(item => item.itemClass), [refItemClassData]);
  const location = useMemo(() => refLocData.map(item => item.LocationName), [refLocData]);
  const department = useMemo(() => refDeptData.map(item => item.Department), [refDeptData]);

  const filterOptions = createFilterOptions({
    stringify: (option) => `${option.FacNO} ${option.FacName} ${option.Description}`,
    limit: 50,
  });

  // Debug logging
  useEffect(() => {
    console.log('=== PARENT DEBUG ===');
    console.log('allAssets count:', allAssets?.length);
    console.log('assets count (filtered result):', assets?.length);
    console.log('total from server:', total);
    console.log('current filters:', filters);
  }, [allAssets, assets, total, filters]);

  const handleGoClick = () => {
    const selectedAssetNos = draftSelectedAssets.map(asset => asset.FacNO);
    
    const newFilters = {
      search: draftSearchQuery,
      categories: draftSelectedAssetCategories,
      itemClasses: draftSelectedAssetClass,
      locations: draftSelectedLocation,
      departments: draftSelectedDepartment,
      assetNos: selectedAssetNos
    };
    
    console.log('APPLYING FILTERS:', newFilters);
    setFilters(newFilters);
    setPage(0);
  }
  
  const handleClearClick = () => {
    console.log('CLEARING ALL FILTERS');
    setFilters({
      search: '',
      categories: [],
      itemClasses: [],
      locations: [],
      departments: [],
      assetNos: []
    });
    
    setDraftSearchQuery("");
    setDraftSelectedAssets([]);
    setDraftSelectedAssetCategories([]);
    setDraftSelectedAssetClass([]);
    setDraftSelectedLocation([]);
    setDraftSelectedDepartment([]);
    setFilterKey(prev => prev + 1);
    setPage(0);
    setSelected([]);
  }

  // Check if there are active filters
  const hasActiveFilters = 
    filters?.search !== "" ||
    (filters?.categories?.length || 0) > 0 ||
    (filters?.itemClasses?.length || 0) > 0 ||
    (filters?.locations?.length || 0) > 0 ||
    (filters?.departments?.length || 0) > 0 ||
    (filters?.assetNos?.length || 0) > 0;
  
  // Show filtered data from server OR empty array
  const displayAssets = hasActiveFilters ? assets : [];
  const displayTotal = hasActiveFilters ? total : 0;

  return (
    <div>
      <form className="flex w-full h-auto p-5">
        <Autocomplete
          key={`asset-search-${filterKey}`}
          multiple
          limitTags={1}
          size="small"  
          options={allAssets || []}
          filterOptions={filterOptions}
          value={draftSelectedAssets}
          onChange={(e, newValue) => setDraftSelectedAssets(newValue)}
          inputValue={draftSearchQuery}
          onInputChange={(e, newInputValue) => setDraftSearchQuery(newInputValue)}
          getOptionLabel={(option) => {
            if (!option) return '';
            return `${option.FacNO} - ${option.FacName}`;
          }}
          isOptionEqualToValue={(option, value) => option?.FacNO === value?.FacNO}
          renderOption={(props, option) => (
            <li {...props} key={option.FacNO}>
              <div>
                <strong>{option.FacNO}</strong> - {option.FacName}
                <br />
                <small>{option.Description}</small>
              </div>
            </li>
          )}
          renderInput={(params) => (
            <TextField {...params} label="Search Assets" placeholder="Search" />
          )}
          sx={{ width: 500, marginRight: '1rem' }}
        />

        <Autocomplete
          key={`assetgrp-search-${filterKey}`}
          multiple
          limitTags={1}
          size="small"              
          options={assetCat}
          value={draftSelectedAssetCategories}
          onChange={(event, newValue) => setDraftSelectedAssetCategories(newValue)} 
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Category" placeholder="Category" />
          )}
          sx={{ width: '15rem', marginRight: '1rem' }}
        />

        <Autocomplete
          key={`assetclass-search-${filterKey}`}
          multiple
          limitTags={1}
          size="small"              
          options={assetClass}  
          value={draftSelectedAssetClass}
          onChange={(event, newValue) => setDraftSelectedAssetClass(newValue)}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Asset Class" placeholder="Asset Class" />
          )}
          sx={{ width: '15rem', marginRight: '1rem' }}
        />

        <Autocomplete
          key={`location-search-${filterKey}`}
          multiple
          limitTags={1}
          size="small"              
          options={location}  
          value={draftSelectedLocation}
          onChange={(event, newValue) => setDraftSelectedLocation(newValue)}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Location" placeholder="Location" />
          )}
          sx={{ width: '15rem', marginRight: '1rem' }}
        />

        <Autocomplete
          key={`department-search-${filterKey}`}
          multiple
          limitTags={1}
          size="small"              
          options={department}  
          value={draftSelectedDepartment}
          onChange={(event, newValue) => setDraftSelectedDepartment(newValue)}
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField {...params} label="Department" placeholder="Department" />
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

      <div>
        <AssetMasterTable 
          loading={isLoading}
          error={error}
          page={page}
          total={displayTotal}
          setPage={setPage}
          rowsPerPage={pageSize}
          setRowsPerPage={setPageSize}
          isTableActive={hasActiveFilters}
          setHeaderTitle={setHeaderTitle}
          selected={selected}
          setSelected={setSelected}
          displayedAssets={displayAssets}
        />
      </div>
    </div>
  );
}

export default AssetMasterListPage;