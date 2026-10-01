import { useState, useEffect } from 'react';

// MUI
import { Snackbar, Alert, Button } from '@mui/material';
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';

// Custom Utils
import { CustomBtn } from '../../../Utils/groupbtns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { assetMasterFields, prepareAssetPayload } from '../../assetMaster/createAsset/assetMasterFields';
// Components
import AssetDisplayTabs from '../assetDisplay/assetDisplayTabs';

// ---------------------------------------------------------------------------
// Status badge, driven by asset.xxStats
// ---------------------------------------------------------------------------
// Color mapping is a best guess at the values xxStats holds today (ACTIVE
// from the create-asset insert, plus the common lifecycle states a fixed
// asset goes through). Unrecognized values still render, just in neutral
// gray, so a new status value on the backend never looks broken here —
// tell me the actual value set if this list needs adjusting.
const STATUS_STYLES = {
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-300',
  DISPOSED: 'bg-red-50 text-red-700 border-red-200',
  RETIRED: 'bg-red-50 text-red-700 border-red-200',
  LOST: 'bg-red-50 text-red-700 border-red-200',
  TRANSFERRED: 'bg-blue-50 text-blue-700 border-blue-200',
  'FOR REPAIR': 'bg-amber-50 text-amber-700 border-amber-200',
  'UNDER REPAIR': 'bg-amber-50 text-amber-700 border-amber-200',
};

const StatusBadge = ({ status }) => {
  const label = status ? String(status).trim() : 'Available';
  const style = STATUS_STYLES[label.toUpperCase()] || 'bg-slate-100 text-slate-600 border-slate-300';
  return (
    <span className={`inline-block px-3 py-1 rounded-full border font-semibold tracking-wide text-[clamp(0.68rem,0.55rem+0.4vw,0.8rem)] ${style}`}>
      {label}
    </span>
  );
};

// Maps a DB row (singleAsset) onto the flat shape this page's form uses.
// Pulled into one place so the initial load and "cancel edit" (which must
// revert to the same shape) can never drift apart.
const mapAssetToForm = (source = {}) => ({
  FacNO: source.FacNO || '',
  FacName: source.FacName || '',
  Description: source.Description || '',
  Unit: source.Unit || '',
  ItemClass: source.ItemClass || '',
  CATEGORY: source.CATEGORY || '',
  ItemLocation: source.ItemLocation || '',
  Department: source.Department || '',
  ReferenceNo: source.ReferenceNo || '',
  Brand: source.Brand || '',
  serialNo: source.serialNo || '',
  Color: source.Color || '',
  StartDate: source.StartDate || '',
  EndDate: source.EndDate || '',
  Adate: source.Adate || '',
  balance_unit: source.balance_unit ?? '',
  AAmount: source.AAmount ?? '',
  Percent: source.Percent ?? '',
  Abre: source.Abre ?? '',
  Holder: source.Holder || '',
  Picpath: source.Picpath || '',
  xxStats: source.xxStats || '',
  writeOff: source.writeOff ? 1 : 0,
  PC_BATCH: source.PC_BATCH || '',
});

