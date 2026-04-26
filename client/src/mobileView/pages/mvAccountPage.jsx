import { useMemo, useEffect } from 'react';
import PersonIcon from '@mui/icons-material/Person';
import EngineeringIcon from '@mui/icons-material/Engineering';
import BusinessIcon from '@mui/icons-material/Business';
import WorkIcon from '@mui/icons-material/Work';
import LogoutIcon from '@mui/icons-material/Logout';
// Hooks

function MvAccountPage({
 selectedUser,

}){

  

    return (
      <>
        <div className='flex flex-col h-svh'>
          <div className='w-full pt-10 pb-3 pl-8 text-white bg-cyan-950'>
            <PersonIcon fontSize= 'large' sx={{width: 50,}}/>
            <span>{selectedUser.user}</span>
          </div>
          <div className='flex flex-col w-full mt-20 text-sm text-slate-500'>

            <span className='p-3 border-t border-spacing-1 '>{selectedUser.fname} {selectedUser.lname}</span>
            <span className='p-3 border-t border-spacing-1 '><span><WorkIcon/> </span>Position: {selectedUser.xPosi}</span>
            <span className='p-3 border-t border-spacing-1 '><span><BusinessIcon/> </span>Department: {selectedUser.xDept}</span>
            {selectedUser.xSection &&  <span className='p-3 border shadow-md border-spacing-1'><span><EngineeringIcon/> </span>Maintenance: {selectedUser.xSection}</span>}            
          </div>
          <div className='flex flex-col w-full mt-10 text-md'>
            <span className='p-3 pl-10 border bg-slate-200 border-spacing-1 '><span><LogoutIcon/> </span>Logout</span>
          </div>
        </div>
      
      </>
    )

}

export default MvAccountPage;