// assetPhysicalCount/assetIdentification.jsx
import { useState, useRef, useEffect } from 'react';
import { useAssetMasterData } from '../../hooks/assetMasterHooks';
import { CustomBtn } from '../../Utils/groupbtns';
import { api } from '../../api/axios';

const AssetIdentification = () => {
  const { fetchAssetByFacN0, singleAsset, clearSingleAsset } = useAssetMasterData();
  const [scanMode, setScanMode] = useState('qr'); // 'qr' or 'manual'
  const [searchInput, setSearchInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scannedAssets, setScannedAssets] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [identifiedAsset, setIdentifiedAsset] = useState(null);
  
  const scannerRef = useRef(null);
  const videoRef = useRef(null);

  // Fetch active sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/physicalCount/sessions');
      setSessions(response.data.filter(s => s.status === 'active'));
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  // Handle QR Code scanning
  const startScanner = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        
        // This is a placeholder - you'll need to integrate a QR scanning library like html5-qrcode
        // For now, let's simulate QR scanning
        simulateQRScan();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions or use manual entry.');
      setScanning(false);
    }
  };

  // Simulate QR scan for demo - replace with actual QR scanner
  const simulateQRScan = () => {
    let scanCount = 0;
    const mockAssets = ['ASSET-001', 'ASSET-002', 'ASSET-003'];
    
    const interval = setInterval(() => {
      if (scanCount < mockAssets.length) {
        handleAssetIdentified(mockAssets[scanCount]);
        scanCount++;
      } else {
        clearInterval(interval);
        stopScanner();
      }
    }, 2000);
  };

  const stopScanner = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Handle asset identification
  const handleAssetIdentified = async (assetIdentifier) => {
    try {
      setIsLoading(true);
      const assetData = await fetchAssetByFacN0(assetIdentifier);
      
      if (assetData) {
        setIdentifiedAsset(assetData);
        
        // Add to scanned list if in session
        if (currentSession) {
          await api.post(`/physicalCount/sessions/${currentSession.id}/scan`, {
            assetNo: assetData.FacNO,
            scannedBy: 'current_user' // Replace with actual user
          });
          
          setScannedAssets(prev => [...prev, assetData]);
        }
      } else {
        alert(`Asset "${assetIdentifier}" not found in system`);
      }
    } catch (error) {
      console.error('Error identifying asset:', error);
      alert('Error identifying asset. Please try again.');
    } finally {
      setIsLoading(false);
      clearSingleAsset();
    }
  };

  const handleManualSearch = async () => {
    if (!searchInput.trim()) return;
    await handleAssetIdentified(searchInput.trim());
    setSearchInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleManualSearch();
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Asset Identification</h1>
        <div className="flex gap-2">
          <select
            value={currentSession?.id || ''}
            onChange={(e) => {
              const session = sessions.find(s => s.id === parseInt(e.target.value));
              setCurrentSession(session);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Count Session</option>
            {sessions.map(session => (
              <option key={session.id} value={session.id}>
                {session.sessionName}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Scanner Section */}
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Asset Scanner</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setScanMode('qr')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  scanMode === 'qr' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                QR Code
              </button>
              <button
                onClick={() => setScanMode('manual')}
                className={`px-3 py-1 rounded-lg text-sm ${
                  scanMode === 'manual' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {scanMode === 'qr' ? (
            <div className="space-y-4">
              <div className="relative overflow-hidden bg-gray-900 rounded-lg" style={{ minHeight: '300px' }}>
                {scanning ? (
                  <>
                    <video
                      ref={videoRef}
                      className="object-cover w-full h-full"
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-blue-500 rounded-lg shadow-lg shadow-blue-500/50">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500"></div>
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500"></div>
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-blue-500"></div>
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-blue-500"></div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full bg-gray-100">
                    <div className="text-center text-gray-500">
                      <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p>Camera ready for scanning</p>
                      <p className="text-sm">Click Start Scanner to begin</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {!scanning ? (
                  <CustomBtn
                    variant="goBtn"
                    iconType="go"
                    onClick={startScanner}
                  >
                    Start Scanner
                  </CustomBtn>
                ) : (
                  <CustomBtn
                    variant="cancelBtn"
                    iconType="cancel"
                    onClick={stopScanner}
                  >
                    Stop Scanner
                  </CustomBtn>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Enter asset tag or serial number to identify</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter Asset Tag or Serial Number"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <CustomBtn
                  variant="goBtn"
                  iconType="go"
                  onClick={handleManualSearch}
                  disabled={!searchInput.trim()}
                >
                  Search
                </CustomBtn>
              </div>
            </div>
          )}
        </div>

        {/* Asset Details */}
        <div className="space-y-6">
          {/* Identified Asset Details */}
          {identifiedAsset ? (
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Asset Details</h3>
                <button
                  onClick={() => {
                    setIdentifiedAsset(null);
                    clearSingleAsset();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-gray-600">Asset Tag:</span>
                  <span className="font-medium">{identifiedAsset.FacNO}</span>
                  
                  <span className="text-gray-600">Description:</span>
                  <span className="font-medium">{identifiedAsset.Description}</span>
                  
                  <span className="text-gray-600">Serial Number:</span>
                  <span className="font-medium">{identifiedAsset.serialNo || 'N/A'}</span>
                  
                  <span className="text-gray-600">Category:</span>
                  <span className="font-medium">{identifiedAsset.CATEGORY}</span>
                  
                  <span className="text-gray-600">Location:</span>
                  <span className="font-medium">{identifiedAsset.ItemLocation}</span>
                  
                  <span className="text-gray-600">Department:</span>
                  <span className="font-medium">{identifiedAsset.Department}</span>
                  
                  <span className="text-gray-600">Custodian:</span>
                  <span className="font-medium">{identifiedAsset.Holder || 'Unassigned'}</span>
                  
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">
                    <span className="px-2 py-1 text-xs text-green-800 bg-green-100 rounded-full">
                      {identifiedAsset.xStatus || 'Active'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center min-h-[200px]">
              <div className="text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Scan or search for an asset</p>
                <p className="text-sm">Asset details will appear here</p>
              </div>
            </div>
          )}

          {/* Scanned Assets List (if in session) */}
          {currentSession && scannedAssets.length > 0 && (
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Scanned Assets</h3>
                <span className="text-sm text-gray-600">{scannedAssets.length} scanned</span>
              </div>
              <div className="overflow-y-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Asset Tag</th>
                      <th className="px-3 py-2 text-left">Description</th>
                      <th className="px-3 py-2 text-left">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedAssets.slice().reverse().map((asset, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-1 font-medium">{asset.FacNO}</td>
                        <td className="px-3 py-1">{asset.Description}</td>
                        <td className="px-3 py-1 text-gray-500">
                          {new Date().toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetIdentification;