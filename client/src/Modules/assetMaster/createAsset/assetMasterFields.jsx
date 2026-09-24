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
  uploadPicture: { file: null, preview: '' },

  // Additional fields for backend
  Holder: '',
  AAmount: '',
  Percent: 1, // Life in years. Must match what the field displays (it used to be 0 here while the UI showed 1)
  Abre: 0,
  Remarks: ''
};

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
  Percent: 'Life in years',
  ItemLocation: 'Location',
  Department: 'Department',
  ReferenceNo: 'Reference No.'
};

// Required field validations for each step
export const stepRequiredFields = {
  0: ['FacName', 'Description', 'ReferenceNo'], // General Info
  1: ['CATEGORY', 'FacNO', 'ItemClass', 'Unit', 'Adate', 'AAmount', 'Percent', 'ItemLocation', 'Department'], // Capitalization
  2: [] // Upload Picture (optional)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Fields that hold numbers and must be greater than zero to count as "filled"
const MUST_BE_POSITIVE = ['AAmount', 'Percent'];

// "1,250.50" -> 1250.5 (also safe for numbers, '', null)
export const toNumber = (value) => Number(String(value ?? '').replace(/,/g, ''));

// A field is missing when it is null/undefined/blank.
// Numeric fields are missing when they are not a number > 0.
// (Plain `!value` is wrong here: it treats a legitimate 0 as missing.)
export const isFieldMissing = (field, asset) => {
  const value = asset[field];
  if (value === null || value === undefined) return true;
  if (MUST_BE_POSITIVE.includes(field)) return !(toNumber(value) > 0);
  return String(value).trim() === '';
};

// Get specific error messages for a step
export const getStepValidationErrors = (step, asset, labels = requiredFields) => {
  const fields = stepRequiredFields[step] || [];
  return fields
    .filter((field) => isFieldMissing(field, asset))
    .map((field) => `${labels[field] || field} is required.`);
};

// Validate a specific step (true when there are no errors)
export const validateStep = (step, asset) =>
  getStepValidationErrors(step, asset).length === 0;

// Final validation for all required fields
export const validationFinalSubmission = (asset, labels = requiredFields) =>
  Object.entries(labels)
    .filter(([field]) => isFieldMissing(field, asset))
    .map(([, label]) => `${label} is required`);

// Prepare payload for API submission
export const prepareAssetPayload = (asset) => ({
  // Required fields
  FacNO: asset.FacNO,
  FacName: (asset.FacName || '').trim(),
  Description: asset.Description || '',
  ItemClass: asset.ItemClass,
  CATEGORY: asset.CATEGORY,

  // Optional fields with correct backend field names
  Unit: asset.Unit || '',
  serialNo: asset.serialNo || '',
  Department: asset.Department || '',
  Adate: asset.Adate || null,
  ItemLocation: asset.ItemLocation || '',
  balance_unit: Number(asset.balance_unit) || 1,
  suppName: asset.suppName || '',
  Brand: asset.Brand || '',
  Color: asset.Color || '',
  ReferenceNo: asset.ReferenceNo || '',
  StartDate: asset.StartDate || null,
  EndDate: asset.EndDate || null,

  // Additional fields
  AAmount: toNumber(asset.AAmount).toFixed(2),
  Percent: toNumber(asset.Percent) || 1,
  Abre: toNumber(asset.Abre).toFixed(2),
  Remarks: asset.Remarks || '',
  Holder: asset.Holder || ''
});

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