const SelectionModeHeader = ({ 
    selectedCount, 
    itemName, 
    onApprove, 
    onReject, 
    onSelectAll, 
    selectAll 
}) => {
    return (
        <div className="sticky top-0 z-10 flex items-center justify-between p-3 text-sm border-b border-blue-200 bg-blue-50">
            <span className="pl-2 font-medium text-blue-700">
                {selectedCount} selected
            </span>

            <div className="flex items-center gap-3">
                <button
                    onClick={onApprove}
                    className="px-4 py-3 text-white whitespace-normal transition-colors bg-green-600 rounded-md hover:bg-green-700"
                >
                    Approve
                </button>
                {onReject && (
                    <button
                        onClick={onReject}
                        className="px-4 py-3 text-white whitespace-normal transition-colors bg-red-600 rounded-md hover:bg-red-700"
                    >
                        Reject
                    </button>
                )}
                <button
                    onClick={onSelectAll}
                    className="text-blue-600 underline hover:text-blue-800"
                >
                    {selectAll ? 'Deselect All' : 'Select All'}
                </button>
            </div>
        </div>
    );
};

export default SelectionModeHeader;