import AssetDisplayDepTabs from './assetDisplayDepTabs';
import formatWithCommas from '../../../Utils/formatWithCommas';

export default function AssetDisplayValue({asset, isEditing, setIsEditing, onFieldChange}){
 console.log(`asset date: ${asset.Adate}`)
  return(
    <div className='w-full min-w-0 px-10'>
      <div className='pt-5 pb-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] shadow-sm shadow-slate-200 bg-gray-50 min-w-0'>
        {/* General Information Fields */}
        <span className='pl-5 mb-2 text-blue-800 text-[clamp(0.85rem,0.7rem+0.6vw,1.125rem)] font-medium'>Costing Information</span>

        {/*
          minmax() lets the label column stay readable while the value
          column absorbs extra width, instead of a rigid 15rem/1fr split.
          min-w-0 is required for that shrinking to actually happen.
        */}
        <div className='grid grid-cols-[minmax(12rem,15rem)_minmax(15rem,1fr)] min-w-0 mt-5 ml-0 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] bg-gray-50'>
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Capitalization Type</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>1. Acquisition - by Purchase</span>
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Acquisition Date:</span>
          <input type='date' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.Adate? asset.Adate.slice(0,10): ""} disabled readOnly />
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Currency:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Php</span>         
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Unit Cost:</span>
          <input type='text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={formatWithCommas(asset.AAmount)} disabled readOnly />
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Residual Value:</span>
          <input type='text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={formatWithCommas(asset.Abre)} disabled readOnly />
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Depreciated Cost:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>00.00</span>
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Book Value:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>98,521.00</span>
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Life in Years:</span>
          <input type='text' className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500' value={asset.Percent} disabled readOnly />
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Deactivation on:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'></span>
          <span className='p-2 pl-5 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] tracking-wider text-gray-500'>Depreciation Type:</span>
          <span className='p-2 text-[clamp(0.72rem,0.55rem+0.6vw,1rem)] text-gray-500'>Straight Line</span>
        </div>      
      </div>
      <AssetDisplayDepTabs/>
    </div>
  )
}