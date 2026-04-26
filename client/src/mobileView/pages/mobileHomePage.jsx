import { useEffect } from 'react';
import { useNavigate, useLocation, useMatch} from 'react-router-dom';
// Hooks
import {useUsers} from '../../hooks/useUsers';
// Components
import MvDashBoard from './mvDBoardPage'
import MvTansactionPage from './mvTransactionPage';
import MvHeader from '../components/mvHeader'
import MvAccountPage from './mvAccountPage';



function MobileHomePage(){
    const navigate = useNavigate();
    const userName = localStorage.getItem('username') || 'User';
    const { 
        selectedUser, 
        setSelectedUser, 
        loading, 
    } = useUsers();

    useEffect(() => {
        if (userName && userName !== 'User') {
            console.log('Setting selected user:', userName);
            setSelectedUser(userName);
        }
    }, [userName, setSelectedUser]);

    const firstName = selectedUser?.fname || userName;  

    // Method 1: useMatch (most reliable for route-based highlighting)
    const isExactHome = useMatch('/Home');
    const isTransactions = useMatch('/Home/TransactionPage/*');
    const isAccount = useMatch('/Home/AccountPage/*');
    
    // Method 2: If you need more complex logic with pathname
    const location = useLocation();
    const pathname = location.pathname;
    
    // Using useMatch (recommended for tab highlighting)
    const isHomeTab = !!isExactHome; // true only for /Home
    const isTransTab = !!isTransactions; // true for /Home/TransactionPage and any sub-routes
    const isAcctTab = !!isAccount
    
    // Or using pathname for more control
    const isHomeByPath = pathname === '/Home' || pathname === '/Home/';
    const isTransByPath = pathname.startsWith('/Home/TransactionPage');
    const isAccountByPath = pathname.startsWith('/Home/AccountPage');

    // Navigate to Mobile Transaction Page
    const handleOnClickHome = () => {
      const path = `/Home`;
      navigate(path);    
    }

    // Navigate to Mobile Transaction Page
    const handleOnClickTrans = () => {
        const path = `/Home/TransactionPage`;
        navigate(path);        
    }

    // Navigate to Mobile Transaction Page
    const handleOnClickAcct = () => {
        const path = `/Home/AccountPage`;
        navigate(path);  
    }
    

    return(
        <>
          {pathname === '/Home' &&
            <div className='flex flex-col min-h-screen bg-gray-100 md:hidden'>
              <MvDashBoard
                userName  = {userName}
                selectedUser = {selectedUser}
                firstName = {firstName}
              />
            </div>          
          }
          {pathname === '/Home/TransactionPage' &&
            <div className='md:hidden'>
              <MvTansactionPage
              />
            </div>          
          }
          {isAccountByPath &&
            <div className='md:hidden'>
              <MvAccountPage
                userName  = {userName}
                selectedUser = {selectedUser}
              />
            </div>   
          }
        <MvHeader
          isAccountByPath={isAccountByPath}
          isHomeByPath={isHomeByPath}
          isTransByPath={isTransByPath}
          handleOnClickHome = {handleOnClickHome}
          handleOnClickTrans = {handleOnClickTrans}
          handleOnClickAcct = {handleOnClickAcct}   
        />
        </>
    );
};

export default MobileHomePage;