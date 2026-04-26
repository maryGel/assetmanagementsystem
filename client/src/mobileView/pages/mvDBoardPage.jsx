// mvDBoardPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Custom Hooks
import {dashItems} from '../components/dashItems';
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

// Import the page components
import MvJobOrderPage from './mvJobOrdersPage';
import MvTransferPage from './mvTransferPage';
import MvDisposalPage from './mvDisposalPage';
import MvAssetAccPage from './mvAssetAccPage';
import MvAssetLostPage from './mvAssetLostPage';
import MvMaintenancePage from './mvMaintenancePage';

function MvDashBoard({useProps, firstName, selectedUser}){
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

    const numStyles = 'pb-2 mr-2 text-xl font-semibold cursor-pointer hover:underline hover:drop-shadow-[0_0_0.5rem_gray] transition-transform duration-150 active:translate-y-0.5 hover:scale-x-95';
    const boxStyles = 'p-1 flex justify-between h-auto shadow-md shadow-gray rounded-lg border';

    // Handle opening a page
    const handleOpenPage = (pageId) => {
        setActivePage(pageId);
        setIsClosing(false);
    };

    // Handle closing a page
    const handleClosePage = () => {
        setIsClosing(true);
    };

    // Handle animation end
    const handleAnimationEnd = () => {
        if (isClosing) {
            setActivePage(null);
            setIsClosing(false);
        }
    };

    // Render the active page
    const renderActivePage = () => {
        const pageProps = {
            onClose: handleClosePage,
            isClosing: isClosing,
            onAnimationEnd: handleAnimationEnd,
            joHeaders, joDetails, isLoading, error, joRefresh, joDetailsRefresh,
            trHeaders, trDetails, trHRefresh, trDRefresh,
            adHeaders, adDetails, adHRefresh, adDRefresh,
            assetAccHeaders, assetAccDetails, accHRefresh, accDRefresh,
            assetLostHeaders, assetLostDetails, aLostHRefresh, aLostDRefresh,
            selectedUser, useProps
        };

        switch(activePage) {
            case 1:
                return <MvJobOrderPage {...pageProps} />;
            case 2:
                return <MvMaintenancePage {...pageProps} />;
            case 3:
                return <MvTransferPage {...pageProps} />;
            case 4:
                return <MvAssetAccPage {...pageProps} />;
            case 5:
                return <MvDisposalPage {...pageProps} />;
            case 6:
                return <MvAssetLostPage {...pageProps} />;
            default:
                return null;
        }
    };

    

    return (
      <div className='relative flex flex-col min-h-screen overflow-hidden bg-white md:hidden'>
        {/* Dashboard Content - Dimmed when a page is open */}
        <div className={`flex flex-col flex-1 transition-all duration-300 ${
          activePage ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
        }`}>
          <div className='flex items-center w-auto h-auto p-1 pt-5 bg-white border-b'>
            <img
                className='w-12 h-10 pl-2 ml-2'
                src='/tripleeyelogo.png'
                alt="Logo"
            />
            <span className='font-sans tracking-wider text-black'>Asset Management</span>
          </div>

          <div className='flex items-center justify-between px-5 pt-3 pb-3 m-4 font-semibold tracking-wide bg-blue-100 rounded-md shadow-md text-md'>
            <h1 className='pl-1 font-sans'>Dashboard</h1>
            <img
                className='w-8'
                src='/icons/menu_icons/dashboard.png'
                alt="Dashboard"
            />
          </div>  
          
          <h1 className='mt-5 ml-5'>Hi, {firstName}!</h1>

          <div className='grid w-full grid-cols-2 gap-3 px-4 mt-7'>                
            {items.map(item => (
              <button 
                key={item.id}
                onClick={() => handleOpenPage(item.id)}
                className={`flex items-end bg-white ${boxStyles} ${
                  activePage ? 'pointer-events-none' : ''
                }`}
                disabled={!!activePage}
              >
                <div className='flex flex-col justify-start gap-2 p-3'>
                    <img
                        className='w-8 h-8 bg-white'
                        src={item.imgSrc}
                        alt={item.title}
                    />
                    <span>{item.title}</span>
                </div>
                <span className={numStyles}>{item.num}</span> 
              </button>
            ))}
          </div>
        </div>

        {/* Sliding Page */}
        {activePage && renderActivePage()}
      </div>
    )
}

export default MvDashBoard;