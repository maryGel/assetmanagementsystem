import {useState} from 'react';
import RefTabs from '../referentials/refTabs';
import RefUom from '../referentials/refUom';
import RefBrand from '../referentials/refBrand';
import RefCategory from '../referentials/refCategory';
import RefItemClass from '../referentials/refItemClass';
import RefLocation from '../referentials/refLocation';
import RefDepartment from '../referentials/refDepartment';
import RefColor from '../referentials/refColor';
import RefSection from '../referentials/refSection';
import RefSupplier from '../referentials/refSupplier';

function ReferentialPage() {

  const [openTab, setOpenTab] = useState()

  const handleOpenTab = (tab) => setOpenTab(tab);

  return (

      <div className='flex p-5 m-12 border rounded-lg bg-slate-50 border-spacing-1'>
    
        <RefTabs
          handleOpenTab = {handleOpenTab}
        />
        
        <div className='flex ml-5'>
          <RefUom 
            openTab = {openTab}
          />
          <RefBrand 
            openTab = {openTab}
          />
          <RefColor 
            openTab={openTab}
          />
          <RefCategory
            openTab = {openTab}
          />
          <RefItemClass
            openTab = {openTab}      
          />
          <RefLocation
            openTab = {openTab}      
          />
          <RefDepartment
            openTab = {openTab}      
          />
          <RefSection
            openTab = {openTab}
          />
          <RefSupplier
            openTab = {openTab}
          />

        </div>
      </div>
  );
}

export default ReferentialPage;