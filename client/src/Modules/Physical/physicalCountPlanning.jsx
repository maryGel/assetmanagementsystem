// assetPhysicalCount/physicalCountPlanning.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAssetMasterData } from '../../hooks/assetMasterHooks';
import { CustomBtn } from '../../Utils/groupbtns';
import { api } from '../../api/axios';

const PhysicalCountPlanning = () => {
  const navigate = useNavigate();
  const { allAssets } = useAssetMasterData();
  const [isLoading, setIsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [filters, setFilters] = useState({
    locations: [],
    departments: [],
    categories: [],
    costCenters: [],
    custodians: []
  });

  // Form state for new session
  const [sessionForm, setSessionForm] = useState({
    sessionName: '',
    startDate: '',
    endDate: '',
    freezeAssets: false,
    counters: [],
    auditors: []
  });

  // Extract unique filter options from allAssets
  const filterOptions = useMemo(() => {
    if (!allAssets || !Array.isArray(allAssets)) {
      return {
        locations: [],
        departments: [],
        categories: [],
        costCenters: [],
        custodians: []
      };
    }

    const locations = [...new Set(allAssets
      .map(asset => asset.ItemLocation)
      .filter(Boolean)
    )].sort();

    const departments = [...new Set(allAssets
      .map(asset => asset.Department)
      .filter(Boolean)
    )].sort();

    const categories = [...new Set(allAssets
      .map(asset => asset.CATEGORY)
      .filter(Boolean)
    )].sort();

    const costCenters = [...new Set(allAssets
      .map(asset => asset.costCenter)
      .filter(Boolean)
    )].sort();

    const custodians = [...new Set(allAssets
      .map(asset => asset.Holder)
      .filter(Boolean)
    )].sort();

    return { locations, departments, categories, costCenters, custodians };
  }, [allAssets]);

  // Fetch existing sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/physicalCount/sessions');
      
      if (response.data && Array.isArray(response.data)) {
        setSessions(response.data);
      } else if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data.data)) {
          setSessions(response.data.data);
        } else {
          setSessions([response.data]);
        }
      } else {
        setSessions([]);
        console.warn('Unexpected response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  };

  const applyFilters = useCallback(() => {
    if (!allAssets || !Array.isArray(allAssets)) {
      setSelectedAssets([]);
      return;
    }

    const filtered = allAssets.filter(asset => {
      let match = true;
      
      if (filters.locations.length > 0) {
        if (!filters.locations.includes(asset.ItemLocation)) {
          match = false;
        }
      }
      
      if (filters.departments.length > 0) {
        if (!filters.departments.includes(asset.Department)) {
          match = false;
        }
      }
      
      if (filters.categories.length > 0) {
        if (!filters.categories.includes(asset.CATEGORY)) {
          match = false;
        }
      }
      
      if (filters.costCenters.length > 0) {
        if (!filters.costCenters.includes(asset.costCenter)) {
          match = false;
        }
      }
      
      if (filters.custodians.length > 0) {
        if (!filters.custodians.includes(asset.Holder)) {
          match = false;
        }
      }
      
      return match;
    });
    
    setSelectedAssets(filtered);
  }, [allAssets, filters]);

  // Re-apply filters when allAssets or filters change
  useEffect(() => {
    if (allAssets && Array.isArray(allAssets)) {
      applyFilters();
    }
  }, [allAssets, filters, applyFilters]);

  const handleCreateSession = async () => {
    try {
      setIsLoading(true);
      const payload = {
        sessionName: sessionForm.sessionName,
        startDate: sessionForm.startDate,
        endDate: sessionForm.endDate,
        freezeAssets: sessionForm.freezeAssets,
        assets: selectedAssets.map(asset => asset.FacNO),
        assetCount: selectedAssets.length,
        counters: sessionForm.counters,
        auditors: sessionForm.auditors
      };
      
      await api.post('/physicalCount/sessions', payload);
      await fetchSessions();
      setShowCreateModal(false);
      resetForm();
    } catch (error) {
      console.error('Error creating session:', error);
      alert(error.response?.data?.error || 'Failed to create session');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSessionForm({
      sessionName: '',
      startDate: '',
      endDate: '',
      freezeAssets: false,
      counters: [],
      auditors: []
    });
    setSelectedAssets([]);
    setFilters({
      locations: [],
      departments: [],
      categories: [],
      costCenters: [],
      custodians: []
    });
  };

  const toggleSessionStatus = async (sessionId, status) => {
    try {
      await api.put(`/physicalCount/sessions?id=${sessionId}`, { status });
      await fetchSessions();
    } catch (error) {
      console.error('Error updating session:', error);
      alert(error.response?.data?.error || 'Failed to update session');
    }
  };

  // Handler for navigating to session details
  const handleManageSession = (session) => {
    // Navigate to session details page with session ID
    navigate(`/physicalCount/session?id=${session.id}`, { 
      state: { session } // Pass session data if needed
    });
  };

  // Handler for viewing session progress/status
  const handleViewSession = (session) => {
    // Navigate to session view page
    navigate(`/physicalCount/session?id=${session.id}&action=view`);
  };

  // Handler for editing session
  const handleEditSession = (session) => {
    // Navigate to session edit page
    navigate(`/physicalCount/session?id=${session.id}&action=edit`, {
      state: { session }
    });
  };

  // Handler for deleting a session
  const handleDeleteSession = async (sessionId, sessionName) => {
    if (!window.confirm(`Are you sure you want to delete "${sessionName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      await api.delete(`/physicalCount/sessions?id=${sessionId}`);
      await fetchSessions();
      alert('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert(error.response?.data?.error || 'Failed to delete session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for duplicating a session
  const handleDuplicateSession = async (session) => {
    try {
      setIsLoading(true);
      // Create a new session based on existing one
      const payload = {
        sessionName: `${session.session_name || session.sessionName} (Copy)`,
        startDate: session.start_date || session.startDate,
        endDate: session.end_date || session.endDate,
        freezeAssets: session.freeze_assets || session.freezeAssets || false,
        assets: [], // You might want to fetch the assets from the original session
        assetCount: 0,
        counters: [],
        auditors: []
      };
      
      await api.post('/physicalCount/sessions', payload);
      await fetchSessions();
      alert('Session duplicated successfully');
    } catch (error) {
      console.error('Error duplicating session:', error);
      alert(error.response?.data?.error || 'Failed to duplicate session');
    } finally {
      setIsLoading(false);
    }
  };

  // Get status badge color
  const getStatusBadge = (status) => {
    const statusMap = {
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'draft': 'bg-yellow-100 text-yellow-800'
    };
    return statusMap[status] || 'bg-gray-100 text-gray-800';
  };

  // Check if allAssets is loaded
  if (!allAssets || allAssets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading assets...</p>
        </div>
      </div>
    );
  }

  // Loading state for sessions
  if (isLoading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Physical Count Planning</h1>
        <CustomBtn
          variant="createBtn"
          iconType="add"
          onClick={() => setShowCreateModal(true)}
        >
          New Count Session
        </CustomBtn>
      </div>

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-lg shadow-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-lg">No count sessions yet</p>
          <p className="text-sm">Click "New Count Session" to create your first physical count</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => {
            const sessionName = session.session_name || session.sessionName;
            const startDate = session.start_date || session.startDate;
            const endDate = session.end_date || session.endDate;
            const assetCount = session.asset_count || session.assetCount || 0;
            const status = session.status || 'draft';

            return (
              <div key={session.id} className="p-4 transition-shadow bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-semibold truncate" title={sessionName}>
                    {sessionName}
                  </h3>
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(status)}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <p>Period: {new Date(startDate).toLocaleDateString()} - {new Date(endDate).toLocaleDateString()}</p>
                  <p>Assets: {assetCount}</p>
                  {session.freeze_assets || session.freezeAssets ? (
                    <p className="text-xs text-blue-600">🔒 Assets Frozen</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                  {/* Manage Button - Main action */}
                  <CustomBtn
                    variant="editBtn"
                    iconType="edit"
                    onClick={() => handleManageSession(session)}
                    title="Manage session details"
                  >
                    Manage
                  </CustomBtn>

                  {/* Status-specific actions */}
                  {status === 'active' && (
                    <>
                      <CustomBtn
                        variant="goBtn"
                        iconType="go"
                        onClick={() => handleViewSession(session)}
                        title="View session progress"
                      >
                        View
                      </CustomBtn>
                      <CustomBtn
                        variant="postBtn"
                        iconType="post"
                        onClick={() => toggleSessionStatus(session.id, 'completed')}
                        title="Complete this session"
                      >
                        Complete
                      </CustomBtn>
                    </>
                  )}

                  {status === 'draft' && (
                    <>
                      <CustomBtn
                        variant="postBtn"
                        iconType="post"
                        onClick={() => toggleSessionStatus(session.id, 'active')}
                        title="Start counting"
                      >
                        Start Count
                      </CustomBtn>
                      <CustomBtn
                        variant="editBtn"
                        iconType="edit"
                        onClick={() => handleEditSession(session)}
                        title="Edit session"
                      >
                        Edit
                      </CustomBtn>
                    </>
                  )}

                  {status === 'completed' && (
                    <CustomBtn
                      variant="printBtn"
                      iconType="print"
                      onClick={() => handleViewSession(session)}
                      title="View completed session"
                    >
                      View Results
                    </CustomBtn>
                  )}

                  {/* Additional actions for draft sessions */}
                  {(status === 'draft' || status === 'cancelled') && (
                    <>
                      <CustomBtn
                        variant="createBtn"
                        iconType="add"
                        onClick={() => handleDuplicateSession(session)}
                        title="Duplicate this session"
                      >
                        Duplicate
                      </CustomBtn>
                      <CustomBtn
                        variant="deleteBtn"
                        iconType="delete"
                        onClick={() => handleDeleteSession(session.id, sessionName)}
                        title="Delete this session"
                      >
                        Delete
                      </CustomBtn>
                    </>
                  )}

                  {/* Cancel option for active sessions */}
                  {status === 'active' && (
                    <CustomBtn
                      variant="cancelBtn"
                      iconType="cancel"
                      onClick={() => toggleSessionStatus(session.id, 'cancelled')}
                      title="Cancel this session"
                    >
                      Cancel
                    </CustomBtn>
                  )}
                </div>

                {/* Progress bar for active sessions */}
                {status === 'active' && session.asset_count > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span>{Math.round((session.counted_count || 0) / session.asset_count * 100)}%</span>
                    </div>
                    <div className="w-full h-2 mt-1 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 transition-all bg-blue-600 rounded-full"
                        style={{ 
                          width: `${Math.round((session.counted_count || 0) / session.asset_count * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Session Modal - keep existing code */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Physical Count Session</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Session Details Form */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Session Name *
                </label>
                <input
                  type="text"
                  value={sessionForm.sessionName}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, sessionName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Q4 2026 Physical Count"
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Count Period
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={sessionForm.startDate}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={sessionForm.endDate}
                    onChange={(e) => setSessionForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-1/2 px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {/* Asset Selection Filters */}
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Select Assets to Count</h3>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Location</label>
                  <select
                    multiple
                    value={filters.locations}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('locations', values);
                    }}
                    className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {filterOptions.locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Department</label>
                  <select
                    multiple
                    value={filters.departments}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('departments', values);
                    }}
                    className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {filterOptions.departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Category</label>
                  <select
                    multiple
                    value={filters.categories}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('categories', values);
                    }}
                    className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {filterOptions.categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Cost Center</label>
                  <select
                    multiple
                    value={filters.costCenters}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('costCenters', values);
                    }}
                    className="w-full h-16 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {filterOptions.costCenters.map(center => (
                      <option key={center} value={center}>{center}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">Custodian</label>
                  <select
                    multiple
                    value={filters.custodians}
                    onChange={(e) => {
                      const values = Array.from(e.target.selectedOptions, option => option.value);
                      handleFilterChange('custodians', values);
                    }}
                    className="w-full h-16 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  >
                    {filterOptions.custodians.map(custodian => (
                      <option key={custodian} value={custodian}>{custodian}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Selected Assets: <span className="font-semibold text-blue-600">{selectedAssets.length}</span> found
                </p>
                <button
                  onClick={() => {
                    setFilters({
                      locations: [],
                      departments: [],
                      categories: [],
                      costCenters: [],
                      custodians: []
                    });
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Clear All Filters
                </button>
              </div>
            </div>

            {/* Assign Counters */}
            <div className="mb-4">
              <h3 className="mb-2 font-semibold">Assign Counters</h3>
              <select
                multiple
                value={sessionForm.counters}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setSessionForm(prev => ({ ...prev, counters: values }));
                }}
                className="w-full h-16 px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="counter1">John Doe</option>
                <option value="counter2">Jane Smith</option>
                <option value="counter3">Bob Johnson</option>
              </select>
            </div>

            {/* Options */}
            <div className="mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={sessionForm.freezeAssets}
                  onChange={(e) => setSessionForm(prev => ({ ...prev, freezeAssets: e.target.checked }))}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Freeze asset records during counting (prevent modifications)</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <CustomBtn
                variant="cancelBtn"
                iconType="cancel"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </CustomBtn>
              <CustomBtn
                variant="saveBtn"
                iconType="save"
                onClick={handleCreateSession}
                disabled={!sessionForm.sessionName || selectedAssets.length === 0}
              >
                Create Session ({selectedAssets.length} assets)
              </CustomBtn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhysicalCountPlanning;