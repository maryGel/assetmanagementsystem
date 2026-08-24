import { useState } from "react";
// MUI
import { CircularProgress, InputAdornment, TextField } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import KeyIcon from '@mui/icons-material/Key';
import { api } from '../api/axios';
import { useNavigate } from "react-router-dom";

function LoginPage({setHeaderTitle, setUsername}) {
  const [localUsername, setLocalUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(""); // Add debug state

  const navigate = useNavigate();

  // Update the handleLogin function in LoginPage.jsx
  const handleLogin = async (e) => {
    setHeaderTitle("Asset Management System");

    if (e) e.preventDefault();
    
    if (!localUsername.trim() || !password.trim()) return setErrorMsg("Please enter both username and password");

    setIsLoading(true);
    setErrorMsg("");
    setDebugInfo("Attempting login...");

    try {
      setDebugInfo(`Sending to: ${api.defaults.baseURL}/login`);
      
      const res = await api.post("/login", {
        user: localUsername.trim(),
        password: password.trim(),
      });

      setDebugInfo(`Response received! Status: ${res.status}`);
      
      if (res.data.success) {
        // Store basic auth data
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('Admin', res.data.Admin === 1);
        localStorage.setItem('username', localUsername.trim());
        
        // Store department information
        if (res.data.departments) {
          localStorage.setItem('userDepartments', JSON.stringify(res.data.departments));
          console.log('User departments:', res.data.departments);
        }
        
        if (res.data.multiDept) {
          localStorage.setItem('multiDept', res.data.multiDept);
        }
        
        // Store in session storage as well for additional security
        sessionStorage.setItem('userDepartments', JSON.stringify(res.data.departments || []));
        sessionStorage.setItem('isAdmin', res.data.Admin === 1);
        
        if (setUsername) setUsername(localUsername.trim());
        
        // Show success message with department info (optional)
        if (res.data.departments && res.data.departments.length > 0) {
          console.log(`✅ Login successful - Departments: ${res.data.departments.join(', ')}`);
        } else if (!res.data.Admin) {
          console.warn('⚠️ User has no departments assigned');
        }
        
        navigate('/Home');
      } else {
        setErrorMsg(res.data.message || "Login failed");
        setDebugInfo(`Login failed: ${res.data.message}`);
      }
    } catch (err) {
      console.error("❌ Login error:", err);
      
      // Detailed error display
      let errorDetail = "";
      if (err.code === 'ERR_NETWORK') {
        errorDetail = "Network error - cannot reach server";
        setDebugInfo(`Network error: ${err.message}`);
      } else if (err.code === 'ECONNABORTED') {
        errorDetail = "Connection timeout";
        setDebugInfo(`Timeout error`);
      } else if (err.response) {
        errorDetail = err.response.data.message || "Server error";
        setDebugInfo(`Server error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
      } else if (err.request) {
        errorDetail = "No response from server";
        setDebugInfo(`No response: Request was sent but no reply`);
      } else {
        errorDetail = "Unexpected error";
        setDebugInfo(`Error: ${err.message}`);
      }
      
      setErrorMsg(errorDetail);
    } finally {
      setIsLoading(false);
    }
  };

  const testHealth = async () => {
    try {
      setDebugInfo(`Testing health at: ${api.defaults.baseURL}/health`);
      const res = await api.get('/health');
      setDebugInfo(`Health OK: ${JSON.stringify(res.data)}`);
      alert(`Server health: ${res.data.status}`);
    } catch (err) {
      setDebugInfo(`Health failed: ${err.message}`);
      alert('Cannot connect to server');
    }
  };

  return (
    <>
      {isLoading && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/35"
          role="status"
          aria-live="polite"
        >
          <CircularProgress size={52} sx={{ color: 'white' }} />
          <p className="text-sm font-medium text-white">Signing in…</p>
        </div>
      )}
      <div className={`flex h-screen `}>
        <section className={`grid w-full place-content-center bg-[url('/loginBg.png')] bg-cover`}>
          <h1 className={`font-sans lg:p-4 lg:text-2xl tracking-wider text-center justify-center p-3`}>
            Asset Management System
          </h1>

          {/* Debug info panel - TEMPORARY for testing */}
          {debugInfo && (
            <div className="p-3 mb-4 overflow-auto text-xs text-white bg-gray-800 rounded max-w-96">
              <strong>Debug:</strong> {debugInfo}
            </div>
          )}

          <div className={`flex flex-col w-96  bg-white rounded-2xl shadow-md gap-3 lg:p-8 py-8 px-4 bg-opacity-40`}>
              {errorMsg && (
                <div className="p-3 mb-4 text-sm text-red-600 border border-red-200 rounded bg-red-50">
                  {errorMsg}
                </div>
              )}

              <form className='flex flex-col gap-2'>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Username"
                  value={localUsername}
                  onChange={(e) => setLocalUsername(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: '#9ca3af' }} /> {/* gray-400 */}
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    // The Container Styling
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',      // bg-white
                      borderRadius: '2rem',          // rounded-xl (12px is standard for xl)    
                      // The Border (Normal State)
                      '& fieldset': {
                        borderColor: '#e5e7eb',      // border-gray-200
                        borderWidth: '1px',
                      },                  
                      // The Border (Hover State)
                      '&:hover fieldset': {
                        borderColor: '#d1d5db',      // border-gray-300 (slight darken on hover)
                      },                  
                      // The Border (Focused State)
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',      // blue-500 (or keep gray if you prefer)
                        borderWidth: '1px',          // Prevents the border from getting thick
                      },
                    },
                    // 2. The Label Styling
                    '& .MuiInputLabel-root': {
                      color: '#6b7280',              // text-gray-500
                      '&.Mui-focused': {
                        color: '#3b82f6',            // Matches focus border
                      },
                    },
                  }}
                />

                <TextField
                  type="password"
                  className="rounded-md"
                  placeholder='Password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <KeyIcon sx={{ color: '#9ca3af' }} /> {/* gray-400 */}
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    // The Container Styling
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',      // bg-white
                      borderRadius: '2rem',          // rounded-xl (12px is standard for xl)    
                      // The Border (Normal State)
                      '& fieldset': {
                        borderColor: '#e5e7eb',      // border-gray-200
                        borderWidth: '1px',
                      },                  
                      // The Border (Hover State)
                      '&:hover fieldset': {
                        borderColor: '#d1d5db',      // border-gray-300 (slight darken on hover)
                      },                  
                      // The Border (Focused State)
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',      // blue-500 (or keep gray if you prefer)
                        borderWidth: '1px',          // Prevents the border from getting thick
                      },
                    },
                    // 2. The Label Styling
                    '& .MuiInputLabel-root': {
                      color: '#6b7280',              // text-gray-500
                      '&.Mui-focused': {
                        color: '#3b82f6',            // Matches focus border
                      },
                    },
                  }}
                />

                <button
                  type="submit"
                  className={`p-2 m-2 text-white rounded transition-colors ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-black hover:bg-blue-700'
                  }`}
                  onClick={handleLogin}              
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if(e.key === 'Enter' && !isLoading){
                      handleLogin();
                    }
                  }}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </button>
              </form>

            <h4 className="pl-2 text-sm text-left text-blue-600 cursor-pointer hover:underline">
              Forgot password?
            </h4>
          </div>

          <button
            className="p-2 m-2 text-white bg-green-600 rounded hover:bg-green-700"
            onClick={testHealth}
          >
            Test Server Connection
          </button>
        </section>
      </div>
    </>
  );
}

export default LoginPage;
