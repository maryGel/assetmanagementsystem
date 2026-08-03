import React from 'react';
import { NavLink } from 'react-router-dom';
import { assetTileList } from './assetTilelist';


function AssetMasterTile({setHeaderTitle}) {

  return (
    <div className='grid items-start w-full h-full grid-cols-[repeat(auto-fit,minmax(8.5rem,8.5rem))] gap-2 md:gap-3 lg:gap-2'>
      {assetTileList.map((asset) => (
        <div key= {asset.id} className='flex flex-col items-center justify-center w-full h-full'>
          <NavLink  to = {asset.link} >
            <button className='w-32 h-32 p-4 mb-3 bg-white border border-blue-100 border-solid rounded-lg shadow-lg text-sky-900 group hover:shadow-none hover:border-gray-800 hover:bg-gray-50 hover:text-sky-600 hover:font-semibold'
              onClick={() => setHeaderTitle(asset.headerTitle)}
            >
              <img className='w-2/3 mb-2' src = {asset.imgSrc} alt= {asset.title} />
              <span className='text-sm text-center'>
                {asset.title}
              </span> 
            </button>
          </NavLink>
        </div>
      ))}
    </div>
  )
}

export default AssetMasterTile ;