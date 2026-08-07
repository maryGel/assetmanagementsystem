import { assetPhyList } from './assetPhyList';

function PhysicalCount() {
  return (
    <div className='grid items-start w-full h-full grid-cols-[repeat(auto-fit,minmax(8.5rem,8.5rem))] gap-2 md:gap-3 lg:gap-2'>

      {/* Asset Acquisition Tile */}
      {assetPhyList.map((item) => (
        <div key={item.id} className='flex flex-col items-center justify-center w-full h-full'>
            <button 
              className={`w-32 h-32 p-3 mb-3 bg-white border border-blue-100 border-solid rounded-lg shadow-lg
                         text-sky-900 group hover:shadow-none hover:border-gray-800 hover:bg-gray-50
                          hover:text-sky-600 hover:font-semibold`}       
              onClick={() => window.location.href = item.link}
              >
              <img className='w-2/3 mb-3' src={item.imgSrc} alt={item.title} />
              <span className='text-sm tracking-normal text-center'>
              {item.title}
              </span>
            </button>
        </div>
      ))}
    
    </div>
  )
}

export default PhysicalCount;