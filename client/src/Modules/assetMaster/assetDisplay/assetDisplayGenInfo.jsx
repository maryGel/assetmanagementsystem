import React from 'react';
import {
  Checkbox,
  FormControlLabel,
  Autocomplete,
  TextField
}from '@mui/material';
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';  
// Custom Hooks
import { useRefUom } from '../../../hooks/refUom'; 
import { useRefItemClass } from '../../../hooks/refClass';
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefDepartment } from '../../../hooks/refDepartment'; 
import { useRefLocation } from '../../../hooks/refLocation'; 
import { useRefBrand } from '../../../hooks/refBrand';



export default function AssetDisplayGenInfo({useProps, asset, isEditing, onFieldChange }){

  const { uomData } = useRefUom(useProps);
  const { refCategoryData } = useRefCategory(useProps);
  const { refItemClassData } = useRefItemClass(useProps);
  const { refDeptData } = useRefDepartment(useProps);
  const { refLocData } = useRefLocation(useProps);
  const { refBrandData } = useRefBrand(useProps);



  return(
    <>
      <div  className='w-full min-w-0 px-10'>
        <div className='py-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] bg-gray-100 shadow-sm shadow-slate-200 min-w-0'>

          {/* ..... General Information Fields ..... */}

          <span className='pl-5 mb-5 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium'>General Information</span>
          {/* flex-wrap lets UOM / Quantity / Write-Off reflow instead of overflowing */}
          <div key= {asset.id} className='flex flex-wrap items-center min-w-0 gap-2 mt-2'>
            <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>UOM:</span>
            <Autocomplete 
              disabled={!isEditing} 
              sx={{ minWidth: '10rem', flex: '0 1 12rem' }}
              size = 'small'
              options= {uomData.map(item => item.Unit)} 
              value={asset.Unit || ''}  
              onChange={(event, newValue) => onFieldChange('Unit', newValue)}
              renderInput={(params) => (
                <TextField {...params} 
                  sx={getAutocompleteSx(isEditing)}
                />              
              )} 
            />
            <span className='p-2 pl-10 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Quantity:</span>
            <input type= 'text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.balance_unit} disabled={!isEditing}  onChange={(e) => onFieldChange('balance_unit', e.target.value)}/>
            <FormControlLabel
              control={
                <Checkbox
                  checked={asset.writeOff} sx={{ color: 'Blue'}} onChange={(e) => onFieldChange("writeOff",e.target.checked ? 1: 0)}        
                />
              }
              disabled={!isEditing}
              label="Write-Off"
              sx={{ color: 'gray', marginX: ".2rem" }}
            />
          </div>
          
          {/*
            minmax() keeps each label/field pair from collapsing below a
            usable width while still letting the grid shrink with its
            container, instead of a rigid 10rem/1fr split.
          */}
          <div className='grid grid-cols-[minmax(8rem,10rem)_minmax(15rem,1fr)] min-w-0 mt-2 mb-8 mr-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] gap-2 pr-28'>              
              <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Brand:</span>
              <Autocomplete 
                disabled={!isEditing} 
                className='w-full max-w-64'
                size = 'small'
                options= {refBrandData.map(item => item.BrandName)} 
                value={asset.Brand || ''}  
                onChange={(event, newValue) => onFieldChange('Brand', newValue)}
                renderInput={(params) => (
                  <TextField {...params} 
                    sx={getAutocompleteSx(isEditing)}
                  />              
                )} 
              />
              <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Serial Number:</span>
              <input type= 'text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.serialNo} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('serialNo', e.target.value)}/>
              <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Supplier:</span>
              <input type= 'text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.suppName} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('suppName', e.target.value)}/>
              <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Reference:</span>
              <input type= 'text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.ReferenceNo} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('ReferenceNo', e.target.value)}/>
              <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Color:</span>
              <input type= 'text' className='w-full max-w-64 p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.Color} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('Color', e.target.value)}/>
          </div>

          {/* ..... Item Assignment Fields ..... */}

          <span className='pl-5 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium'>Item Assignment</span>
          {/*
            Switched from a 4-column grid to flex-wrap label/field groups.
            The grid's minmax() columns could shrink, but a CSS grid never
            reduces its column COUNT on its own — so at narrow widths the
            row just got visually crushed/clipped instead of reflowing.
            Grouping each label+field as one flex item with a min width lets
            whole pairs wrap onto new lines once a row runs out of space.
          */}
          <div className='flex flex-wrap gap-x-8 gap-y-3 mt-2 mb-8 mr-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] pr-8'>
              <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-56'>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Category:</span>
                <input type= 'text' className='p-2 w-full min-w-0 flex-1 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.CATEGORY} disabled />
              </div>

              <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-56'>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Asset Class:</span>
                <Autocomplete 
                  disabled={!isEditing} 
                  size = 'small'
                  className='flex-1 w-full min-w-0'
                  options= {refItemClassData.map(item => item.itemClass)} 
                  value={asset.ItemClass || ''}  
                  onChange={(event, newValue) => onFieldChange('ItemClass', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(isEditing)}
                    />              
                  )} 
                />
              </div>

              <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-56'>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Location:</span>
                <input type= 'text' className='p-2 w-full min-w-0 flex-1 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.ItemLocation || ''} disabled />
              </div>

              <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-56'>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Department:</span>
                <Autocomplete 
                  disabled={!isEditing} 
                  size = 'small'
                  className='flex-1 w-full min-w-0'
                  options= {refDeptData.map(item => item.Department)} 
                  value={asset.Department || ''}  
                  onChange={(event, newValue) => onFieldChange('Department', newValue)}
                  renderInput={(params) => (
                    <TextField {...params} 
                      sx={getAutocompleteSx(isEditing)}
                    />              
                  )} 
                />
              </div>

              <div className='flex items-center gap-2 min-w-[14rem] flex-1 basis-56'>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Assigned to:</span>
                <input type= 'text' className='p-2 w-full min-w-0 flex-1 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.Holder} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('Holder', e.target.value)}/>
              </div>

              <box className='flex flex-wrap items-center gap-2 min-w-[18rem] flex-1 basis-80'>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>Warranty:</span>
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>From</span>
                <input type= 'date' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.StartDate} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('StartDate', e.target.value)}  />
                <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap'>to</span>
                <input type= 'date' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.EndDate} disabled={!isEditing} readOnly={!isEditing} onChange={(e) => onFieldChange('EndDate', e.target.value)}/>
              </box>
          </div>
          
          {/* Physical Count Information*/}
          <span className='pl-5 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium'>Physical Count Details</span>
          <div className='grid grid-cols-[minmax(12rem,15rem)_minmax(15rem,1fr)] min-w-0 mt-2 ml-0 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)]'>
            <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Last physical count on:</span>
            <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>12/31/2024</span>
            <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Inventory count sheet:</span>
            <input type= 'text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.PC_BATCH} disabled readOnly/>
            <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Inventory note:</span>
            <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Needs to evaluate for repair</span>
            <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Counted by:</span>
            <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Andrea</span>
            <div className='flex items-center ml-2'>
              <Checkbox />
              <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Flag for Deletion</span>
            </div>
          </div>
        </div>
      </div>   
    </>
  )
}