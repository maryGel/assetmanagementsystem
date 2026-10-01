import AssetDisplayDepTabs from './assetDisplayDepTabs';
import formatWithCommas from '../../../Utils/formatWithCommas';
import { fieldLabelClass, staticFieldClass, staticTextClass } from '../../../Utils/autocompleteStyles';

const sectionCardClass = 'py-6 shadow-sm border border-slate-200 rounded-lg bg-white min-w-0';
const sectionHeaderClass = 'block pl-5 mb-4 pb-2 border-b border-slate-100 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium';

export default function AssetDisplayValue({ asset }) {
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
          <span className={fieldLabelClass}>Acquisition Date:</span>
          <input type='date' className={`${staticFieldClass} max-w-64`} value={asset?.Adate ? asset.Adate.slice(0, 10) : ''} disabled readOnly />
          
          <span className={fieldLabelClass}>Currency:</span>
          <span className={staticTextClass}>Php</span>
          
          <span className={fieldLabelClass}>Unit Cost:</span>
          <input type='text' className={`${staticFieldClass} max-w-64`} value={formatWithCommas(unitCost)} disabled readOnly />
          
          <span className={fieldLabelClass}>Residual Value:</span>
          <input type='text' className={`${staticFieldClass} max-w-64`} value={formatWithCommas(Number(asset?.Abre) || 0)} disabled readOnly />
          
          <span className={fieldLabelClass}>Monthly Depreciation:</span>
          <span className={staticTextClass}>{formatWithCommas(depreciatedCost)}</span>
          
          {/* Fixed Accumulated Depreciation Field */}
          <span className={fieldLabelClass}>Accumulated Depreciation:</span>
          <span className={staticTextClass}>{formatWithCommas(accumDep)}</span>
          
          <span className={fieldLabelClass}>Book Value:</span>
          <span className={staticTextClass}>{formatWithCommas(bookValue)}</span>
          
          <span className={fieldLabelClass}>Life in Years:</span>
          <input type='text' className={`${staticFieldClass} max-w-64`} value={asset?.Percent || ''} disabled readOnly />
          
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
