import {useState, useEffect} from 'react'

// MUI
import {Snackbar, Alert} from '@mui/material';
import { useAssetMasterData } from '../../../hooks/assetMasterHooks';

// Custom Utils
import { CustomBtn } from '../../../Utils/groupbtns';
// Custom Hooks
import { useRefUom } from '../../../hooks/refUom'; // import the refUnit data
import { useSearchParams } from 'react-router-dom';
import { assetMasterFields, prepareAssetPayload } from '../../assetMaster/createAsset/assetMasterFields';
// Components
import AssetDisplayTabs from '../assetDisplay/assetDisplayTabs'


export default function AssetMasterDisplay({}){

  // State to hold API Asset data
  const { 
    assets, 
    singleAsset,
    fetchAssetByFacN0,
    clearSingleAsset,
    updateAsset,
    isLoading, 
    isMutating,
    isLoadingSingle, 
    error
  } = useAssetMasterData(); 
  
  // State variables
  const [ searchParams ] = useSearchParams();
  const [ asset, setAssetData ] = useState({assetMasterFields});
  const [ isEditing, setIsEditing ] = useState(false);
  const [ saveError, setSaveError ] = useState(null);
  const [ snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });


  const copyFacN0 = searchParams.get('copyFrom');  

  // Fetch Asset data from API on component mount
  useEffect(() => {
    if(copyFacN0){
      fetchAssetByFacN0(copyFacN0);
    } else {
      clearSingleAsset();
    }
    
    return () => {
      clearSingleAsset();
    }    
  }, [copyFacN0, fetchAssetByFacN0, clearSingleAsset]);


  useEffect(() => {
    if(singleAsset){
      setAssetData(prev => ({
        ...prev,
        singleAsset,
        FacNO: singleAsset.FacNO, 
        FacName: singleAsset.FacName ? `${singleAsset.FacName}` : '',
        Description: singleAsset.Description || '',
        Unit: singleAsset.Unit || '',
        ItemClass: singleAsset.ItemClass || '',
        CATEGORY: singleAsset.CATEGORY || '',
        ItemLocation: singleAsset.ItemLocation || '',
        Department: singleAsset.Department || '',  
        ReferenceNo: singleAsset.ReferenceNo || '', 
        Brand: singleAsset.Brand || '',
        serialNo: singleAsset.serialNo || '',
        Color: singleAsset.Color || '',
        StartDate: singleAsset.StartDate || '',
        EndDate: singleAsset.EndDate || '',
        Adate: singleAsset.Adate || '',
        balance_unit: singleAsset.balance_unit || '',
        AAmount: singleAsset.AAmount || '',
        Percent: singleAsset.Percent || '',
        Abre: singleAsset.Abre || '',
      }))
    }
  }, [singleAsset]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // ...  H a n d l e r s ... //

  const handleEditButton = () => {
    setIsEditing(prev => !prev)
  }

  const handleChange = (field, value) => {
    setAssetData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try{
      setSaveError(null);
      const payload = prepareAssetPayload(asset);
      console.log('Saving', asset.FacNO, payload);
      await updateAsset(asset.FacNO, payload);
      showSnackbar('Changes have been saved successfully.');
      setIsEditing(false);


    } catch (error) {
      setSaveError(error.message || 'Failed to save asset');
    }

  }

  const cancelEdit = () => {
    setIsEditing(false);
    setAssetData(prev => ({
      ...prev,
      ...singleAsset
    }));
  };
  

  if (isLoading) return <p className="p-5">Loading asset...</p>;
  if (error) return <p className="p-5 text-red-600">Error loading asset data.</p>;

  return(
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
            onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              severity={snackbar.severity}
              onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>

          {/* ... B u t t o n s ... */}
      
          <div className='flex flex-wrap justify-end gap-2 mt-8 mb-3'>            
            
            {/* SAVE BUTTON */}
            {isEditing && (
              <CustomBtn
                variant='saveBtn'
                iconType='save'
                title='Save Changes'
                onClick={handleSave}
              >
                Save
              </CustomBtn>
            )}
            
            {/* EDIT and CANCEL BUTTON */}
              <CustomBtn
                variant= {`${isEditing? 'cancelBtn' : 'editBtn' }`}
                iconType={`${isEditing? 'cancel' : 'edit'}`}
                title={isEditing? 'Cancel Edit' : 'Edit Asset'}
                type="button" // Use this to prevent from submission
                onClick={isEditing? cancelEdit : handleEditButton}
              >
                {isEditing ? 
                  <><span>Cancel </span></>:
                  <><span>Edit</span></>
                }
              </CustomBtn>
          </div>


          {/* ... F i e l d s ... */}
      
          <div  className=''>
            <p className='p-3 pl-16 font-medium tracking-wide bg-white border rounded-md shadow-md text-[clamp(0.8rem,0.65rem+0.6vw,1.05rem)] shadow-slate-300 border-slate-300 text-slate-800'
            >Asset Number: {asset.FacNO}</p>
    
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
                <div className='flex-col gap-4 shadow-sm shadow-slate-200 mt-1 ml-[clamp(1rem,4vw,4rem)] py-2 px-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] bg-gray-100'>
                  <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-64'>
                    <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Asset Name:</span>
                    <input type="text" className='p-2 w-full min-w-0 flex-1 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)]'  disabled={!isEditing} value={asset.FacName|| ''} readOnly={!isEditing} onChange={(e) => handleChange('FacName', e.target.value)}/>
                  </div>

                  <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-64'>
                    <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Description:</span>
                    <input type="text" className='p-2 w-full min-w-0 flex-1 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)]'  disabled={!isEditing} value={asset.Description || ''} readOnly={!isEditing} onChange={(e) => handleChange('Description', e.target.value)}/>
                  </div>

                  <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-64'>
                    <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Status:</span>
                    <input type="text" className='p-2 w-full min-w-0 flex-1 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] font-semibold tracking-wider text-green-600' disabled value={asset.xxStats || 'Active'} readOnly />
                  </div>
                </div>         
              </div>
    
              {/* Column 2: Display Photo */}
              <div className='flex justify-center items-start p-2 flex-1 basis-48 min-w-[9rem] max-w-[9rem] sm:min-w-[10rem] sm:max-w-[10rem] md:min-w-[12rem] md:max-w-xs lg:min-w-[14rem] lg:max-w-sm xl:min-w-[16rem] xl:max-w-md'>
                <img 
                  className='w-full h-auto max-w-[7rem] sm:max-w-[8rem] md:max-w-[12rem] lg:max-w-[14rem] xl:max-w-[16rem]'
                  src='/public/images/assets/laptop.jpg'
                />
              </div>
            </div>      
          </div>
  
        <AssetDisplayTabs
          asset={asset}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onFieldChange={handleChange}
        />
      </div>  
    </>
  )
}