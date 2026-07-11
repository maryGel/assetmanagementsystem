// MaintenanceFormDesktop.jsx
import { useState, useMemo } from 'react';
import { CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DateDisplay from '../../../Utils/formatDateForInput';

function MaintenanceFormDesktop({
  joHeaders,
  joDetails,
  joRefresh,
  joDetailsRefresh,
  isLoading: externalLoading = false,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(externalLoading);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await joRefresh();
      await joDetailsRefresh();
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJO = useMemo(() => {
    if (!searchTerm) return joHeaders;
    return joHeaders.filter((jo) =>
      jo.JO_No.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jo.Remarks?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jo.Department_Code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [joHeaders, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <CircularProgress />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800">Maintenance</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <SearchIcon className="absolute text-gray-400 transform -translate-y-1/2 left-3 top-1/2" fontSize="small" />
            <input
              type="text"
              placeholder="Search JO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
            />
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <RefreshIcon fontSize="small" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700">
            <AddIcon fontSize="small" />
            New Maintenance
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 mt-4 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="text-xs font-medium tracking-wider text-gray-500 uppercase border-b border-gray-200">
              <th className="px-4 py-3 text-left">JO Number</th>
              <th className="px-4 py-3 text-left">Date</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Remarks</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredJO.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                  No maintenance records found
                </td>
              </tr>
            ) : (
              filteredJO.map((jo) => (
                <tr
                  key={jo.ID}
                  className="text-sm transition-colors cursor-pointer hover:bg-blue-50"
                >
                  <td className="px-4 py-3 font-medium text-blue-600">{jo.JO_No}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <DateDisplay value={jo.xDate} format="short" />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{jo.Department_Code}</td>
                  <td className="max-w-xs px-4 py-3 text-gray-600 truncate">
                    {jo.Remarks || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${jo.eval_status
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                      }
                    `}>
                      {jo.eval_status ? 'Completed' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MaintenanceFormDesktop;