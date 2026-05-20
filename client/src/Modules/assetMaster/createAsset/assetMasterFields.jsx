export const assetMasterFields = {
    // General Info fields
    FacNO: '',
    FacName: '',
    Description: '',
    serialNo: '',
    Brand: '',
    suppName: '',
    ReferenceNo: '',
    Color: '',
    StartDate: '', 
    EndDate: '', 
    
    // Capitalization fields
    Adate: '', 
    Unit: '',
    balance_unit: 1,
    ItemClass: '',
    CATEGORY: '',
    ItemLocation: '',
    Department: '',
    
    // Other fields
    // splitAsset: 0, 
    uploadPicture: { file: null, preview: '' },
    
    // Additional fields for backend
    Holder: '',
    AAmount: 0,
    Percent: 0,
    Abre: 0,
    Remarks: ''
}


// Step labels for the stepper
export const stepLabels = ['General Info', 'Capitalization Parameters', 'Upload Picture'];


// Required fields for final submission
export const requiredFields = {
  FacNO: 'Asset Number',
  FacName: 'Asset Name',
  Description: 'Description',
  CATEGORY: 'Asset Category',
  ItemClass: 'Asset Class',
  Unit: 'Unit of measure',
  Adate: 'Acquisition Date',
  AAmount: 'Acquisition amount',
  ItemLocation: 'Location',
  Department: 'Department',
  ReferenceNo: 'Reference No.'
};

// Required field validations for each step
 export const stepRequiredFields = {
    0: ['FacName', 'Description', 'ReferenceNo'], // General Info
    1: ['CATEGORY', 'ItemClass', 'Unit', 'Adate', 'ItemLocation', 'Department'], // Capitalization
    2: [] // Upload Picture (optional)
  }

// Validation a specific steps
export const validateStep = (step, asset) => {  
  
  const validator = stepRequiredFields[step] || [];
  
  return validator.every(field => asset[field] && String(asset[field].trim() !== ''));

};

// Get specific error messages for a step
export const getStepValidationErrors = (step, asset, requiredFields) => {
  const validator = stepRequiredFields[step] || [];
  const errors = [];

  validator.forEach(field => {
    if (!asset[field] || String(asset[field]).trim() === '') {
      errors.push(`${requiredFields[field]} is required.`);
    }
  }); 

  return errors;
};

// Final validation for all required fields
export const validationFinalSubmission = (asset, requiredFields) => {
  const error = [];

  Object.entries(requiredFields).forEach(([field, label]) => {
    if(!asset[field] || String(asset[field]).trim() === ''){
      error.push(`${label} is required`);
    }
  });

  return error;
}


// Function to generate next asset number
export const generateNextFacNO = async (xCode, existingAssets = []) => {
  if (!xCode) {
    console.error('No xCode provided to generateNextFacNO');
    return '';
  }

  try {  
    // Find the highest existing number for this xCode
    const existingAssetsWithPrefix = existingAssets.filter(asset => 
      asset.FacNO && asset.FacNO.startsWith(`${xCode}-`)
    );

    console.log(`Existing assets with ${xCode}- prefix:`, existingAssetsWithPrefix.length);
    
    let maxNumber = 0;
    existingAssetsWithPrefix.forEach(asset => {
      const match = asset.FacNO.match(/-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    });
  
    // Increment and format with leading zeros
    const nextNumber = maxNumber + 1;
    return `${xCode}-${nextNumber.toString().padStart(7, '0')}`;

  } catch (error) {
    console.error('Error generating FacNO:', error);
    return '';
  }
};


// Prepare payload for API submission
export const prepareAssetPayload = (asset) => {
  return {
    // Required fields
    FacNO: asset.FacNO,
    FacName: asset.FacName,
    Description: asset.Description || '',
    ItemClass: asset.ItemClass,
    CATEGORY: asset.CATEGORY,
    
    // Optional fields with correct backend field names
    Unit: asset.Unit || '',
    serialNo: asset.serialNo || '',
    Department: asset.Department || '',
    Adate: asset.Adate || null,
    ItemLocation: asset.ItemLocation || '',
    balance_unit: asset.balance_unit || 1,
    suppName: asset.suppName || '',
    Brand: asset.Brand || '',
    Color: asset.Color || '',
    ReferenceNo: asset.ReferenceNo || '',
    StartDate: asset.StartDate || null,
    EndDate: asset.EndDate || null,
    
    // Additional fields
    AAmount: asset.AAmount ? asset.AAmount.toString().replace(/,/g, '') : '0.00',
    Percent: asset.Percent || 1,
    Abre: asset.Abre ? asset.Abre.toString().replace(/,/g, '') : '0.00',
    Remarks: asset.Remarks || '',
    Holder: asset.Holder || ''
  };
};

// Debug logging utilities
export const logFacNODebug = (asset, refCategoryData, generatedFacNO) => {
  console.log('=== FacNO Generation Debug ===');
  console.log('1. asset.CATEGORY:', asset.CATEGORY);
  console.log('2. refCategoryData exists?:', !!refCategoryData);
  console.log('3. refCategoryData length:', refCategoryData?.length);
  console.log('4. Current asset.FacNO:', asset.FacNO);
  console.log('5. generatedFacNO:', generatedFacNO);
  console.log('6. selectedCategory:', selectedCategory);
  console.log('7. selectedCategory.xCode:', selectedCategory?.xCode);
};

export const handleFileUpload = (file, updateAssetData) => {
  if (file) {
    updateAssetData({
      uploadPicture: {
        file,
        preview: URL.createObjectURL(file)
      }
    });
  }
};