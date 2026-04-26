import { useState } from 'react';

//custom hooks
import {dashItems} from '../../Utils/dashItems';
import { useJO_h } from '../../hooks/useJO_h';
import { useJO_d } from '../../hooks/useJO_d';
import { useTR_h } from '../../hooks/useTR_h';
import { useTR_d } from '../../hooks/useTR_d';
import { useAD_h } from '../../hooks/useAD_h';
import { useAD_d } from '../../hooks/useAD_d';
import { useAssetAccH } from '../../hooks/useAssetAccH';
import { useAssetAccD } from '../../hooks/useAssetAccD';
import { useAssetLostH } from '../../hooks/useAssetLostH';
import { useAssetLostD } from '../../hooks/useAssetLostD';


const numStyles = 'p-3 text-2xl font-semibold text-white cursor-pointer hover:underline hover:text-gray-900 hover:drop-shadow-[0_0_1rem_black] transition-transform duration-150 active:translate-y-0.5 hover:scale-x-95';
const boxStyles = 'flex items-end justify-between w-full h-28 gap-3 px-3 shadow-md shadow-black cursor-pointer hover:text-gray-800 transition-transform duration-150  hover:border hover:border-gray-200';


function DashboardPage(useProps) {

    const [activePage, setActivePage] = useState(null); // Track which page is open
    const [isClosing, setIsClosing] = useState(false);

    // Job Orders Data
    const {joHeaders, isLoading, error, joRefresh} = useJO_h(useProps);
    const {joDetails, joDetailsRefresh} = useJO_d(useProps);
    // Transfer Data
    const {trHeaders, trHRefresh} = useTR_h(useProps);
    const {trDetails, trDRefresh} = useTR_d(useProps);
    // Disposal Data
    const {adHeaders, adHRefresh}  = useAD_h(useProps);
    const {adDetails, adDRefresh} = useAD_d(useProps);
    // Asset Accountability Data
    const {assetAccHeaders, accHRefresh} = useAssetAccH(useProps);
    const {assetAccDetails, accDRefresh} = useAssetAccD(useProps);
    // Asset Lost Data
    const {assetLostHeaders, aLostHRefresh} = useAssetLostH(useProps);
    const {assetLostDetails, aLostDRefresh} = useAssetLostD(useProps);

    // Count the pending docs
    const joCount = (joHeaders || []).filter(jo => (jo.xpost === 3 || jo.xpost === 2) && jo.DISAPPROVED === 0).length;
    const maintCount = (joHeaders || []).filter(jo => (jo.xpost === 1 && !jo.main_stat)).length;
    const trCount = (trHeaders || []).filter(tr => (tr.xpost === 3 || tr.xpost === 2) && tr.DISAPPROVED === 0).length;
    const adCount = (adHeaders || []).filter(ad => (ad.xpost === 3 || ad.xpost === 2) && ad.DISAPPROVED === 0).length;
    const aAcctCount = (assetAccHeaders || []).filter(aa => (aa.xPosted === 3 || aa.xPosted === 2) && aa.DISAPPROVED === 0).length;
    const aLostCount = (assetLostHeaders || []).filter(al => (al.xPosted === 3 || al.xPosted === 2) && al.DISAPPROVED === 0).length;

    // Count of Documents template
    const items = dashItems({
      joCount, maintCount, trCount, adCount, aAcctCount, aLostCount
    });


     // Render the active page
    // const renderActivePage = () => {
    //     const pageProps = {
    //         onClose: handleClosePage,
    //         isClosing: isClosing,
    //         onAnimationEnd: handleAnimationEnd,
    //         joHeaders, joDetails, isLoading, error, joRefresh, joDetailsRefresh,
    //         trHeaders, trDetails, trHRefresh, trDRefresh,
    //         adHeaders, adDetails, adHRefresh, adDRefresh,
    //         assetAccHeaders, assetAccDetails, accHRefresh, accDRefresh,
    //         assetLostHeaders, assetLostDetails, aLostHRefresh, aLostDRefresh,
    //         selectedUser, useProps
    //     };

    //     switch(activePage) {
    //         case 1:
    //             return <MvJobOrderPage {...pageProps} />;
    //         case 2:
    //             return <MvMaintenancePage {...pageProps} />;
    //         case 3:
    //             return <MvTransferPage {...pageProps} />;
    //         case 4:
    //             return <MvAssetAccPage {...pageProps} />;
    //         case 5:
    //             return <MvDisposalPage {...pageProps} />;
    //         case 6:
    //             return <MvAssetLostPage {...pageProps} />;
    //         default:
    //             return null;
    //     }
    // };
    
    return (
      <div className='gap-4'>
          <div className='flex gap-4 p-4 rounded-lg '>
            {items.map(item => (
            <button 
              key={item.id}
              // onClick={() => handleOpenPage(item.id)}
              className={`bg-white ${boxStyles} ${activePage ? 'pointer-events-none' : ''}`}
              disabled={!!activePage}
            >
              <div className='flex flex-col gap-2 p-3 '>
                  <img
                      className='w-10 h-10 bg-white'
                      src={item.imgSrc}
                      alt={item.title}
                  />
                  <span className='text-lg font-medium tracking-wide text-sky-600 hover:text-gray-800'>{item.title}</span>
              </div>
              <span className={`p-3 text-2xl font-semibold text-sky-600 ${numStyles}`}>{item.num}</span> 
            </button>
          ))}
          </div>
      </div>    
    );
}

export default DashboardPage;