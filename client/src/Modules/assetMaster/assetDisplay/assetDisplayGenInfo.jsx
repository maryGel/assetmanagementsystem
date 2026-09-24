import React, { useMemo } from 'react';
import {
  Checkbox,
  FormControlLabel,
  Autocomplete,
  TextField
} from '@mui/material';
import { getAutocompleteSx } from '../../../Utils/autocompleteStyles';
// Custom Hooks
import { useRefUom } from '../../../hooks/refUom';
import { useRefItemClass } from '../../../hooks/refClass';
import { useRefCategory } from '../../../hooks/refCategory';
import { useRefDepartment } from '../../../hooks/refDepartment';
import { useRefLocation } from '../../../hooks/refLocation';
import { useRefBrand } from '../../../hooks/refBrand';
import { useColors } from '../../../hooks/refColor';

// ---------------------------------------------------------------------------
// Shared styling. Flat gray fills read as placeholders rather than finished
// UI, so every section is a white card with a hairline border + soft shadow,
// and editable fields get a visible border while read-only ones look like
// quiet labels instead of greyed-out browser defaults.
// ---------------------------------------------------------------------------
const sectionCardClass = 'py-6 shadow-sm border border-slate-200 rounded-lg bg-white min-w-0';
const sectionHeaderClass = 'block pl-5 mb-4 pb-2 border-b border-slate-100 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium';
const fieldLabelClass = 'p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500 whitespace-nowrap';

const fieldValueClass = (isEditing) =>
  `w-full min-w-0 flex-1 px-2.5 py-1.5 rounded text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] transition-colors ${
    isEditing
      ? 'border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400'
      : 'border border-transparent bg-transparent text-slate-600'
  }`;

// Fields that are never editable here (Category/Location come from
// transfer documents, not this form) get a distinct muted-card look so it
// reads as "locked", not just "currently disabled".
const staticFieldClass =
  'w-full min-w-0 flex-1 px-2.5 py-1.5 rounded text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] border border-slate-200 bg-slate-50 text-slate-500';

