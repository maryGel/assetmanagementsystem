import { useState, useEffect } from 'react';
// Custom Hooks
import { headerTitleMap, getBackPath  } from './headerTitleMap';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useUsers } from '../hooks/useUsers';

// MUI Icons
import { Box, InputBase, Menu, MenuItem, CircularProgress, Backdrop, Button } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';


function Header({ username, headerTitle, setHeaderTitle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const isHomeTab = currentPath.includes('/Home');
  const [anchorEl, setAnchorEl] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Get the user first name for greeting
  const { 
    selectedUser, 
    setSelectedUser, 
    loading, 
  } = useUsers();

   useEffect(() => {
    if (username && username !== 'User') {
      console.log('Setting selected user:', username);
      setSelectedUser(username);
    }
  }, [username, setSelectedUser]);
    
  const firstName = selectedUser?.fname || username;
  
  const isMenuOpen = Boolean(anchorEl);
  
  // derive title from URL
  const title = headerTitleMap[currentPath] || '';

  useEffect(() => {
    setHeaderTitle(title);
  }, [title]);

  const backPath = getBackPath(currentPath);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  
  const handleMenuClose = () => setAnchorEl(null);
    const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isLoggedIn'); 

    handleMenuClose();
    setIsLoggingOut(true);
    
    setTimeout(() => {
      navigate('/');
    }, 1000); // Show loading for 3 secondsge
  }

  const handleBackChange = () => {
    navigate(backPath)
  }

  return (
    <>
      {/* Global Loading Overlay */}
      <Backdrop
        sx={{ 
          color: '#fff', 
          zIndex: (theme) => theme.zIndex.drawer + 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }}
        open={isLoggingOut}
      >
        <Box 
          sx={{ 
            color: 'white', 
            fontSize: '1.2rem',
            fontWeight: 500,
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CircularProgress className='mr-2' color="inherit" size={40} />
            <span>Logging out...</span>
        </Box>
      </Backdrop>

      <header className="items-center p-2 pl-6 tracking-wider text-black bg-blue-100 md:flex">
        <button className="transition-transform duration-150 active:translate-y-0.5 hover:scale-x-95 mr-1">
          {isHomeTab 
            ? ( <Button onClick={() => { navigate('/Home')}} className='rounded-full'>
                  <HomeIcon sx={{ fontSize: 30, color: 'Black' }} />
                </Button>) 
            : ( <Button onClick= {handleBackChange}>
                  <ChevronLeftIcon sx={{ fontSize: 30, color: 'Black'  }} />
                </Button>)
          }
        </button>

        <h1>{headerTitle}</h1>

        <div className="flex ml-auto mr-6 space-x-6 place-items-center">
          <Box
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'white',
              padding: '0.1rem 0.5rem',
              borderRadius: '10rem',
              width: isHovered ? '30rem' : '5rem',
              transition: 'width 0.4s ease-in-out',
              overflow: 'hidden',
              cursor: 'pointer',
              border: '1px solid gray',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SearchIcon sx={{ fontSize: 28, color: 'black' }} />
            </Box>
            <InputBase
              placeholder="Search..."
              sx={{
                ml: 1,
                flex: 1,
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
                visibility: isHovered ? 'visible' : 'hidden',
              }}
            />
          </Box>

          <button disabled={isLoggingOut}>
            <HistoryIcon sx={{ fontSize: 30, marginRight: 1 }} />
          </button>
          <button disabled={isLoggingOut}>
            <NotificationsIcon sx={{ fontSize: 30, marginRight: 1 }} />
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMenuOpen}
              aria-controls={isMenuOpen ? 'account-menu' : undefined}
              aria-haspopup="true"
              disabled={isLoggingOut}
            >
              <AccountCircleIcon sx={{ fontSize: 30, marginRight: 1 }} />
            </button>
            <span className='flex gap-1'>Hi <img className='w-5' src='/icons/actions/wavehand.png'/>, {firstName}!</span>

            <Menu
              id="account-menu"
              anchorEl={anchorEl}
              open={isMenuOpen}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem 
                onClick={handleLogout}
                disabled={isLoggingOut}
                sx={{
                  minWidth: 120,
                  justifyContent: 'center',
                  color: isLoggingOut ? 'text.disabled' : 'error.main'
                }}
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </MenuItem>
            </Menu>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;