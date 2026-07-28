import { useState, useMemo, useCallback } from 'react';

// Custom Hooks
import { useJO_h} from '../../../hooks/useJO_h';
import { useJO_d } from '../../../hooks/useJO_d';

// Components
import EvalJOFormDesktop from '../maintenance/evalJOFormDesktop';
import MaintenanceFormDesktop from '../maintenance/maintenanceFormDesktop';

function MaintenancePageDesktop() {    
  // reference data
  const {joHeaders = [], joRefresh,  updateJOHeader, createJOHeader, } = useJO_h();
  const {joDetails = [], joDetailsRefresh, updateJODetails, createJODetails, getJODetailsByJO} = useJO_d();
  const [isOpenEvalJo, setIsOpenEvalJo] = useState(true);
  const [isOpenMainForm, setIsOpenMainForm] = useState(false);
  
  // ✅ Add a refresh key to force re-render
  const [refreshKey, setRefreshKey] = useState(0);

  // ✅ Create wrapper functions that force re-render
  const handleJoRefresh = useCallback(async () => {
    await joRefresh();
    setRefreshKey(prev => prev + 1);
  }, [joRefresh]);

  const handleJoDetailsRefresh = useCallback(async () => {
    await joDetailsRefresh();
    setRefreshKey(prev => prev + 1);
  }, [joDetailsRefresh]);

  const handleOpenEvalJo = () => {
    setIsOpenEvalJo(true);
    setIsOpenMainForm(false);
  };

  const handleOpenMaintenance = () => {
    setIsOpenEvalJo(false);
    setIsOpenMainForm(true);
  };

    // ✅ MUI Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  // ✅ FIXED: Simple showToast without premature closing
  const showToast = useCallback((message, severity = 'info') => {
    console.log('📢 showToast called with:', { message, severity });
    setSnackbar({ 
      open: true, 
      message, 
      severity 
    });
  }, []);

  // ✅ Handle snackbar close
  const handleSnackbarClose = (event, reason) => {
    console.log('🔚 Snackbar close triggered, reason:', reason);
    if (reason === 'clickaway') {
      return;
    }
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <div className={`flexjustify-center`}>
        {/* Desktop Container */}
        <div className={` w-full  `}>

          {/* Tab Navigation */}
          <div className="flex px-6 pt-4 border-b border-gray-200 bg-gray-50/50">
            <button
              onClick={handleOpenEvalJo}
              className={`
                px-6 py-3 text-sm font-medium transition-all duration-200
                ${isOpenEvalJo
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-t-lg'
                }
              `}
            >
              Evaluate JO
            </button>
            <button
              onClick={handleOpenMaintenance}
              className={`
                px-6 py-3 text-sm font-medium transition-all duration-200
                ${isOpenMainForm
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white rounded-t-lg'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-t-lg'
                }
              `}
            >
              Maintenance
            </button>
          </div>

          {/* Content Area */}
          <div className="p-6 bg-white ">
            {isOpenEvalJo && (
              <div className="">
                <EvalJOFormDesktop
                  key={refreshKey} // ✅ Force re-render when refreshKey changes
                  joHeaders={joHeaders}
                  joDetails={joDetails}
                  joRefresh={handleJoRefresh}
                  joDetailsRefresh={handleJoDetailsRefresh}
                  snackbar={snackbar}
                  showToast={showToast}
                  handleSnackbarClose={handleSnackbarClose}
                />
              </div>
            )}
            {isOpenMainForm && (
              <div className="">
                <MaintenanceFormDesktop
                  joHeaders={joHeaders}
                  joDetails={joDetails}
                  joRefresh={handleJoRefresh}
                  joDetailsRefresh={handleJoDetailsRefresh}
                  updateJOHeader={updateJOHeader}
                  updateJODetails={updateJODetails}
                />
              </div>
            )}
          </div>
        </div>
      </div>

    </>
  );
}

export default MaintenancePageDesktop;