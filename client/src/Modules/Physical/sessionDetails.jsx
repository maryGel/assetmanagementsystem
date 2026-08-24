// assetPhysicalCount/sessionDetails.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { CustomBtn } from '../../Utils/groupbtns';
import { api } from '../../api/axios';

const SessionDetails = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [assets, setAssets] = useState([]); // Initialize as empty array
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Get session from location state if available, or fetch it
  useEffect(() => {
    if (location.state?.session) {
      setSession(location.state.session);
      // Fetch assets for this session
      fetchSessionAssets(id);
    } else {
      fetchSessionDetails(id);
    }
  }, [id, location]);

  const fetchSessionDetails = async (sessionId) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/physicalCount/sessions/${sessionId}`);
      setSession(response.data);
      
      // Handle assets from response
      if (response.data && response.data.assets) {
        if (Array.isArray(response.data.assets)) {
          setAssets(response.data.assets);
        } else {
          setAssets([]);
        }
      } else {
        setAssets([]);
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
      alert('Failed to load session details');
      setAssets([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSessionAssets = async (sessionId) => {
    try {
      const response = await api.get(`/physicalCount/sessions/${sessionId}/assets`);
      // Ensure we're setting an array
      if (response.data && Array.isArray(response.data)) {
        setAssets(response.data);
      } else if (response.data && typeof response.data === 'object') {
        // If response is an object with data property
        if (Array.isArray(response.data.data)) {
          setAssets(response.data.data);
        } else {
          setAssets([]);
        }
      } else {
        setAssets([]);
      }
    } catch (error) {
      console.error('Error fetching session assets:', error);
      setAssets([]);
    }
  };

  const handleUpdateStatus = async (status) => {
    try {
      setIsLoading(true);
      await api.put(`/physicalCount/sessions/${id}`, { status });
      setSession(prev => ({ ...prev, status }));
      alert(`Session ${status} successfully`);
    } catch (error) {
      console.error('Error updating session:', error);
      alert('Failed to update session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAsset = async (assetNo) => {
    if (!window.confirm(`Remove asset ${assetNo} from this session?`)) return;
    
    try {
      await api.delete(`/physicalCount/sessions/${id}/assets/${assetNo}`);
      setAssets(prev => prev.filter(a => a.asset_no !== assetNo));
      alert('Asset removed from session');
    } catch (error) {
      console.error('Error removing asset:', error);
      alert('Failed to remove asset');
    }
  };

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  const statusColor = {
    draft: 'bg-yellow-100 text-yellow-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800'
  };

  // Calculate progress safely
  const totalAssets = session.asset_count || session.assetCount || assets.length || 0;
  const countedAssets = Array.isArray(assets) ? assets.filter(a => a.status === 'counted').length : 0;
  const progressPercentage = totalAssets > 0 ? Math.round((countedAssets / totalAssets) * 100) : 0;

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {session.session_name || session.sessionName || 'Untitled Session'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[session.status] || 'bg-gray-100 text-gray-800'}`}>
                {session.status?.toUpperCase() || 'DRAFT'}
              </span>
              {session.freeze_assets || session.freezeAssets ? (
                <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
                  🔒 Frozen
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex gap-2">
            <CustomBtn
              variant="printBtn"
              iconType="print"
              onClick={() => window.print()}
            >
              Print
            </CustomBtn>
            <CustomBtn
              variant="cancelBtn"
              iconType="cancel"
              onClick={() => navigate('/Physical/physicalCountPlanning')}
            >
              Close
            </CustomBtn>
          </div>
        </div>

        {/* Session Info */}
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-3">
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">Period</p>
            <p className="font-semibold">
              {session.start_date || session.startDate ? 
                `${new Date(session.start_date || session.startDate).toLocaleDateString()} - ${new Date(session.end_date || session.endDate).toLocaleDateString()}` 
                : 'Not set'}
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">Total Assets</p>
            <p className="font-semibold">{totalAssets}</p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow">
            <p className="text-sm text-gray-600">Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 transition-all bg-blue-600 rounded-full"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="text-sm font-semibold">
                {progressPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 mb-6 bg-white rounded-lg shadow">
          <h3 className="mb-3 font-semibold">Actions</h3>
          <div className="flex flex-wrap gap-2">
            {session.status === 'draft' && (
              <>
                <CustomBtn
                  variant="editBtn"
                  iconType="edit"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Session
                </CustomBtn>
                <CustomBtn
                  variant="postBtn"
                  iconType="post"
                  onClick={() => handleUpdateStatus('active')}
                >
                  Start Counting
                </CustomBtn>
              </>
            )}
            {session.status === 'active' && (
              <>
                <CustomBtn
                  variant="goBtn"
                  iconType="go"
                  onClick={() => handleUpdateStatus('completed')}
                >
                  Complete Session
                </CustomBtn>
                <CustomBtn
                  variant="cancelBtn"
                  iconType="cancel"
                  onClick={() => handleUpdateStatus('cancelled')}
                >
                  Cancel Session
                </CustomBtn>
              </>
            )}
            {(session.status === 'draft' || session.status === 'cancelled') && (
              <CustomBtn
                variant="deleteBtn"
                iconType="delete"
                onClick={() => {
                  if (window.confirm('Delete this session?')) {
                    // Handle delete
                  }
                }}
              >
                Delete Session
              </CustomBtn>
            )}
          </div>
        </div>

        {/* Assets List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Assets in this Session</h3>
            <p className="text-sm text-gray-600">{Array.isArray(assets) ? assets.length : 0} assets assigned</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Asset Tag</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Location</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Counted By</th>
                  <th className="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!Array.isArray(assets) || assets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                      No assets assigned to this session
                    </td>
                  </tr>
                ) : (
                  assets.map((asset, index) => {
                    // Handle different asset data structures
                    const assetNo = asset.asset_no || asset.FacNO || `Asset ${index + 1}`;
                    const description = asset.description || asset.Description || 'N/A';
                    const location = asset.location || asset.ItemLocation || 'N/A';
                    const status = asset.status || 'pending';
                    const countedBy = asset.counted_by || '-';
                    
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3 font-mono text-sm">{assetNo}</td>
                        <td className="px-4 py-3">{description}</td>
                        <td className="px-4 py-3">{location}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            status === 'counted' ? 'bg-green-100 text-green-800' :
                            status === 'verified' ? 'bg-blue-100 text-blue-800' :
                            status === 'discrepancy' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{countedBy}</td>
                        <td className="px-4 py-3">
                          {(session.status === 'draft' || session.status === 'cancelled') && (
                            <button
                              onClick={() => handleDeleteAsset(assetNo)}
                              className="text-sm text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetails;