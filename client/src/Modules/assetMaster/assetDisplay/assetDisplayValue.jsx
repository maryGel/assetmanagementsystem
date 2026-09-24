import AssetDisplayDepTabs from './assetDisplayDepTabs';
import formatWithCommas from '../../../Utils/formatWithCommas';

// Matches the styling used in assetDisplayGenInfo.jsx: a white card with a
// hairline border and soft shadow instead of a flat gray fill, and
// read-only values shown as quiet muted text rather than a greyed-out
// disabled input.
const sectionCardClass = 'py-6 shadow-sm border border-slate-200 rounded-lg bg-white min-w-0';
const sectionHeaderClass = 'block pl-5 mb-4 pb-2 border-b border-slate-100 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium';
const fieldLabelClass = 'p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500';
const staticFieldClass =
  'w-full min-w-0 px-2.5 py-1.5 rounded text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] border border-slate-200 bg-slate-50 text-slate-500';

export default function AssetDisplayValue({ asset }) {
  return (
    <div className='w-full min-w-0 px-10'>
      <div className={sectionCardClass}>
        {/* General Information Fields */}
        <span className={sectionHeaderClass}>Costing Information</span>

        {/*
          minmax() lets the label column stay readable while the value
          column absorbs extra width, instead of a rigid 15rem/1fr split.
          min-w-0 is required for that shrinking to actually happen.
        */}
        <div className='grid grid-cols-[minmax(10rem,14rem)_minmax(15rem,1fr)] min-w-0 mt-2 mb-8 mr-5 gap-y-3 gap-x-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] pr-8'>
          <span className={fieldLabelClass}>Capitalization Type</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>1. Acquisition - by Purchase</span>
          <span className={fieldLabelClass}>Acquisition Date:</span>
          <input type='date' className={staticFieldClass} value={asset.Adate ? asset.Adate.slice(0, 10) : ''} disabled readOnly />
          <span className={fieldLabelClass}>Currency:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Php</span>
          <span className={fieldLabelClass}>Unit Cost:</span>
          <input type='text' className={staticFieldClass} value={formatWithCommas(asset.AAmount)} disabled readOnly />
          <span className={fieldLabelClass}>Residual Value:</span>
          <input type='text' className={staticFieldClass} value={formatWithCommas(asset.Abre)} disabled readOnly />
          <span className={fieldLabelClass}>Depreciated Cost:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>00.00</span>
          <span className={fieldLabelClass}>Book Value:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>98,521.00</span>
          <span className={fieldLabelClass}>Life in Years:</span>
          <input type='text' className={staticFieldClass} value={asset.Percent || ''} disabled readOnly />
          <span className={fieldLabelClass}>Deactivation on:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'></span>
          <span className={fieldLabelClass}>Depreciation Type:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Straight Line</span>
        </div>
      </div>
      <AssetDisplayDepTabs />
    </div>
  );
}