// assetPhysicalCount/assetQrPrint.jsx
import { useState, useEffect, useMemo } from 'react';
import { useAssetMasterData } from '../../hooks/assetMasterHooks';
import { CustomBtn } from '../../Utils/groupbtns';

const AssetQrPrint = () => {
  const { allAssets, fetchAssets } = useAssetMasterData();
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedQRCodes, setGeneratedQRCodes] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filters, setFilters] = useState({
    locations: [],
    departments: [],
    categories: []
  });
  const [showResults, setShowResults] = useState(false);

  const [printOptions, setPrintOptions] = useState({
    labelSize: 'medium',
    includeAssetInfo: true,
    includeSerialNo: true,
    includeLocation: false,
    includeDepartment: false,
    qrSize: 80,
    copies: 1
  });

  // Extract unique filter options from allAssets
  const filterOptions = useMemo(() => {
    if (!allAssets || !Array.isArray(allAssets) || allAssets.length === 0) {
      return {
        locations: [],
        departments: [],
        categories: []
      };
    }

    const locations = [...new Set(allAssets
      .map(asset => asset.ItemLocation)
      .filter(Boolean)
      .filter(item => item !== '' && item !== ' ' && item !== null && item !== undefined)
    )].sort((a, b) => a.localeCompare(b));

    const departments = [...new Set(allAssets
      .map(asset => asset.Department)
      .filter(Boolean)
      .filter(item => item !== '' && item !== ' ' && item !== null && item !== undefined)
    )].sort((a, b) => a.localeCompare(b));

    const categories = [...new Set(allAssets
      .map(asset => asset.CATEGORY)
      .filter(Boolean)
      .filter(item => item !== '' && item !== ' ' && item !== null && item !== undefined)
    )].sort((a, b) => a.localeCompare(b));

    return { locations, departments, categories };
  }, [allAssets]);

  // Load assets on mount
  useEffect(() => {
    if (!allAssets || allAssets.length === 0) {
      fetchAssets();
    }
  }, []);

  // Apply filters and search (but don't show results yet)
  const applyFilters = () => {
    if (!allAssets || !Array.isArray(allAssets)) {
      setFilteredAssets([]);
      return;
    }
    
    let filtered = [...allAssets];

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(asset => 
        (asset.FacNO?.toLowerCase().includes(term) || false) ||
        (asset.FacName?.toLowerCase().includes(term) || false) ||
        (asset.serialNo?.toLowerCase().includes(term) || false) ||
        (asset.ItemLocation?.toLowerCase().includes(term) || false) ||
        (asset.Department?.toLowerCase().includes(term) || false) ||
        (asset.CATEGORY?.toLowerCase().includes(term) || false)
      );
    }

    if (filters.locations.length > 0) {
      filtered = filtered.filter(asset => 
        asset.ItemLocation && filters.locations.includes(asset.ItemLocation)
      );
    }

    if (filters.departments.length > 0) {
      filtered = filtered.filter(asset => 
        asset.Department && filters.departments.includes(asset.Department)
      );
    }

    if (filters.categories.length > 0) {
      filtered = filtered.filter(asset => 
        asset.CATEGORY && filters.categories.includes(asset.CATEGORY)
      );
    }

    setFilteredAssets(filtered);
    setShowResults(true);
  };

  // Handle filter change
  const handleFilterChange = (filterType, values) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
    setSelectedAssets([]);
    setGeneratedQRCodes([]);
    setShowResults(false);
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      locations: [],
      departments: [],
      categories: []
    });
    setSearchTerm('');
    setSelectedAssets([]);
    setGeneratedQRCodes([]);
    setShowResults(false);
  };

  // Toggle asset selection
  const toggleAssetSelection = (asset) => {
    setSelectedAssets(prev => {
      const exists = prev.find(a => a.FacNO === asset.FacNO);
      if (exists) {
        return prev.filter(a => a.FacNO !== asset.FacNO);
      } else {
        return [...prev, asset];
      }
    });
    setGeneratedQRCodes([]);
  };

  // Select all assets in filtered list
  const selectAll = () => {
    setSelectedAssets([...filteredAssets]);
    setGeneratedQRCodes([]);
  };

  // Clear all selections
  const clearAll = () => {
    setSelectedAssets([]);
    setGeneratedQRCodes([]);
  };

  // Generate QR codes for selected assets
  const handleGenerateQR = () => {
    if (selectedAssets.length === 0) {
      alert('Please select at least one asset to generate QR codes');
      return;
    }

    setIsGenerating(true);
    
    setTimeout(() => {
      const qrCodes = selectedAssets.map(asset => {
        const qrUrl = generateQrCodeUrl(asset.FacNO);
        return {
          ...asset,
          qrCodeUrl: qrUrl,
          generatedAt: new Date().toISOString()
        };
      });
      
      setGeneratedQRCodes(qrCodes);
      setIsGenerating(false);
      
      alert(`✅ ${qrCodes.length} QR code(s) generated successfully!`);
    }, 500);
  };

  // Generate QR code URL
  const generateQrCodeUrl = (assetNo) => {
    const baseUrl = 'https://api.qrserver.com/v1/create-qr-code/';
    const size = printOptions.qrSize;
    const data = encodeURIComponent(JSON.stringify({
      assetNo: assetNo,
      timestamp: new Date().toISOString()
    }));
    return `${baseUrl}?size=${size}x${size}&data=${data}&bgcolor=ffffff&color=000000`;
  };

  // Print QR codes
  const handlePrint = () => {
    if (generatedQRCodes.length === 0) {
      alert('Please generate QR codes first');
      return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const labelSizes = {
      small: { fontSize: '7px', qrSize: 26, columns: 6 },
      medium: { fontSize: '9px', qrSize: 36, columns: 4 },
      large: { fontSize: '13px', qrSize: 60, columns: 2 }
    };

    const size = labelSizes[printOptions.labelSize] || labelSizes.medium;

    const labelsHtml = generatedQRCodes.map(asset => {
      return `
        <div class="label" style="display:flex; align-items:center; gap:2px; padding:1.5mm; border:0.5px solid #ddd; border-radius:1.5px; box-sizing:border-box; page-break-inside:avoid; overflow:hidden;">
          <div style="flex-shrink:0;">
            <img src="${asset.qrCodeUrl}" alt="QR Code" style="width:${size.qrSize}px; height:${size.qrSize}px; display:block;" />
          </div>
          <div style="text-align:left; font-size:${size.fontSize}; line-height:1.15; overflow:hidden; min-width:0; flex:1;">
            <div style="font-weight:bold; font-size:calc(${size.fontSize} + 1px); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${asset.FacNO}</div>
            ${printOptions.includeAssetInfo ? `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${asset.FacName || ''}</div>` : ''}
            ${printOptions.includeSerialNo && asset.serialNo ? `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">SN: ${asset.serialNo}</div>` : ''}
            ${printOptions.includeLocation && asset.ItemLocation ? `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Loc: ${asset.ItemLocation}</div>` : ''}
            ${printOptions.includeDepartment && asset.Department ? `<div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">Dept: ${asset.Department}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const copiesHtml = Array(printOptions.copies).fill(labelsHtml).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Asset QR Codes</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            @page { size: A4; margin: 5mm; }
            body { 
              font-family: Arial, sans-serif; 
              padding: 8px; 
              background: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 10px;
              padding-bottom: 8px;
              border-bottom: 2px solid #333;
            }
            .header h1 { font-size: 20px; }
            .header p { color: #666; font-size: 12px; }
            .labels-container {
              display: grid;
              grid-template-columns: repeat(${size.columns}, 1fr);
              gap: 1.5mm;
            }
            .label {
              box-shadow: 0 1px 3px rgba(0,0,0,0.08);
              background: #fff;
            }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
              .label { 
                border: 0.5px solid #ccc; 
                box-shadow: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Asset QR Codes</h1>
            <p>${generatedQRCodes.length} assets · ${printOptions.copies} copy(ies) each</p>
            <p style="margin-top:3px; font-size:10px; color:#999;">
              Generated: ${new Date().toLocaleString()}
            </p>
          </div>
          <div class="labels-container">
            ${copiesHtml}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Export to PDF
  const handleExportPdf = () => {
    if (generatedQRCodes.length === 0) {
      alert('Please generate QR codes first');
      return;
    }
    handlePrint();
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

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Print QR Codes</h1>
            <p className="text-sm text-gray-600">Generate and print QR code stickers for assets</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {showResults && (
              <CustomBtn
                variant="createBtn"
                iconType="add"
                onClick={handleGenerateQR}
                disabled={selectedAssets.length === 0 || isGenerating}
              >
                {isGenerating ? 'Generating...' : `Generate QR (${selectedAssets.length})`}
              </CustomBtn>
            )}
            <CustomBtn
              variant="printBtn"
              iconType="print"
              onClick={handlePrint}
              disabled={generatedQRCodes.length === 0}
            >
              Print ({generatedQRCodes.length})
            </CustomBtn>
            <CustomBtn
              variant="saveBtn"
              iconType="save"
              onClick={handleExportPdf}
              disabled={generatedQRCodes.length === 0}
            >
              Export PDF
            </CustomBtn>
          </div>
        </div>

        {/* QR Code Generation Status */}
        {generatedQRCodes.length > 0 && (
          <div className="p-3 mb-4 text-sm text-green-700 bg-green-100 border border-green-200 rounded-lg">
            <strong>✅ {generatedQRCodes.length} QR code(s) generated and ready to print</strong>
            <button
              onClick={() => setGeneratedQRCodes([])}
              className="ml-4 text-sm text-green-700 underline hover:text-green-900"
            >
              Clear Generated
            </button>
          </div>
        )}

        {/* Filters Section */}
        <div className="p-4 mb-6 bg-white rounded-lg shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-700">Filter Assets</h3>
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear All Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search assets..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Location
              </label>
              {filterOptions.locations.length > 0 ? (
                <select
                  multiple
                  value={filters.locations}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('locations', values);
                  }}
                  className="w-full h-20 px-3 py-2 overflow-y-auto text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={Math.min(filterOptions.locations.length, 5)}
                >
                  {filterOptions.locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-400">No locations available</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple
              </p>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Department
              </label>
              {filterOptions.departments.length > 0 ? (
                <select
                  multiple
                  value={filters.departments}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('departments', values);
                  }}
                  className="w-full h-20 px-3 py-2 overflow-y-auto text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={Math.min(filterOptions.departments.length, 5)}
                >
                  {filterOptions.departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-400">No departments available</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple
              </p>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Category
              </label>
              {filterOptions.categories.length > 0 ? (
                <select
                  multiple
                  value={filters.categories}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('categories', values);
                  }}
                  className="w-full h-20 px-3 py-2 overflow-y-auto text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={Math.min(filterOptions.categories.length, 5)}
                >
                  {filterOptions.categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-400">No categories available</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Hold Ctrl/Cmd to select multiple
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 mt-4 border-t">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                <strong>{filterOptions.locations.length}</strong> locations · 
                <strong>{filterOptions.departments.length}</strong> departments · 
                <strong>{filterOptions.categories.length}</strong> categories
              </span>
              {showResults && (
                <span className="text-sm text-blue-600">
                  <strong>{filteredAssets.length}</strong> assets found
                </span>
              )}
            </div>
            <CustomBtn
              variant="goBtn"
              iconType="go"
              onClick={applyFilters}
              disabled={!searchTerm && filters.locations.length === 0 && filters.departments.length === 0 && filters.categories.length === 0}
            >
              Find Assets
            </CustomBtn>
          </div>
        </div>

        {/* Print Options */}
        <div className="p-4 mb-6 bg-white rounded-lg shadow-md">
          <h3 className="mb-3 font-semibold text-gray-700">Print Options</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Label Size
              </label>
              <select
                value={printOptions.labelSize}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, labelSize: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Small (6 columns)</option>
                <option value="medium">Medium (4 columns)</option>
                <option value="large">Large (2 columns)</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Copies
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={printOptions.copies}
                onChange={(e) => setPrintOptions(prev => ({ ...prev, copies: parseInt(e.target.value) || 1 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Include on Label
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeAssetInfo}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, includeAssetInfo: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Description</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeSerialNo}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, includeSerialNo: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Serial Number</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeLocation}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, includeLocation: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Location</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={printOptions.includeDepartment}
                    onChange={(e) => setPrintOptions(prev => ({ ...prev, includeDepartment: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Department</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section - Only shows after clicking "Find Assets" */}
        {showResults ? (
          <>
            {/* Bulk Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              <CustomBtn
                variant="createBtn"
                iconType="add"
                onClick={selectAll}
                disabled={filteredAssets.length === 0}
              >
                Select All ({filteredAssets.length})
              </CustomBtn>
              <CustomBtn
                variant="cancelBtn"
                iconType="cancel"
                onClick={clearAll}
                disabled={selectedAssets.length === 0}
              >
                Clear All
              </CustomBtn>
              {selectedAssets.length > 0 && (
                <span className="self-center text-sm text-blue-600">
                  {selectedAssets.length} asset{selectedAssets.length > 1 ? 's' : ''} selected for generation
                </span>
              )}
              {generatedQRCodes.length > 0 && (
                <span className="self-center text-sm text-green-600">
                  ✅ {generatedQRCodes.length} QR code{generatedQRCodes.length > 1 ? 's' : ''} generated
                </span>
              )}
            </div>

            {/* Assets Grid */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Select Assets to Generate QR Codes</h3>
                <p className="text-sm text-gray-600">
                  {filteredAssets.length} assets found
                  {filters.locations.length > 0 || filters.departments.length > 0 || filters.categories.length > 0 ? (
                    <span className="ml-2 text-xs text-blue-600">
                      (filtered)
                    </span>
                  ) : ''}
                </p>
              </div>

              {filteredAssets.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p className="text-lg">No assets found matching your filters</p>
                  <p className="text-sm">Try adjusting your filters or search criteria</p>
                  <button
                    onClick={clearFilters}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {filteredAssets.map((asset) => {
                    const isSelected = selectedAssets.find(a => a.FacNO === asset.FacNO);
                    const isGenerated = generatedQRCodes.find(a => a.FacNO === asset.FacNO);
                    return (
                      <div
                        key={asset.FacNO}
                        onClick={() => !isGenerated && toggleAssetSelection(asset)}
                        className={`
                          p-3 border-2 rounded-lg cursor-pointer transition-all
                          ${isGenerated 
                            ? 'border-green-500 bg-green-50 shadow-md cursor-not-allowed opacity-75' 
                            : isSelected 
                              ? 'border-blue-500 bg-blue-50 shadow-md' 
                              : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-mono text-sm font-semibold truncate">{asset.FacNO}</p>
                            <p className="text-xs text-gray-600 truncate">{asset.Description || 'No description'}</p>
                            {asset.serialNo && (
                              <p className="text-xs text-gray-500 truncate">SN: {asset.serialNo}</p>
                            )}
                            {asset.ItemLocation && (
                              <p className="text-xs text-gray-500 truncate">📍 {asset.ItemLocation}</p>
                            )}
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            {isGenerated ? (
                              <span className="text-lg text-green-500">✓</span>
                            ) : isSelected ? (
                              <span className="text-lg text-blue-500">☑</span>
                            ) : (
                              <span className="text-lg text-gray-300">□</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-center mt-2">
                          {isGenerated ? (
                            <img
                              src={asset.qrCodeUrl || generateQrCodeUrl(asset.FacNO)}
                              alt="QR Code"
                              className="w-12 h-12 border-2 border-green-500 rounded"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-12 h-12 border border-gray-200 rounded bg-gray-50">
                              <span className="text-xs text-gray-400">QR</span>
                            </div>
                          )}
                        </div>
                        {isGenerated && (
                          <div className="mt-1 text-center">
                            <span className="text-xs font-medium text-green-600">✓ Generated</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between p-4 border-t">
                <span className="text-sm text-gray-600">
                  Showing {filteredAssets.length} assets
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-blue-600">
                    Selected: {selectedAssets.length}
                  </span>
                  {generatedQRCodes.length > 0 && (
                    <span className="text-sm font-medium text-green-600">
                      ✅ Generated: {generatedQRCodes.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Empty State - No results shown yet */
          <div className="p-12 text-center bg-white rounded-lg shadow-md">
            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3M10 13h3" />
            </svg>
            <h3 className="mb-2 text-lg font-medium text-gray-700">No Assets Displayed</h3>
            <p className="text-sm text-gray-500">
              Select filters above and click <strong>"Find Assets"</strong> to search for assets
            </p>
            <div className="mt-4 text-xs text-gray-400">
              <span className="inline-block px-3 py-1 mr-2 bg-gray-100 rounded">Filter by Location</span>
              <span className="inline-block px-3 py-1 mr-2 bg-gray-100 rounded">Filter by Department</span>
              <span className="inline-block px-3 py-1 mr-2 bg-gray-100 rounded">Filter by Category</span>
              <span className="inline-block px-3 py-1 bg-gray-100 rounded">Search by keyword</span>
            </div>
          </div>
        )}

        {/* Generated QR Codes Section - Only shows after generation */}
        {generatedQRCodes.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow-md">
            <div className="p-3 border-b bg-green-50">
              <h3 className="font-semibold text-green-800">
                ✅ Assets Ready to Print ({generatedQRCodes.length})
              </h3>
              <p className="text-sm text-green-600">
                These assets have QR codes generated and are ready for printing
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {generatedQRCodes.map((asset) => (
                <div
                  key={asset.FacNO}
                  className="p-3 border-2 border-green-500 rounded-lg bg-green-50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold truncate">{asset.FacNO}</p>
                      <p className="text-xs text-gray-600 truncate">{asset.Description || 'No description'}</p>
                    </div>
                    <span className="text-lg text-green-500">✓</span>
                  </div>
                  <div className="flex justify-center mt-2">
                    <img
                      src={asset.qrCodeUrl}
                      alt="QR Code"
                      className="w-12 h-12 border-2 border-green-500 rounded"
                    />
                  </div>
                  <div className="mt-1 text-center">
                    <span className="text-xs font-medium text-green-600">✓ Ready to Print</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetQrPrint;