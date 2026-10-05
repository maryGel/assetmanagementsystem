import AssetDisplayDepTabs from './assetDisplayDepTabs';
import formatWithCommas from '../../../Utils/formatWithCommas';
import { NumericFormat } from 'react-number-format';
import { TextField } from '@mui/material';
import { fieldLabelClass,  staticTextClass, fieldClass, } from '../../../Utils/autocompleteStyles';
import { max } from 'date-fns';

const sectionCardClass = 'py-6 shadow-sm border bg-slate-50 border-slate-200 rounded-lg min-w-0';
const sectionHeaderClass = 'block pl-5 mb-4 pb-2 border-b border-slate-100 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium';

export default function AssetDisplayValue({ asset, isEditing, onFieldChange }) {
  // Extract values as precise numeric types to ensure math calculations work perfectly
  const unitCost = Number(asset?.AAmount) || 0;
  const accumDep = Number(asset?.AccuDep) || 0;
  const depreciatedCost = Number(asset?.Depreciation) || 0;
  
  // Book Value calculation
  const bookValue = unitCost - accumDep;

  return (
    <div className='w-full min-w-0 px-10'>
      <div className={sectionCardClass}>
        <span className={sectionHeaderClass}>Costing Information</span>

        <div className='grid grid-cols-[minmax(14rem,18rem)_minmax(15rem,1fr)] min-w-0 mt-2 mb-8 mr-5 gap-y-3 gap-x-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] pr-8'>
          <span className={fieldLabelClass}>Acquisition Date: <span className={`${isEditing ? 'text-red-500' : 'text-transparent'}`}>*</span></span>
          <input
            type='date' 
            // className={`${staticFieldClass} max-w-64`} 
            value={asset?.Adate ? asset.Adate.slice(0, 10) : ''} 
            disabled={!isEditing}
            onChange={(e) => onFieldChange('Adate', e.target.value)}
            className={`${fieldClass(isEditing)} max-w-64`} 

            />
          
          <span className={fieldLabelClass}>Currency:</span>
          <span className={staticTextClass}>Php</span>
          
          <span className={fieldLabelClass}>Unit Cost: <span className={`${isEditing ? 'text-red-500' : 'text-transparent'}`}>*</span></span>
          <NumericFormat
            className={`${fieldClass(isEditing)} max-w-64`} 
            value={asset?.AAmount ?? ''} 
            disabled={!isEditing}
            decimalScale={2}
            onChange={(e) => onFieldChange('AAmount', e.target.value)}
            thousandSeparator=","
            allowNegative={false}
          />
          
          <span className={fieldLabelClass}>Residual Value: </span>
          <NumericFormat
            className={`${fieldClass(isEditing)} max-w-64`} 
            value={asset?.Abre ?? ''} 
            disabled={!isEditing}
            onChange={(e) => onFieldChange('Abre', e.target.value)}
            thousandSeparator=","
            allowNegative={false}
            decimalScale={2}

          />
          
          <span className={fieldLabelClass}>Monthly Depreciation:</span>
          <span className={staticTextClass}>{formatWithCommas(depreciatedCost)}</span>
          
          {/* Fixed Accumulated Depreciation Field */}
          <span className={fieldLabelClass}>Accumulated Depreciation:</span>
          <span className={staticTextClass}>{formatWithCommas(accumDep)}</span>
          
          <span className={fieldLabelClass}>Book Value:</span>
          <span className={staticTextClass}>{formatWithCommas(bookValue)}</span>
          
          <span className={fieldLabelClass}>Life in Years: <span className={`${isEditing ? 'text-red-500' : 'text-transparent'}`}>*</span></span>
          <NumericFormat 
            className={`${fieldClass(isEditing)} max-w-64`} 
            value={asset?.Percent || ''} 
            disabled={!isEditing}
            onChange={(e) => onFieldChange('Percent', e.target.value)}
            allowNegative={false}
          />
          
          <span className={fieldLabelClass}>Deactivation on:</span>
          <span className={staticTextClass}></span>
          
          <span className={fieldLabelClass}>Depreciation Type:</span>
          <span className={staticTextClass}>Straight Line</span>
        </div>
      </div>
      <AssetDisplayDepTabs />
    </div>
  );
}
