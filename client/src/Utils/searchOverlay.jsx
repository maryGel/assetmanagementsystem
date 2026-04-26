// components/SearchOverlay.jsx
import { useState, useEffect } from 'react';
import { 
  TextField, 
  InputAdornment, 
  Box, 
  IconButton,
  Paper,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function SearchOverlay({ isOpen, onClose, docHeaders, onSelectDoc, selectedAssets = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate search delay for better UX
    const searchTimeout = setTimeout(() => {
      // Filter assets by result number, name, or description
      const results = docHeaders.filter((result) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          result.FacNO?.toLowerCase().includes(searchLower) ||
          result.FacName?.toLowerCase().includes(searchLower) ||
          result.Description?.toLowerCase().includes(searchLower) ||
          result.JO_No?.toLowerCase().includes(searchLower) ||
          result.TR_No?.toLowerCase().includes(searchLower) ||
          result.AD_No?.toLowerCase().includes(searchLower) ||
          result.AAFNo?.toLowerCase().includes(searchLower) 
        );
      });
      
      setSearchResults(results);
      setIsSearching(false);
    }, 300);
    
    return () => clearTimeout(searchTimeout);
  }, [searchTerm, docHeaders]);

  const handleSelectAsset = (result) => {
    onSelectDoc(result);
    handleClose();
  };

  const handleClose = () => {
    setSearchTerm('');
    setSearchResults([]);
    setIsSearching(false);
    onClose();
  };

  const isAssetSelected = (result) => {
    return selectedAssets?.some(selected => selected.FacNO === result.FacNO);
  };

  if (!isOpen) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1300,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        bgcolor: 'rgba(0, 0, 0, 0.5)',
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: '100%',
          maxWidth: '800px',
          mt: 5,
          mx: 2,
          maxHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          animation: 'slideDown 0.2s ease-out',
          '@keyframes slideDown': {
            from: {
              opacity: 0,
              transform: 'translateY(-20px)',
            },
            to: {
              opacity: 1,
              transform: 'translateY(0)',
            },
          },
        }}
      >
        {/* Search Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <span className='text-gray-400'>
            Search
          </span>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Search Input */}
        <Box sx={{ p: 2 }}>
          <TextField
            autoFocus
            fullWidth
            variant="outlined"
            placeholder="Type here.."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setSearchTerm('')}
                    size="small"
                    sx={{ color: 'text.secondary' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />

          {/* Search Results */}
          <Box sx={{ mt: 3, flex: 1, overflow: 'auto' }}>
            {searchTerm && (
              <Box sx={{ mb: 2 }}>
                <span className='text-xs '>
                  {isSearching ? 'Searching...' : `Found ${searchResults.length} result(s)`}
                </span>
              </Box>
            )}

            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress size={40} />
              </Box>
            ) : (
              <Box sx={{ maxHeight: 'calc(100vh - 300px)', overflowY: 'auto' }}>
                {searchResults.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {searchResults.map((result) => {
                      const selected = isAssetSelected(result);
                      return (
                        <Paper
                          key={result.id}
                          onClick={() => !selected && handleSelectAsset(result)}
                          elevation={0}
                          sx={{
                            px: 2,
                            border: '1px solid',
                            borderColor: selected ? 'primary.main' : 'divider',
                            borderRadius: 2,
                            cursor: selected ? 'default' : 'pointer',
                            transition: 'all 0.2s',
                            opacity: selected ? 0.7 : 1,
                            bgcolor: selected ? 'action.selected' : 'background.paper',
                            '&:hover': {
                              borderColor: selected ? 'primary.main' : 'primary.light',
                              bgcolor: selected ? 'action.selected' : 'action.hover',
                              transform: selected ? 'none' : 'translateX(4px)',
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }} >
                            <Box sx={{ flex: 1 }}>
                              <span className='text-sm font-semibold tracking-wide text-blue-500' >
                                {result.FacName}
                              </span>
                              <Box sx={{ display: 'flex', alignItems: 'center'}}>
                                <span className='text-xs tracking-wide text-gray-500' >
                                  {result.FacNO}
                                </span>
                                <span className='pt-1 text-sm font-semibold tracking-wide text-blue-500' >
                                  {result.JO_No || result.TR_No || result.AD_No || result.AAFNo}
                                </span>
                                {selected && (
                                  <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                )}
                              </Box>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                                {result.ItemLocation && (
                                  <span className='text-sm text-gray-400'>
                                    📍 {result.ItemLocation || result.Department || result.department || result.Department_Name || result.Dep}
                                  </span>
                                )}
                              </Box>
                                  <div>
                                    {result.Remarks && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        Remarks: {result.Remarks}
                                      </div>
                                    )}
                                    {result.requested_by && (
                                    <div className="mt-1 text-xs text-gray-500">
                                        Requestor: {result.requested_by} 
                                      </div>
                                    )}
                                    {result.Holder && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        Holder: {result.Holder} 
                                      </div>
                                    )}
                                    {result.EmpName && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        Employee: {result.EmpName} 
                                      </div>
                                    )}
                                    {result.Custodian && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        Employee: {result.Custodian} 
                                      </div>
                                    )}
                                    {result.xDate && (
                                      <div className="mt-1 text-xs text-gray-500">
                                        Date: {new Date(result.xDate).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                            </Box>                          
                          </Box>
                        </Paper>
                      );
                    })}
                  </Box>
                ) : searchTerm && !isSearching ? (
                  <div className='flex flex-col'>
                    <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                    <span className='text-sm text-gray-500'>
                      No matching assets found
                    </span>
                    <span className='text-sm text-gray-500'>
                      Try searching by a different term
                    </span>
                  </div>
                ) : !searchTerm && (
                  <div className='flex flex-col items-center gap-1'>
                    <span className='text-sm text-gray-500'>
                      Search by doc/asset number, name, or description
                    </span>
                  </div>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

export default SearchOverlay;