export default function AssetMasterDisplay() {
  // State to hold API Asset data
  const {
    singleAsset,
    fetchAssetByFacN0,
    clearSingleAsset,
    updateAsset,
    isLoadingSingle,
    isMutating,
    error,
  } = useAssetMasterData();

  // State variables
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // NOTE: was `useState({assetMasterFields})`, which nests the whole fields
  // object under a key literally named "assetMasterFields" instead of using
  // it as the initial state. Every field below (asset.FacNO, asset.Color...)
  // was reading off that broken shape until singleAsset loaded and replaced it.
  const [asset, setAssetData] = useState(mapAssetToForm(assetMasterFields));
  const [isEditing, setIsEditing] = useState(false);
  const [pictureFile, setPictureFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState('');
  const [saveError, setSaveError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const copyFacN0 = searchParams.get('copyFrom');

  // Fetch Asset data from API on component mount
  useEffect(() => {
    if (copyFacN0) {
      fetchAssetByFacN0(copyFacN0);
    } else {
      clearSingleAsset();
    }

    return () => {
      clearSingleAsset();
    };
  }, [copyFacN0, fetchAssetByFacN0, clearSingleAsset]);

  useEffect(() => {
    if (singleAsset) {
      setAssetData(mapAssetToForm(singleAsset));
    }
  }, [singleAsset]);

  useEffect(() => () => {
    if (picturePreview) URL.revokeObjectURL(picturePreview);
  }, [picturePreview]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ...  H a n d l e r s ... //

  const handleEditButton = () => {
    setIsEditing((prev) => !prev);
  };

  const handleChange = (field, value) => {
    setAssetData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setSaveError(null);
      const payload = prepareAssetPayload(asset);
      const result = await updateAsset(asset.FacNO, payload, pictureFile);
      if (pictureFile && result.Picpath) {
        setAssetData((prev) => ({ ...prev, Picpath: result.Picpath }));
        setPictureFile(null);
        setPicturePreview('');
      }
      showSnackbar('Changes have been saved successfully.');
      setIsEditing(false);
    } catch (error) {
      setSaveError(error.message || 'Failed to save asset');
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setPictureFile(null);
    setPicturePreview('');
    if (singleAsset) setAssetData(mapAssetToForm(singleAsset));
  };

  const handlePictureChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setSaveError(null);
    setPictureFile(file);
    setPicturePreview(URL.createObjectURL(file));
  };

  // Re-fetches the currently displayed asset. Disabled while editing so it
  // can't silently discard unsaved changes.
  const handleRefresh = () => {
    if (copyFacN0) fetchAssetByFacN0(copyFacN0);
  };

  // ASSUMPTION: the create-asset route. Adjust if this app mounts it elsewhere.
  const handleCreateNew = () => {
    navigate('/assetFolder/createAsset');
  };

  if (isLoadingSingle) return <p className="p-5">Loading asset...</p>;
  if (error) return <p className="p-5 text-red-600">Error loading asset data.</p>;

  return (
    <>
      {/*
        Outer container: fluid width with a sensible max-width and centered
        margins, instead of a fixed mx-32. This lets the page use available
        space on narrower desktop windows/split-screens while not stretching
        edge-to-edge on very wide monitors.
      */}
      {/*
        min-w-0 matters here: grid/flex items default to min-width: auto,
        which stops them shrinking below their content's natural width. If
        this page sits inside a flex/grid ancestor and lacks min-w-0, the
        ancestor grows wider instead of these inner grids ever compressing.
      */}
      <div className='grid w-full min-w-0 max-w-[1400px] mx-auto px-10 py-3'>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>

        {saveError && (
          <div className='p-3 mt-4 text-sm text-red-700 bg-red-100 border border-red-300 rounded'>
            {saveError}
          </div>
        )}

        {/* ... B u t t o n s ... */}

        <div className='flex flex-wrap justify-end gap-2 mt-8 mb-3'>

          {/* CREATE BUTTON */}
          <CustomBtn
            variant='createBtn'
            iconType='add'
            title='Create New Asset'
            onClick={handleCreateNew}
            disabled={isEditing}
          >
            Create
          </CustomBtn>

          {/* SAVE BUTTON */}
          {isEditing && (
            <CustomBtn
              variant='saveBtn'
              iconType='save'
              title='Save Changes'
              onClick={handleSave}
              disabled={isMutating}
            >
              {isMutating ? 'Saving...' : 'Save'}
            </CustomBtn>
          )}

          {/* EDIT and CANCEL BUTTON */}
          <CustomBtn
            variant={isEditing ? 'cancelBtn' : 'editBtn'}
            iconType={isEditing ? 'cancel' : 'edit'}
            title={isEditing ? 'Cancel Edit' : 'Edit Asset'}
            type="button" // Use this to prevent from submission
            onClick={isEditing ? cancelEdit : handleEditButton}
          >
            {isEditing ? <span>Cancel</span> : <span>Edit</span>}
          </CustomBtn>

          {/* REFRESH BUTTON */}
          <CustomBtn
            variant='refreshBtn'
            iconType='refresh'
            title='Refresh'
            onClick={handleRefresh}
            disabled={isEditing || isMutating || isLoadingSingle || !copyFacN0}
          >
            Refresh
          </CustomBtn>
        </div>


        {/* ... F i e l d s ... */}

        <div className=''>
          <div className='flex items-center gap-2 p-3 pl-16 font-medium tracking-wide bg-white border rounded-md shadow-md text-[clamp(0.8rem,0.65rem+0.6vw,1.05rem)] shadow-slate-300 border-slate-300 text-slate-800'>
            <span>Asset Number: {asset.FacNO}</span>
          </div>

          {/*
            Switched from a fixed 2-column grid to flex-wrap: as the
            container narrows, the photo column drops below the field
            group as a whole instead of both columns getting crushed
            side by side. min-w on each side sets a floor before wrapping.
          */}
          <div className='flex flex-wrap min-w-0 mt-3 bg-white border rounded-md shadow-md shadow-slate-300 border-slate-300 text-slate-800'>
            {/* Column 1: Asset Name and Description */}
            <div className='my-3 min-w-0 flex-1 basis-[20rem]'>
              {/*
                Label/field pairs are grouped as single flex items so a
                pair wraps to its own line as a unit, instead of a grid
                column silently truncating the label or input.
              */}
              <div className='m-3 space-y-3 rounded border border-slate-100 bg-slate-50 p-4 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] shadow-sm sm:ml-6'>
                <div className='flex items-center min-w-0 gap-3'>
                  <span className='text-gray-500 w-28 shrink-0'>Asset Name:</span>
                  <input type="text" className={`min-w-0 flex-1 rounded px-2 py-1.5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] transition-colors ${isEditing ? 'border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400' : 'border border-transparent bg-transparent text-slate-600'}`} disabled={!isEditing} value={asset.FacName || ''} readOnly={!isEditing} onChange={(e) => handleChange('FacName', e.target.value)} />
                </div>

                <div className='flex items-center min-w-0 gap-3'>
                  <span className='text-gray-500 w-28 shrink-0'>Description:</span>
                  <input type="text" className={`min-w-0 flex-1 rounded px-2 py-1.5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] transition-colors ${isEditing ? 'border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400' : 'border border-transparent bg-transparent text-slate-600'}`} disabled={!isEditing} value={asset.Description || ''} readOnly={!isEditing} onChange={(e) => handleChange('Description', e.target.value)} />
                </div>

                <div className='flex items-center min-w-0 gap-3'>
                  <span className='text-gray-500 w-28 shrink-0'>Status:</span>
                  <div>
                    <StatusBadge status={asset.xxStats} />
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Display Photo */}
            <div className='flex justify-center items-start p-2 flex-1 basis-48 min-w-[9rem] max-w-[9rem] sm:min-w-[10rem] sm:max-w-[10rem] md:min-w-[12rem] md:max-w-xs lg:min-w-[14rem] lg:max-w-sm xl:min-w-[16rem] xl:max-w-md'>
              {picturePreview || asset.Picpath ? (
                <img
                  className='w-full h-auto max-w-[7rem] rounded border border-slate-200 object-contain sm:max-w-[8rem] md:max-w-[12rem] lg:max-w-[14rem] xl:max-w-[16rem]'
                  src={picturePreview || asset.Picpath}
                  alt={`Photo of ${asset.FacName || 'asset'}`}
                />
              ) : (
                <div className='flex items-center justify-center w-full px-3 text-xs text-center border border-dashed rounded min-h-28 border-slate-300 text-slate-400'>
                  No image uploaded
                </div>
              )}
              {isEditing && (
                <Button component="label" size="small" sx={{ mt: 1, textTransform: 'none' }}>
                  {pictureFile ? 'Choose another image' : 'Change image'}
                  <input
                    hidden
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handlePictureChange}
                  />
                </Button>
              )}
            </div>
          </div>
        </div>

        <AssetDisplayTabs
          asset={asset}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onFieldChange={handleChange}
          facNo={copyFacN0}
        />
      </div>
    </>
  );
}
