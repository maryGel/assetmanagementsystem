import { useState, useMemo, useEffect, useCallback, useRef } from 'react';

// MUI
import { 
  Button, CircularProgress, 
  Typography, Chip, Box, Paper,
  Collapse, Alert, Snackbar,
  FormControl, InputLabel, Select, MenuItem,
  IconButton
} from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';

// Hooks - Asset Master
import { useAssetMasterData } from '../../hooks/assetMasterHooks';
import { useRefLocation } from '../../hooks/refLocation';
import { useRefCategory } from '../../hooks/refCategory';
import { useRefDepartment } from '../../hooks/refDepartment';
import { useRefItemClass } from '../../hooks/refClass';

// Custom Utils
import { CustomBtn } from '../../Utils/groupbtns';
// Components
import AssetDetailPanel from '../components/mvAssetDetailPanel';
import AssetCardItem from '../components/mvAssetCardItem';
import SearchOverlay from '../../Utils/searchOverlay';

function MvTansactionPage() {
  // Asset hook
  const {
    assets,
    singleAsset,
    isLoading,
    error: assetError,
    fetchAssetByFacN0,
    fetchAssets,
    page,
    setPage,
    total,
    clearSingleAsset
  } = useAssetMasterData();

  // Reference data hooks
  const { refLocData } = useRefLocation();
  const { refCategoryData } = useRefCategory();
  const { refDeptData } = useRefDepartment();
  const { refItemClassData } = useRefItemClass();

  // Memoized reference options
  const locationOptions = useMemo(() => 
    ['', ...(refLocData?.map(item => item.LocationName) || [])], 
    [refLocData]
  );
  
  const categoryOptions = useMemo(() => 
    ['', ...(refCategoryData?.map(item => item.category) || [])], 
    [refCategoryData]
  );
  
  const departmentOptions = useMemo(() => 
    ['', ...(refDeptData?.map(item => item.Department) || [])], 
    [refDeptData]
  );
  
  const assetClassOptions = useMemo(() => 
    ['', ...(refItemClassData?.map(item => item.itemClass) || [])], 
    [refItemClassData]
  );

  // Filter state
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [department, setDepartment] = useState('');
  const [assetClass, setAssetClass] = useState('');
  
  // Draft state for filters
  const [draftSelectedAssets, setDraftSelectedAssets] = useState([]);
  const [draftLocation, setDraftLocation] = useState('');
  const [draftCategory, setDraftCategory] = useState('');
  const [draftDepartment, setDraftDepartment] = useState('');
  const [draftAssetClass, setDraftAssetClass] = useState('');

  // UI State
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isFetchingAssets, setIsFetchingAssets] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [displayAssets, setDisplayAssets] = useState([]);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  
  // State for search overlay assets
  const [searchableAssets, setSearchableAssets] = useState([]);
  const [isLoadingSearchable, setIsLoadingSearchable] = useState(false);
  
  // Single asset mode state
  const [isSingleAssetMode, setIsSingleAssetMode] = useState(false);

  // Check if any filter is applied
  const hasFilters = useMemo(() => {
    return draftLocation !== '' || draftCategory !== '' || 
           draftDepartment !== '' || draftAssetClass !== '';
  }, [draftLocation, draftCategory, draftDepartment, draftAssetClass]);

  // Check if any assets are selected
  const hasSelectedAssets = useMemo(() => {
    return draftSelectedAssets.length > 0;
  }, [draftSelectedAssets]);

  // Check if Go button should be enabled
  const isGoEnabled = useMemo(() => {
    return (hasSelectedAssets || hasFilters) && !hasLoadedData && !isFetchingAssets;
  }, [hasSelectedAssets, hasFilters, hasLoadedData, isFetchingAssets]);

  // Load assets for search overlay (lightweight, happens when dialog opens)
  const loadSearchableAssets = useCallback(async () => {
    if (searchableAssets.length > 0 || isLoadingSearchable) {
      return;
    }
    
    setIsLoadingSearchable(true);
    try {
      await fetchAssets();
      setSearchableAssets(assets || []);
    } catch (err) {
      console.error('Error loading searchable assets:', err);
    } finally {
      setIsLoadingSearchable(false);
    }
  }, [searchableAssets.length, isLoadingSearchable, fetchAssets, assets]);

  // Update searchable assets when assets are loaded
  useEffect(() => {
    if (assets && assets.length > 0 && searchableAssets.length === 0) {
      setSearchableAssets(assets);
    }
  }, [assets, searchableAssets.length]);

  // Filter assets based on selected criteria
  const filterAssets = useCallback(() => {
    if (!assets || assets.length === 0) {
      return [];
    }

    return assets.filter(item => {
      // Filter by selected assets
      if (selectedAssets.length > 0) {
        const isSelected = selectedAssets.some(asset => asset.FacNO === item.FacNO);
        if (!isSelected) return false;
      }

      // Filter by location
      if (location && item.ItemLocation !== location) return false;

      // Filter by category
      if (category && item.CATEGORY !== category) return false;

      // Filter by department
      if (department && item.Department !== department) return false;

      // Filter by asset class
      if (assetClass && item.ItemClass !== assetClass) return false;

      return true;
    });
  }, [assets, selectedAssets, location, category, department, assetClass]);

  // Update display assets when filters or assets change
  useEffect(() => {
    if (hasLoadedData && assets && !isSingleAssetMode) {
      const filtered = filterAssets();
      setDisplayAssets(filtered);
    } else if (isSingleAssetMode) {
      // In single asset mode, displayAssets is not used
      setDisplayAssets([]);
    } else {
      setDisplayAssets([]);
    }
  }, [assets, selectedAssets, location, category, department, assetClass, hasLoadedData, filterAssets, isSingleAssetMode]);

  // Load main assets when Go is clicked
  const loadMainAssets = useCallback(async () => {
    setIsFetchingAssets(true);
    setFetchError(null);
    setIsSingleAssetMode(false);
    clearSingleAsset();
    
    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000);
      });
      
      await Promise.race([
        fetchAssets(),
        timeoutPromise
      ]);
      
      setHasLoadedData(true);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setFetchError(err.message || 'Failed to load assets');
    } finally {
      setIsFetchingAssets(false);
    }
  }, [fetchAssets, clearSingleAsset]);

  // Handle Go button click
  const handleGoClick = useCallback(async () => {
    // Commit draft filters
    setSelectedAssets(draftSelectedAssets);
    setLocation(draftLocation);
    setCategory(draftCategory);
    setDepartment(draftDepartment);
    setAssetClass(draftAssetClass);
    setPage(0);
    
    // Load assets
    await loadMainAssets();
  }, [draftSelectedAssets, draftLocation, draftCategory, draftDepartment, draftAssetClass, loadMainAssets, setPage]);

  // Handle Clear button click - resets everything
  const handleClearClick = useCallback(() => {
    // Reset all filters
    setDraftSelectedAssets([]);
    setDraftLocation('');
    setDraftCategory('');
    setDraftDepartment('');
    setDraftAssetClass('');
    
    setSelectedAssets([]);
    setLocation('');
    setCategory('');
    setDepartment('');
    setAssetClass('');
    
    setHasLoadedData(false);
    setFetchError(null);
    setDisplayAssets([]);
    setPage(0);
    
    // Clear single asset and exit single asset mode
    clearSingleAsset();
    setIsSingleAssetMode(false);
  }, [setPage, clearSingleAsset]);

  // Handle search overlay selection - NOW USES fetchAssetByFacN0
  const handleSelectAsset = useCallback(async (asset) => {
    const isAlreadySelected = draftSelectedAssets.some(a => a.FacNO === asset.FacNO);
    
    if (!isAlreadySelected) {
      // Add asset to selection
      const newSelectedAssets = [...draftSelectedAssets, asset];
      setDraftSelectedAssets(newSelectedAssets);
      
      // Commit the selection
      setSelectedAssets(newSelectedAssets);
      
      // Clear any existing filters
      setDraftLocation('');
      setDraftCategory('');
      setDraftDepartment('');
      setDraftAssetClass('');
      setLocation('');
      setCategory('');
      setDepartment('');
      setAssetClass('');
      
      // Load the single asset details using fetchAssetByFacN0
      setIsFetchingAssets(true);
      setFetchError(null);
      setIsSingleAssetMode(true);
      
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 30000);
        });
        
        await Promise.race([
          fetchAssetByFacN0(asset.FacNO),
          timeoutPromise
        ]);
        
        setHasLoadedData(true);
      } catch (err) {
        console.error('Error fetching asset details:', err);
        setFetchError(err.message || 'Failed to load asset details');
        setIsSingleAssetMode(false);
      } finally {
        setIsFetchingAssets(false);
      }
    }
  }, [draftSelectedAssets, fetchAssetByFacN0]);

  // Handle opening search overlay
  const handleOpenSearchOverlay = useCallback(() => {
    // If we're in single asset mode, clear it before opening search
    if (isSingleAssetMode) {
      clearSingleAsset();
      setIsSingleAssetMode(false);
      setHasLoadedData(false);
    }
    setSearchOverlayOpen(true);
    loadSearchableAssets();
  }, [loadSearchableAssets, isSingleAssetMode, clearSingleAsset]);

  // Active Filters Display Component
  const ActiveFilters = useMemo(() => {
    const activeFilters = [];
    
    if (selectedAssets.length > 0) {
      activeFilters.push({ label: `${selectedAssets.length} asset(s) selected`, type: 'assets' });
    }
    if (location) {
      activeFilters.push({ label: `Location: ${location}`, type: 'location' });
    }
    if (category) {
      activeFilters.push({ label: `Category: ${category}`, type: 'category' });
    }
    if (department) {
      activeFilters.push({ label: `Department: ${department}`, type: 'department' });
    }
    if (assetClass) {
      activeFilters.push({ label: `Asset Class: ${assetClass}`, type: 'class' });
    }
    
    if (activeFilters.length === 0) return null;
    
    return (
      <Box sx={{ mb: 2, overflow: 'auto' }}>
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1 }}>
          Active Filters:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {activeFilters.map((filter, idx) => (
            <Chip
              key={idx}
              label={filter.label}
              size="small"
              onDelete={() => {
                switch(filter.type) {
                  case 'assets':
                    setSelectedAssets([]);
                    setDraftSelectedAssets([]);
                    break;
                  case 'location':
                    setLocation('');
                    setDraftLocation('');
                    break;
                  case 'category':
                    setCategory('');
                    setDraftCategory('');
                    break;
                  case 'department':
                    setDepartment('');
                    setDraftDepartment('');
                    break;
                  case 'class':
                    setAssetClass('');
                    setDraftAssetClass('');
                    break;
                }
              }}
            />
          ))}
          <Chip
            label="Clear All"
            size="small"
            color="error"
            variant="outlined"
            onClick={handleClearClick}
          />
        </Box>
      </Box>
    );
  }, [selectedAssets, location, category, department, assetClass, handleClearClick]);

  const isLoadingData = isFetchingAssets || isLoading;

  // Render content
  const renderContent = () => {
    
    if (!hasLoadedData && !fetchError) {      
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          py: 8,
          textAlign: 'center'
        }}>
          {isLoading ? <CircularProgress /> : ''}
          <span className='px-3 mt-2 text-sm tracking-wide text-gray-400'>
            Click the search icon to select specific assets, or use the filters above, then click "Go" to view results.
          </span>
        </Box>
      );
    }

    if (isLoadingData) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={40} />
          <Typography sx={{ mt: 2, color: '#6b7280' }}>
            {isSingleAssetMode ? 'Loading asset details...' : 'Loading assets...'}
          </Typography>
        </Box>
      );
    }

    if (fetchError) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 5, textAlign: 'center' }}>
          <ErrorOutlineIcon sx={{ color: '#f87171', fontSize: 48, mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#4b5563', fontWeight: 500, mb: 1 }}>
            Failed to load {isSingleAssetMode ? 'asset details' : 'assets'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af', mt: 1, mb: 2, maxWidth: 400 }}>
            {fetchError}
          </Typography>
          <Button 
            variant="contained" 
            startIcon={<RefreshIcon />}
            onClick={handleClearClick}
          >
            Try Again
          </Button>
        </Box>
      );
    }

    // Display single asset when in single asset mode
    if (isSingleAssetMode && singleAsset) {
      return (
        <>
          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1, paddingLeft: 1}}>
            Display results:
          </Typography>
          <AssetCardItem 
            key={singleAsset.FacNO} 
            asset={singleAsset} 
            onClick={() => {
              setSelectedAssetForDetail(singleAsset);
              setDetailPanelOpen(true);
            }}
          />
        </>
      );
    }

    // Display multiple assets when in multi-asset mode
    if (displayAssets.length === 0 && hasLoadedData) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, textAlign: 'center' }}>
          <Typography variant="body1" sx={{ color: '#6b7280', mb: 1 }}>
            No matching assets found
          </Typography>
          <Typography variant="body2" sx={{ color: '#9ca3af' }}>
            Try adjusting your filters or selecting different assets
          </Typography>
        </Box>
      );
    }

    return (
      <>
        <Typography variant="caption" sx={{ color: '#6b7280', display: 'block', mb: 1, paddingLeft: 1}}>
          Found {displayAssets.length} asset{displayAssets.length !== 1 ? 's' : ''}
        </Typography>
        {displayAssets.map((asset, index) => (
          <AssetCardItem 
            key={asset.FacNO || index} 
            asset={asset} 
            onClick={() => {
              setSelectedAssetForDetail(asset);
              setDetailPanelOpen(true);
            }}
          />
        ))}
      </>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor : 'white' }}>
      {/* Header */}
      <div className='flex items-center justify-between px-5 py-2 m-3 bg-blue-100 rounded-lg shadow-md'>
          <div className='flex gap-3 '>
            <img className='w-6 h-6' src='/icons/actions/boxes.png' alt="Assets" />   
            <span className='text-lg font-semibold tracking-wide'>
              Asset Master
            </span>   
          </div>       
          <button  
            onClick={handleOpenSearchOverlay}         
            disabled={isLoadingData}
            className='p-1 bg-white border border-gray-300 rounded-lg shadow-sm'
          >
            <SearchIcon sx={{ fontSize: 23 }} fontSize='small' />
          </button>
 
      </div>


      {/* Filter Section */}
      <Paper sx={{ px: 2, py: 2 }} elevation={0} >

        {/* Toggle Advanced Filters - Disabled when results are loaded */}
        <Button
          // variant="text"
          size="small"
          onClick={() => setShowFilters(!showFilters)}
          startIcon={<FilterAltIcon />}
          sx={{ textTransform: 'none', width: '100%' }}
          disabled={isLoadingData}
        >
          {(showFilters) ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
        </Button>

        {/* Advanced Filters - Disabled when results are loaded */}
        <Collapse in={showFilters}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
            <FormControl fullWidth size="small" disabled={hasLoadedData || isLoadingData}>
              <InputLabel>Location</InputLabel>
              <Select
                value={draftLocation}
                onChange={(e) => setDraftLocation(e.target.value)}
                label="Location"
              >
                {locationOptions.map((option) => (
                  <MenuItem key={option || 'none'} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={hasLoadedData || isLoadingData}>
              <InputLabel>Category</InputLabel>
              <Select
                value={draftCategory}
                onChange={(e) => setDraftCategory(e.target.value)}
                label="Category"
              >
                {categoryOptions.map((option) => (
                  <MenuItem key={option || 'none'} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={hasLoadedData || isLoadingData}>
              <InputLabel>Asset Class</InputLabel>
              <Select
                value={draftAssetClass}
                onChange={(e) => setDraftAssetClass(e.target.value)}
                label="Asset Class"
              >
                {assetClassOptions.map((option) => (
                  <MenuItem key={option || 'none'} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" disabled={hasLoadedData || isLoadingData}>
              <InputLabel>Department</InputLabel>
              <Select
                value={draftDepartment}
                onChange={(e) => setDraftDepartment(e.target.value)}
                label="Department"
              >
                {departmentOptions.map((option) => (
                  <MenuItem key={option || 'none'} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          <button 
            className='py-2 text-white bg-green-600 rounded-full '
            onClick={handleGoClick}
            disabled={!isGoEnabled}
            >
              GO
            </button>
          </Box>
        </Collapse>
      </Paper>

      {/* Active Filters Display */}
      {hasLoadedData && (selectedAssets.length > 0 || location || category || department || assetClass) && (
        <Box sx={{ px: 2, pt: 2 }}>
          {ActiveFilters}
        </Box>
      )}

      {/* Results Section */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
        {renderContent()}
      </Box>

      {/* Asset Detail Panel */}
      <AssetDetailPanel
        open={detailPanelOpen}
        onClose={() => {
          setDetailPanelOpen(false);
          setSelectedAssetForDetail(null);
        }}
        asset={selectedAssetForDetail}
        fetchAssetByFacN0={fetchAssetByFacN0}
      />

      {/* Search Overlay */}
      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        docHeaders={searchableAssets}
        onSelectDoc={handleSelectAsset}
      />
    </Box>
  );
}

export default MvTansactionPage;