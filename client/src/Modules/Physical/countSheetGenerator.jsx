// assetPhysicalCount/countSheetGenerator.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAssetMasterData } from '../../hooks/assetMasterHooks';
import { CustomBtn } from '../../Utils/groupbtns';
import { api } from '../../api/axios';

const CountSheetGenerator = () => {
  const { allAssets } = useAssetMasterData();
  
  const [availableSessions, setAvailableSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [generatedSheets, setGeneratedSheets] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [sheetOptions, setSheetOptions] = useState({
    hideDetails: false,
    showQRCode: true,
    groupByLocation: false,
    includeCustodian: true,
    includeStatus: true
  });

  // Fetch count sessions
  useEffect(() => {
    fetchCountSessions();
  }, []);

  const fetchCountSessions = async () => {
    try {
      const response = await api.get('/physicalCount/sessions');
      console.log('Fetched sessions:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const filtered = response.data.filter(s => s.status === 'active' || s.status === 'draft');
        setAvailableSessions(filtered);
        console.log('Available sessions:', filtered);
      } else {
        setAvailableSessions([]);
        console.warn('Unexpected sessions response:', response.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setAvailableSessions([]);
    }
  };

  const generateCountSheets = useCallback(async () => {
    if (!activeSession) {
      setError('Please select a session first');
      return;
    }
    
    try {
      setIsGenerating(true);
      setError(null);
      
      console.log('Generating sheets for session:', activeSession.id);
      console.log('Options:', sheetOptions);
      
      const response = await api.post(`/physicalCount/sessions/${activeSession.id}/sheets`, {
        hideDetails: sheetOptions.hideDetails,
        groupByLocation: sheetOptions.groupByLocation,
        includeCustodian: sheetOptions.includeCustodian,
        includeStatus: sheetOptions.includeStatus
      });
      
      console.log('Sheets response:', response.data);
      
      // Check if response has sheets data
      if (response.data && response.data.sheets) {
        if (Array.isArray(response.data.sheets)) {
          setGeneratedSheets(response.data.sheets);
          console.log('Generated sheets:', response.data.sheets.length);
        } else {
          console.warn('Sheets is not an array:', response.data.sheets);
          setGeneratedSheets([]);
          setError('Invalid data format received');
        }
      } else if (response.data && Array.isArray(response.data)) {
        // If response is directly an array
        setGeneratedSheets(response.data);
      } else {
        console.warn('Unexpected response format:', response.data);
        setGeneratedSheets([]);
        setError('No sheets data received');
      }
    } catch (error) {
      console.error('Error generating count sheets:', error);
      setError(error.response?.data?.error || 'Failed to generate count sheets');
      setGeneratedSheets([]);
    } finally {
      setIsGenerating(false);
    }
  }, [activeSession, sheetOptions]);

  useEffect(() => {
    if (activeSession) {
      generateCountSheets();
    }
  }, [activeSession, sheetOptions, generateCountSheets]);

  const handlePrintSheets = () => {
    if (!generatedSheets.length) {
      alert('No sheets to print');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const style = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .sheet { page-break-after: always; margin-bottom: 30px; border: 1px solid #ddd; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        .qr-code { width: 60px; height: 60px; display: inline-block; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 10px; border: 1px solid #ddd; }
        .blind-mode .description-col { display: none; }
        .blind-mode .serial-col { display: none; }
        @media print {
          .no-print { display: none; }
          .sheet { page-break-after: always; }
        }
      </style>
    `;
    
    const content = generatedSheets.map((sheet, index) => {
      const sheetAssets = sheet.assets || [];
      return `
        <div class="sheet ${sheetOptions.hideDetails ? 'blind-mode' : ''}">
          <div class="header">
            <h2>Count Sheet ${index + 1}</h2>
            <p><strong>Session:</strong> ${activeSession?.sessionName || activeSession?.session_name}</p>
            <p><strong>Location:</strong> ${sheet.location || 'All'}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Assets:</strong> ${sheet.count || sheetAssets.length || 0}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                ${sheetOptions.showQRCode ? '<th>QR Code</th>' : ''}
                <th>Asset Tag</th>
                <th class="description-col">Description</th>
                <th class="serial-col">Serial #</th>
                <th>Location</th>
                ${sheetOptions.includeCustodian ? '<th>Custodian</th>' : ''}
                ${sheetOptions.includeStatus ? '<th>Status</th>' : ''}
                <th>Count</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${sheetAssets.map((asset, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  ${sheetOptions.showQRCode ? `
                    <td>
                      <div class="qr-code">
                        [QR]
                      </div>
                    </td>
                  ` : ''}
                  <td>${asset.FacNO || asset.asset_no || 'N/A'}</td>
                  <td class="description-col">${sheetOptions.hideDetails ? '***' : (asset.Description || 'N/A')}</td>
                  <td class="serial-col">${sheetOptions.hideDetails ? '***' : (asset.serialNo || 'N/A')}</td>
                  <td>${asset.ItemLocation || 'N/A'}</td>
                  ${sheetOptions.includeCustodian ? `<td>${asset.Holder || 'Unassigned'}</td>` : ''}
                  ${sheetOptions.includeStatus ? `<td><span style="padding:2px 8px;border-radius:12px;font-size:12px;${asset.count_status === 'counted' ? 'background:#d1fae5;color:#065f46;' : asset.count_status === 'verified' ? 'background:#dbeafe;color:#1e40af;' : 'background:#f3f4f6;color:#374151;'}">${asset.count_status || 'Pending'}</span></td>` : ''}
                  <td><input type="text" style="width:60px;padding:4px;border:1px solid #ccc;border-radius:4px;" /></td>
                  <td><input type="text" style="width:100px;padding:4px;border:1px solid #ccc;border-radius:4px;" /></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 20px; display: flex; justify-content: space-between;">
            <div>
              <p><strong>Counted by:</strong> _____________________</p>
              <p><strong>Signature:</strong> _____________________</p>
              <p><strong>Date:</strong> _____________________</p>
            </div>
            <div>
              <p><strong>Verified by:</strong> _____________________</p>
              <p><strong>Signature:</strong> _____________________</p>
              <p><strong>Date:</strong> _____________________</p>
            </div>
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Count Sheets - ${activeSession?.sessionName || activeSession?.session_name}</title>
          ${style}
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() { 
              window.print(); 
              setTimeout(function() { window.close(); }, 1000);
            }
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const exportToCSV = () => {
    if (!generatedSheets.length || !generatedSheets[0].assets?.length) {
      alert('No data to export');
      return;
    }

    let headers = ['Asset Tag', 'Description', 'Serial Number', 'Location'];
    if (sheetOptions.includeCustodian) headers.push('Custodian');
    if (sheetOptions.includeStatus) headers.push('Status');
    headers.push('Count', 'Remarks');

    const rows = generatedSheets.flatMap(sheet => 
      (sheet.assets || []).map(asset => {
        const row = [
          asset.FacNO || asset.asset_no || 'N/A',
          sheetOptions.hideDetails ? '***' : (asset.Description || 'N/A'),
          sheetOptions.hideDetails ? '***' : (asset.serialNo || 'N/A'),
          asset.ItemLocation || 'N/A'
        ];
        if (sheetOptions.includeCustodian) row.push(asset.Holder || 'Unassigned');
        if (sheetOptions.includeStatus) row.push(asset.count_status || 'Pending');
        row.push('', '');
        return row;
      })
    );

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `count_sheets_${activeSession?.sessionName || activeSession?.session_name || 'export'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Count Sheet Generator</h1>
      </div>

      {/* Session Selection and Options */}
      <div className="p-6 mb-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Select Count Session
            </label>
            <select
              value={activeSession?.id || ''}
              onChange={(e) => {
                const session = availableSessions.find(s => s.id === parseInt(e.target.value));
                setActiveSession(session);
                setGeneratedSheets([]); // Clear sheets when session changes
                setError(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a session...</option>
              {availableSessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.session_name || session.sessionName} ({new Date(session.start_date || session.startDate).toLocaleDateString()} - {new Date(session.end_date || session.endDate).toLocaleDateString()})
                </option>
              ))}
            </select>
            {availableSessions.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">No active or draft sessions available</p>
            )}
          </div>
          
          <div className="flex items-end gap-4">
            <CustomBtn
              variant="createBtn"
              iconType="refresh"
              onClick={generateCountSheets}
              disabled={!activeSession || isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate Sheets'}
            </CustomBtn>
            <CustomBtn
              variant="printBtn"
              iconType="print"
              onClick={handlePrintSheets}
              disabled={generatedSheets.length === 0}
            >
              Print Sheets
            </CustomBtn>
            <CustomBtn
              variant="saveBtn"
              iconType="save"
              onClick={exportToCSV}
              disabled={generatedSheets.length === 0}
            >
              Export CSV
            </CustomBtn>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 mt-4 text-sm text-red-700 bg-red-100 rounded-lg">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 pt-4 mt-4 border-t md:grid-cols-2">
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sheetOptions.hideDetails}
                onChange={(e) => setSheetOptions(prev => ({ ...prev, hideDetails: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Blind Count Mode (hide asset details)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sheetOptions.showQRCode}
                onChange={(e) => setSheetOptions(prev => ({ ...prev, showQRCode: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include QR Codes</span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sheetOptions.groupByLocation}
                onChange={(e) => setSheetOptions(prev => ({ ...prev, groupByLocation: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Group by Location</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sheetOptions.includeCustodian}
                onChange={(e) => setSheetOptions(prev => ({ ...prev, includeCustodian: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include Custodian</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sheetOptions.includeStatus}
                onChange={(e) => setSheetOptions(prev => ({ ...prev, includeStatus: e.target.checked }))}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include Status</span>
            </label>
          </div>
        </div>
      </div>

      {/* Count Sheets Preview */}
      {generatedSheets.length > 0 ? (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Count Sheets Preview ({generatedSheets.length} sheets, {generatedSheets.reduce((acc, sheet) => acc + (sheet.assets?.length || 0), 0)} total assets)</h3>
            <span className="text-sm text-gray-600">
              {generatedSheets.every(sheet => sheet.assets?.every(asset => asset.count_status === 'counted')) 
                ? '✅ All assets counted' 
                : '⏳ Some assets pending count'}
            </span>
          </div>
          <div className="space-y-6 max-h-[600px] overflow-y-auto">
            {generatedSheets.map((sheet, index) => {
              const sheetAssets = sheet.assets || [];
              return (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Sheet {index + 1} - {sheet.location || 'All Locations'}</h4>
                    <span className="text-sm text-gray-600">
                      {sheetAssets.length} assets
                      {sheetAssets.length > 0 && (
                        <span className="ml-2">
                          ({sheetAssets.filter(a => a.count_status === 'counted').length} counted)
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {sheetAssets.length === 0 ? (
                      <p className="py-4 text-sm text-center text-gray-500">No assets in this sheet</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left">Asset Tag</th>
                            <th className="px-3 py-2 text-left">Description</th>
                            <th className="px-3 py-2 text-left">Location</th>
                            {sheetOptions.includeCustodian && <th className="px-3 py-2 text-left">Custodian</th>}
                            {sheetOptions.includeStatus && <th className="px-3 py-2 text-left">Status</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetAssets.slice(0, 5).map((asset, idx) => (
                            <tr key={idx} className="border-t">
                              <td className="px-3 py-1 font-mono text-xs">{asset.FacNO || asset.asset_no || 'N/A'}</td>
                              <td className="px-3 py-1">{sheetOptions.hideDetails ? '***' : (asset.Description || 'N/A')}</td>
                              <td className="px-3 py-1">{asset.ItemLocation || 'N/A'}</td>
                              {sheetOptions.includeCustodian && <td className="px-3 py-1">{asset.Holder || 'Unassigned'}</td>}
                              {sheetOptions.includeStatus && (
                                <td className="px-3 py-1">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    asset.count_status === 'counted' ? 'bg-green-100 text-green-800' :
                                    asset.count_status === 'verified' ? 'bg-blue-100 text-blue-800' :
                                    asset.count_status === 'discrepancy' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {asset.count_status || 'Pending'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}
                          {sheetAssets.length > 5 && (
                            <tr className="border-t">
                              <td colSpan={sheetOptions.includeCustodian ? (sheetOptions.includeStatus ? 6 : 5) : (sheetOptions.includeStatus ? 5 : 4)} 
                                  className="px-3 py-2 text-sm text-center text-gray-500">
                                ... and {sheetAssets.length - 5} more assets
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : activeSession ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-lg shadow-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg">No count sheets generated yet</p>
          <p className="text-sm">Click "Generate Sheets" to create count sheets for this session</p>
          {isGenerating && <p className="mt-2 text-sm text-blue-600">Generating...</p>}
        </div>
      ) : (
        <div className="p-12 text-center text-gray-500 bg-white rounded-lg shadow-md">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-lg">Select a count session</p>
          <p className="text-sm">Choose an active or draft session to generate count sheets</p>
        </div>
      )}
    </div>
  );
};

export default CountSheetGenerator;