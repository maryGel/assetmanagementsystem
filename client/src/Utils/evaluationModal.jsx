import { useState } from 'react';

function EvaluationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  selectedItems, 
  isSubmitting, 
  items
}) {
  const [evalStatus, setEvalStatus] = useState('');
  const [evalRemarks, setEvalRemarks] = useState('');

  if (!isOpen) return null;

  // Check if form is valid
  const isFormValid = evalStatus.trim() !== '' && evalRemarks.trim() !== '';

  const handleSubmit = async () => {
    if (!isFormValid) {
      return; // Prevent submission if form is invalid
    }

    await onConfirm(evalStatus, evalRemarks);
    setEvalStatus('');
    setEvalRemarks('');
  };

  const handleClose = () => {
    setEvalStatus('');
    setEvalRemarks('');
    onClose();
  };

  // Get JO_No from the first selected item (they should all have the same JO_No)
  const joNumber = selectedItems && selectedItems.length > 0 ? selectedItems[0].JO_No : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-full mx-4 bg-white rounded-lg shadow-xl w-[500px]">
        {/* Header */}
        <div className="px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            Evaluate Items - JO #{joNumber}
          </h3>
        </div>
        
        {/* Selected Items List */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <p className="text-sm font-medium text-gray-700">Selected Items:</p>
          <div className="mt-2 space-y-1">
            {selectedItems?.map((item, index) => (
              <div key={index} className="text-sm">
                • {item.FAC_name} ({item.FAC_NO})
              </div>
            ))}
          </div>
        </div>
      
        {/* Form */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Evaluation <span className="text-red-500">*</span>
            </label>
            <select
              value={evalStatus}
              onChange={(e) => setEvalStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Enter evaluation remarks..."
              disabled={isSubmitting}
            />
          </div>
        </div>
        
        {/* Buttons */}
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
            disabled={!isFormValid || isSubmitting}
            className={`px-4 py-2 text-white rounded-md transition-colors
              ${!isFormValid || isSubmitting
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Evaluation'} {selectedItems?.length > 1 ? `(${selectedItems.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvaluationModal;