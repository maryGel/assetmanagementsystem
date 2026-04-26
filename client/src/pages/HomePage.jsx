
import MobileHomePage from '../mobileView/pages/mobileHomePage';

//MUI
import FullWidthTabs from '../Utils/TabPanel'

function HomePage({
  setHeaderTitle,
  isMobile
}) {
  
  const tabPaths = [
    { id: 0, link: '/Home'},
    { id: 1, link: '/Home/AssetMasterPage'},
    { id: 2, link: '/Home/Movement'},
    { id: 3, link: '/Home/Depreciation'},
    { id: 4, link: '/Home/Reports'},
    { id: 5, link: '/Home/PhysicalCount'},
    { id: 6, link: '/Home/SystemSetup'},
  ];

  return (
    <>
      {!isMobile && 
        <div className='md:flex'>
          <FullWidthTabs 
            setHeaderTitle={setHeaderTitle}
            tabPaths={tabPaths}
          />
        </div> 
      }           
      <div>
        <MobileHomePage
        />
      </div>    
    </>
  );
}

export default HomePage;