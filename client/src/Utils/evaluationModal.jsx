// components/MvEvalJO/EvaluationModal.jsx
import { useState } from 'react';

function EvaluationModal({ isOpen, onClose, onConfirm, selectedCount, isSubmitting }) {
  const [evalStatus, setEvalStatus] = useState('');
  const [evalRemarks, setEvalRemarks] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!evalStatus) {
      alert('Please select evaluation status');
      return;
    }

    if (!evalRemarks.trim()) {
      alert('Please enter evaluation remarks');
      return;
    }

    await onConfirm(evalStatus, evalRemarks);
    
    // Reset form after confirmation
    setEvalStatus('');
    setEvalRemarks('');
  };

  const handleClose = () => {
    setEvalStatus('');
    setEvalRemarks('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-full mx-4 bg-white rounded-lg shadow-xl w-96">
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Evaluate Selected Items</h3>
          <p className="text-sm text-gray-600">{selectedCount} item(s)</p>
        </div>
        
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={evalStatus}
              onChange={(e) => setEvalStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select</option>
              <option value="FOR REPAIR INHOUSE">FOR REPAIR INHOUSE</option>
              <option value="FOR REPAIR OUTSOURCE">FOR REPAIR OUTSOURCE</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={evalRemarks}
              onChange={(e) => setEvalRemarks(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter evaluation remarks..."
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Evaluation'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvaluationModal;