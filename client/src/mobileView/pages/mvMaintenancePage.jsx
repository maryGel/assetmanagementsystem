import { useState, useMemo } from 'react';
// MUI
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';

// Components
import MvEvalJOForm from '../components/mvEvalJOForm';
import MvMaintenanceForm from '../components/mvMaintenanceForm';



function MvMaintenancePage({
  isClosing,
  onClose,
  onAnimationEnd,
  joHeaders = [],
  joDetails = [],
  joRefresh,
  joDetailsRefresh,
  isLoading = false,
  error = null,

  }){

  const [isOpenEvalJo, setIsOpenEvalJo] = useState(true);
  const [isOpenMainForm, setIsOpenMainForm] = useState(false);


  // ... Handlers
 
  const handleClosePage = () => {if(onClose) onClose()};

  const handleOpenEvalJo = () => {
    setIsOpenEvalJo(true);
    setIsOpenMainForm(false);
  };

  const handleOpenMaintenance = () => {
    setIsOpenEvalJo(false)
    setIsOpenMainForm(true)
  };

  return (
    <>
      <div onAnimationEnd={onAnimationEnd} className={`          
        fixed inset-0 z-50 items-start w-full max-h-screen overflow-y-auto 
        bg-white ${isClosing ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}>
        <div className="flex flex-col py-1">

          <button className='w-5 px-4 py-2' onClick={handleClosePage}> 
              <ArrowBackIosIcon fontSize='small'/>
          </button>
        
          
          <div className='flex flex-col'>
            <div className='flex items-center justify-between text-sm tracking-wider border-b text-slate-600'>
              <div className={`flex items-center justify-center w-full p-2 ${isOpenEvalJo ? 'border-b border-blue-600 text-blue-600' : ''}`}>
                <button className='cursor-pointer' onClick={() => handleOpenEvalJo()}>Evaluate JO</button>
              </div>
              <span>|</span>
              <div className={`flex items-center justify-center w-full p-2 ${isOpenMainForm ? 'border-b border-blue-600 text-blue-600' : ''}`}>
                <button className='cursor-pointer' onClick={() => handleOpenMaintenance()}>Maintenance</button>
              </div>
            </div>           
          </div>  

          {isOpenEvalJo && 
            <MvEvalJOForm
              joHeaders = {joHeaders}
              joDetails = {joDetails}
              joRefresh={joRefresh}        
              joDetailsRefresh={joDetailsRefresh}    
            />  
          }   
          {isOpenMainForm &&
            <MvMaintenanceForm
              joHeaders = {joHeaders}
              joDetails = {joDetails}     
              joRefresh={joRefresh}        
              joDetailsRefresh={joDetailsRefresh}        
            />
          }                
        </div>            
      </div>        
    </>
    )
}

export default MvMaintenancePage;