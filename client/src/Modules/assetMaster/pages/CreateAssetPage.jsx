import React, {useState, useEffect, useCallback} from 'react';
import { api } from '../../../api/axios'; 
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';

// Custom hooks
import CreateAssetGenInfo from '../createAsset/createAssetGenInfo';
import CreateAssetCapitalization from '../createAsset/createAssetCapitalization';
import ValidationAlert from '../createAsset/assetValidationAlert';
import AssetFileUpload from '../createAsset/assetFileUpload';
import SummarySection from '../createAsset/summarySection';

import { useSearchParams, useNavigate } from 'react-router-dom';
import { useRefCategory } from '../../../hooks/refCategory';
import { useAssetMasterData } from '../../../hooks/assetMasterHooks'; // import the itemlist

// fields and utilities
import { 
  assetMasterFields, 
  requiredFields, 
  prepareAssetPayload, 
  validationFinalSubmission, 
  validateStep, 
  getStepValidationErrors 
} from '../createAsset/assetMasterFields';


// Define your step labels
const steps = ['General Info', 'Capitalization Parameters', 'Upload Picture'];

export default function CreateAsset(setHeaderTitle) {
  const { 
    assets, 
    singleAsset,
    fetchAssetByFacN0,
    clearSingleAsset,
    createAsset, 
    isLoading, 
    isMutating,
    isLoadingSingle, 
    error: assetError
  } = useAssetMasterData();   
  
  const { refCategoryData } = useRefCategory();
  const [ searchParams  ] = useSearchParams();
  const navigate = useNavigate();

  // State variables
  const [ asset, setAsset ] = useState(assetMasterFields);
  const [ activeStep, setActiveStep ] = useState(0);
  const [ submitError, setSubmitError ] = useState(null);
  const [ submitSuccess, setSubmitSucess] = useState(false);
  const [ generatedFacNO, setGeneratedFacNO ] = useState('');

  const copyFacN0 = searchParams.get('copyFrom');  

  // Effects
  useEffect(() => {
    if (copyFacN0){
      fetchAssetByFacN0(copyFacN0);
    } else {
      clearSingleAsset();
    }

    // Cleanup when component unmounts or copyFacN0 changes
    return () => {
      clearSingleAsset();
    }
  }, [copyFacN0, fetchAssetByFacN0, clearSingleAsset]); 

  // Populate from data when singleAsset is fetched
  useEffect(() => {
    if (singleAsset) {
      setAsset(prev => ({
        ...prev,
        ...singleAsset,
        FacNO: '', // Will generate based on new category
        FacName: singleAsset.FacName ? `${singleAsset.FacName} (Copy)` : '',
        Description: singleAsset.Description || '',
        Unit: singleAsset.Unit || '',
        ItemClass: singleAsset.ItemClass || '',
        CATEGORY: singleAsset.CATEGORY || '',
        ItemLocation: singleAsset.ItemLocation || '',
        Department: singleAsset.Department || '',  
        ReferenceNo: singleAsset.ReferenceNo || '',      
      }));
    }
  }, [singleAsset]);

  // Generate FacNO when category is selected
  useEffect(() => {
    if (asset.CATEGORY && refCategoryData && refCategoryData.length > 0) {
      // Find the selected category in refCategoryData
      const selectedCategory = refCategoryData.find(
        cat => cat.category === asset.CATEGORY
      );

      if (selectedCategory && selectedCategory.xCode) {
        generateNextFacNO(selectedCategory.xCode).then(newFacNO => {         
          if (newFacNO && typeof newFacNO === 'string') {
            setGeneratedFacNO(newFacNO);
            setAsset(prev => ({...prev, FacNO: newFacNO }));
          } 
        }).catch(console.error);
      } 
    } 
  }, [asset.CATEGORY, refCategoryData, assets]);

// Function to generate next asset number (fills gaps)
const generateNextFacNO = useCallback(async (xCode) => {
  if (!xCode) return '';     

  try {
    // Fetch all assets
    const response = await api.get('/itemlist');
    
    // Handle different possible data structures
    let allAssets = [];
    
    // Check if response.data is an array
    if (Array.isArray(response.data)) {
      allAssets = response.data;
    } 
    // Check if response.data has a data property that's an array
    else if (response.data && Array.isArray(response.data.data)) {
      allAssets = response.data.data;
    }
    // Check if response.data has an items or assets property
    else if (response.data && Array.isArray(response.data.items)) {
      allAssets = response.data.items;
    }
    else if (response.data && Array.isArray(response.data.assets)) {
      allAssets = response.data.assets;
    }
    // If response.data is an object, try to extract any array property
    else if (response.data && typeof response.data === 'object') {
      // Look for any property that is an array
      const arrayProperty = Object.values(response.data).find(
        value => Array.isArray(value)
      );
      if (arrayProperty) {
        allAssets = arrayProperty;
      } else {
        console.error('No array found in response.data:', response.data);
        return `${xCode}-${'1'.padStart(7, '0')}`;
      }
    }
    
    // Ensure allAssets is an array
    if (!Array.isArray(allAssets)) {
      console.error('allAssets is not an array:', allAssets);
      return `${xCode}-${'1'.padStart(7, '0')}`;
    }
    
    // Filter assets for this category
    const existingAssets = allAssets.filter(asset => 
      asset && asset.FacNO && asset.FacNO.startsWith(`${xCode}-`)
    );
    
    // Extract numbers and sort them
    const existingNumbers = [];
    existingAssets.forEach(asset => {
      const match = asset.FacNO.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          existingNumbers.push(num);
        }
      }
    });
    
    // Sort numbers in ascending order
    existingNumbers.sort((a, b) => a - b);
    
    // Find the first gap in the sequence starting from 1
    let nextNumber = 1;
    for (let i = 0; i < existingNumbers.length; i++) {
      if (existingNumbers[i] > nextNumber) {
        // Found a gap at nextNumber
        break;
      }
      if (existingNumbers[i] === nextNumber) {
        // Current number exists, move to next
        nextNumber++;
      }
    }
    
    // Format with leading zeros (7 digits)
    const generated = `${xCode}-${nextNumber.toString().padStart(7, '0')}`;
    console.log('Generated FacNO:', generated); // Debug log
    return generated;
    
  } catch (error) {
    console.error('Error generating FacNO:', error);
    // Return a temporary number as fallback
    return `${xCode}-${'1'.padStart(7, '0')}`;
  }    
}, []);

  // .... H a n d l e r s ....
  
  const updateAssetData = (fieldsUpdates) => {
    setAsset(prev => ({
      ...prev,
      ...fieldsUpdates
    }));
  };

  const handleNext = () => {
    // Clear previous errors
    setSubmitError(null);
    
    const validationErrors = getStepValidationErrors(activeStep, asset, requiredFields);

    if (validationErrors.length > 0) {
      setSubmitError(validationErrors);
      return;
    }

    // If validation passes, move to next step
    // If we're on the last step (steps.length - 1), go to summary
    if (activeStep === steps.length - 1) {
      setActiveStep(steps.length);
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setSubmitError(null);
    // If we're on the summary page (steps.length), go back to last step
    if (activeStep === steps.length) {
      setActiveStep(steps.length - 1);
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep - 1);
    }
  };

  const handleReset = () => {
    // Clean up object URL if exists
    if (asset.uploadPicture.preview) {
      URL.revokeObjectURL(asset.uploadPicture.preview);
    }

    setActiveStep(0);
    setAsset(assetMasterFields);
    setGeneratedFacNO('');
    setSubmitError(null);
    setSubmitSucess(false);
  };

  // Final Submission using createAsset hook
  const handleSubmit = async () => {
    try {
      // Clear previous errors
      setSubmitError(null);

      // Check if FacNO is empty or an object
      if (!asset.FacNO || typeof asset.FacNO === 'object') {
        setSubmitError('Asset Number could not be generated. Please check category selection.');
        return;
      }

      // Final Validation
      const validationErrors = validationFinalSubmission(asset, requiredFields);
      if (validationErrors.length > 0) {
        setSubmitError(validationErrors);
        return;
      }
    
      // TEMPORARY: Force a FacNO for testing
      const finalFacNO = asset.FacNO && typeof asset.FacNO === 'string' 
        ? asset.FacNO 
        : 'TEST-000001';
      
      // Prepare payload for API
      const payload = prepareAssetPayload({
        ...asset,
        FacNO: finalFacNO
      });
    
      // Call createAsset from hook
      await createAsset(payload);
      setSubmitSucess(true);

      setTimeout(() => {
        navigate(`/assetFolder/assetMasterDisplay?copyFrom=${asset.FacNO}`);
        setHeaderTitle(`Asset Master Display`);
      }, 2000);

    } catch (error) {
      console.error('Error creating asset:', error);

      // Get detailed error message
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Failed to create asset';
      
      setSubmitError(`Error: ${errorMessage}`);
    }
  };

  // Function to render content for each step
  const getStepContent = (step) => {
    const stepProps = {
      asset,
      updateAssetData,
      originalAsset: singleAsset,
      loading: isLoadingSingle,
      error: assetError,
      generatedFacNO
    };

    switch (step) {
      case 0:
        return <CreateAssetGenInfo {...stepProps} />;
      case 1:
        return <CreateAssetCapitalization {...stepProps} refCategoryData={refCategoryData} />;
      case 2:
        return <AssetFileUpload asset={asset} updateAssetData={updateAssetData} />;
      default:
        return 'Unknown step';
    }
  };

  // Create summary sections
  const summarySections = [
    {
      title: 'General Information',
      fields: [
        { label: 'Asset Number', value: asset.FacNO || 'Not generated yet' },
        { label: 'Asset Name', value: asset.FacName },
        { label: 'Description', value: asset.Description },
        { label: 'Serial Number', value: asset.serialNo || 'N/A' },
        { label: 'Brand', value: asset.Brand || 'N/A' },
        { label: 'Reference No.', value: asset.ReferenceNo },
        { label: 'Supplier', value: asset.suppName || 'N/A' },
        { label: 'Color', value: asset.Color || 'N/A' },
      ],
      stepIndex: 0
    },
    {
      title: 'Capitalization Details',
      fields: [
        { label: 'Category', value: asset.CATEGORY },
        { label: 'Item Class', value: asset.ItemClass },
        { label: 'Unit', value: asset.Unit },
        { label: 'Quantity', value: asset.balance_unit },
        { label: 'Acquisition Date', value: asset.Adate },
        { label: 'Acquired Value', value: asset.AAmount },
        { label: 'Residual Value', value: asset.Abre },
        { label: 'Life in Years', value: asset.Percent},
        { label: 'Location', value: asset.ItemLocation },
        { label: 'Department', value: asset.Department },
      ],
      stepIndex: 1
    },
    {
      title: 'Additional Information',
      fields: [
        { label: 'Picture Uploaded', value: asset.uploadPicture.file ? 'Yes' : 'No' },
      ],
      stepIndex: 2
    }
  ];

  // Render final step summary
  const renderFinalStepSummary = () => {
    const validationErrors = validationFinalSubmission(asset, requiredFields);

    return (
      <React.Fragment>
        <Box className="pl-4 mt-4 text-base">
          <Typography variant="h6" gutterBottom>
            Review and Submit
          </Typography>
        </Box>
        
        {summarySections.map((section, index) => (
          <SummarySection
            key={index}
            {...section}
            onEdit={setActiveStep}
          />
        ))}
        
        <ValidationAlert errors={validationErrors} type="warning" />
        
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Back to Previous Step
          </Button>
          <Box sx={{ flex: '1 1 auto' }} />
          <Button 
            onClick={handleReset}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Reset All
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit} 
            disabled={isMutating || validationErrors.length > 0}
          >
            {isMutating ? <CircularProgress size={24} /> : 'Submit Asset'}
          </Button>
        </Box>
      </React.Fragment>
    );
  };

  // Main render
  return (
    <Box sx={{ width: '100%', mt: 6, px: 30 }}>
      {/* Debug info - remove in production */}
      <div style={{ display: 'none' }}>
        Active Step: {activeStep}, Steps Length: {steps.length}, Show Summary: {activeStep === steps.length ? 'Yes' : 'No'}
      </div>
      
      {/* Success Alert */}
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Asset created successfully! Redirecting...
        </Alert>
      )}
      
      {/* Validation Errors Alert */}
      <ValidationAlert errors={submitError} />
      
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {activeStep === steps.length ? (
        renderFinalStepSummary()
      ) : (
        <React.Fragment>
          {getStepContent(activeStep)}
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, px: 3 }}>
            <Button
              color="inherit"
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button 
              onClick={handleNext}
              variant="contained"
            >
              {activeStep === steps.length - 1 ? 'Review' : 'Next'}
            </Button>
          </Box>
        </React.Fragment>
      )}
    </Box>
  );
}