export default function AssetDisplayGenInfo({ useProps, asset, isEditing, onFieldChange }) {
  const { uomData } = useRefUom(useProps);
  const { refCategoryData } = useRefCategory(useProps);
  const { refItemClassData } = useRefItemClass(useProps);
  const { refDeptData } = useRefDepartment(useProps);
  const { refLocData } = useRefLocation(useProps);
  const { refBrandData } = useRefBrand(useProps);
  const { refColors } = useColors();

  // Keep a color the asset already has even if it's not in the reference
  // list (e.g. legacy free-text data), so it isn't silently dropped.
  const colorOptions = useMemo(() => {
    const names = Array.isArray(refColors) ? refColors.map((c) => c.ColName).filter(Boolean) : [];
    return asset.Color && !names.includes(asset.Color) ? [asset.Color, ...names] : names;
  }, [refColors, asset.Color]);

  return (
    <div className='w-full min-w-0 px-10'>
      <div className={sectionCardClass}>
        {/* ..... General Information Fields ..... */}

        <span className={sectionHeaderClass}>General Information</span>
        {/* flex-wrap lets UOM / Quantity / Write-Off reflow instead of overflowing */}
        <div className='flex flex-wrap items-center min-w-0 gap-2 mt-2'>
          <span className={fieldLabelClass}>UOM:</span>
          <Autocomplete
            disabled={!isEditing}
            sx={{ minWidth: '10rem', flex: '0 1 12rem' }}
            size='small'
            options={uomData.map((item) => item.Unit)}
            value={asset.Unit || ''}
            onChange={(event, newValue) => onFieldChange('Unit', newValue)}
            renderInput={(params) => (
              <TextField {...params} sx={getAutocompleteSx(isEditing)} />
            )}
          />
          <span className='p-2 pl-10 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Quantity:</span>
          <input
            type='text'
            className={fieldValueClass(isEditing) + ' max-w-[8rem]'}
            value={asset.balance_unit}
            disabled={!isEditing}
            onChange={(e) => onFieldChange('balance_unit', e.target.value)}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={!!asset.writeOff}
                sx={{ color: 'Blue' }}
                onChange={(e) => onFieldChange('writeOff', e.target.checked ? 1 : 0)}
              />
            }
            disabled={!isEditing}
            label="Write-Off"
            sx={{ color: 'gray', marginX: '.2rem' }}
          />
        </div>

        {/*
          minmax() keeps each label/field pair from collapsing below a
          usable width while still letting the grid shrink with its
          container, instead of a rigid 10rem/1fr split.
        */}
        <div className='grid grid-cols-[minmax(8rem,10rem)_minmax(15rem,1fr)] min-w-0 mt-2 mb-8 mr-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] gap-2 pr-28'>
          <span className={fieldLabelClass}>Brand:</span>
          <Autocomplete
            disabled={!isEditing}
            className='w-full max-w-64'
            size='small'
            options={refBrandData.map((item) => item.BrandName)}
            value={asset.Brand || ''}
            onChange={(event, newValue) => onFieldChange('Brand', newValue)}
            renderInput={(params) => (
              <TextField {...params} sx={getAutocompleteSx(isEditing)} />
            )}
          />
          <span className={fieldLabelClass}>Serial Number:</span>
          <input
            type='text'
            className={fieldValueClass(isEditing)}
            value={asset.serialNo}
            disabled={!isEditing}
            readOnly={!isEditing}
            onChange={(e) => onFieldChange('serialNo', e.target.value)}
          />
          <span className={fieldLabelClass}>Supplier:</span>
          <input
            type='text'
            className={fieldValueClass(isEditing)}
            value={asset.suppName}
            disabled={!isEditing}
            readOnly={!isEditing}
            onChange={(e) => onFieldChange('suppName', e.target.value)}
          />
          <span className={fieldLabelClass}>Reference:</span>
          <input
            type='text'
            className={fieldValueClass(isEditing)}
            value={asset.ReferenceNo}
            disabled={!isEditing}
            readOnly={!isEditing}
            onChange={(e) => onFieldChange('ReferenceNo', e.target.value)}
          />
          <span className={fieldLabelClass}>Color:</span>
          {/* Was a free-text input; now sourced from the same Color reference
              table used on the create-asset form, so display and create stay consistent. */}
          <Autocomplete
            disabled={!isEditing}
            className='w-full max-w-64'
            size='small'
            options={colorOptions}
            value={asset.Color || ''}
            onChange={(event, newValue) => onFieldChange('Color', newValue || '')}
            renderInput={(params) => (
              <TextField {...params} sx={getAutocompleteSx(isEditing)} />
            )}
          />
        </div>

        {/* ..... Item Assignment Fields ..... */}

        <span className={sectionHeaderClass}>Item Assignment</span>
        {/*
          One field per row, always — a 2-column [label, value] grid rather
          than flex-wrap. flex-wrap let multiple fields share a row on wide
          desktop screens; this keeps it to a single column at any width,
          matching the Costing Information / Physical Count sections below.
        */}
        <div className='grid grid-cols-[minmax(10rem,14rem)_minmax(15rem,1fr)] min-w-0 mt-2 mb-8 mr-5 gap-y-3 gap-x-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] pr-8'>
          <span className={fieldLabelClass}>Category:</span>
          <input type='text' className={staticFieldClass} value={asset.CATEGORY || ''} disabled readOnly />

          <span className={fieldLabelClass}>Asset Class:</span>
          <Autocomplete
            disabled={!isEditing}
            size='small'
            className='w-full min-w-0'
            options={refItemClassData.map((item) => item.itemClass)}
            value={asset.ItemClass || ''}
            onChange={(event, newValue) => onFieldChange('ItemClass', newValue)}
            renderInput={(params) => (
              <TextField {...params} sx={getAutocompleteSx(isEditing)} />
            )}
          />

          <span className={fieldLabelClass}>Location:</span>
          <input type='text' className={staticFieldClass} value={asset.ItemLocation || ''} disabled readOnly />

          <span className={fieldLabelClass}>Department:</span>
          <Autocomplete
            disabled={!isEditing}
            size='small'
            className='w-full min-w-0'
            options={refDeptData.map((item) => item.Department)}
            value={asset.Department || ''}
            onChange={(event, newValue) => onFieldChange('Department', newValue)}
            renderInput={(params) => (
              <TextField {...params} sx={getAutocompleteSx(isEditing)} />
            )}
          />

          <span className={fieldLabelClass}>Assigned to:</span>
          <input
            type='text'
            className={fieldValueClass(isEditing)}
            value={asset.Holder || ''}
            disabled={!isEditing}
            readOnly={!isEditing}
            onChange={(e) => onFieldChange('Holder', e.target.value)}
          />

          <span className={fieldLabelClass}>Warranty:</span>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500 whitespace-nowrap'>From</span>
            <input
              type='date'
              className={fieldValueClass(isEditing) + ' w-auto flex-none'}
              value={asset.StartDate || ''}
              disabled={!isEditing}
              readOnly={!isEditing}
              onChange={(e) => onFieldChange('StartDate', e.target.value)}
            />
            <span className='text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500 whitespace-nowrap'>to</span>
            <input
              type='date'
              className={fieldValueClass(isEditing) + ' w-auto flex-none'}
              value={asset.EndDate || ''}
              disabled={!isEditing}
              readOnly={!isEditing}
              onChange={(e) => onFieldChange('EndDate', e.target.value)}
            />
          </div>
        </div>

        {/* Physical Count Information */}
        <span className={sectionHeaderClass}>Physical Count Details</span>
        <div className='grid grid-cols-[minmax(10rem,14rem)_minmax(15rem,1fr)] min-w-0 mt-2 mb-8 mr-5 gap-y-3 gap-x-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] pr-8'>
          <span className={fieldLabelClass}>Last physical count on:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>12/31/2024</span>
          <span className={fieldLabelClass}>Inventory count sheet:</span>
          <input type='text' className={staticFieldClass} value={asset.PC_BATCH || ''} disabled readOnly />
          <span className={fieldLabelClass}>Inventory note:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Needs to evaluate for repair</span>
          <span className={fieldLabelClass}>Counted by:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Andrea</span>
          <div className='flex items-center ml-2'>
            <Checkbox />
            <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Flag for Deletion</span>
          </div>
        </div>
      </div>
    </div>
  );
}