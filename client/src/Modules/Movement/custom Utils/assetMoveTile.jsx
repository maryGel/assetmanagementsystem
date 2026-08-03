import { assetMovList } from './asstMovList';
import { NavLink } from 'react-router-dom';

function AssetMovement() {
  return (
    // fluid grid: column count grows with available width instead of a
    // fixed grid-cols-10, so tiles reflow smoothly across md/lg/xl instead
    // of getting cramped (or oddly sparse) at fixed breakpoints
    <div className='grid items-start w-full h-full grid-cols-[repeat(auto-fit,minmax(8.5rem,8.5rem))] gap-2 md:gap-3 lg:gap-2'>

      {/* Asset Acquisition Tile */}
      {assetMovList.map((item) => (
        <div key={item.id} className='flex flex-col items-center justify-center w-full h-full'>
          <NavLink to = {item.link}>
            <button className='p-3 mb-3 bg-white border border-blue-100 border-solid rounded-lg shadow-lg w-28 h-28 md:w-32 md:h-32 md:p-4 text-sky-900 group hover:shadow-none hover:border-gray-800 hover:bg-gray-50 hover:text-sky-600 hover:font-semibold'>
              <img className='w-2/3 mb-3' src={item.imgSrc} alt={item.title} />
              <span className='text-xs tracking-normal text-center md:text-sm'>
              {item.title}
              </span>
          </button>
          </NavLink>
        </div>
      ))}
    
    </div>
  )
}

export default AssetMovement;