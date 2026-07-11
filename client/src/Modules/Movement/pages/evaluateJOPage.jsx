// EvaluateJOPage.jsx

import { useState } from "react";

// Components
import MvEvalJODesktopForm from "../components/Desktop/mvEvalJODesktopForm";
import MvMaintenanceDesktopForm from "../components/Desktop/mvMaintenanceDesktopForm";

function EvaluateJOPage({
    joHeaders = [],
    joDetails = [],
    joRefresh,
    joDetailsRefresh,
    isLoading = false,
    error = null,
}) {
    const [activeTab, setActiveTab] = useState("evaluate");

    return (
        <div className="flex flex-col h-full bg-gray-100">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-700">
                        Motor Vehicle Maintenance
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Evaluate job orders and manage maintenance requests
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex bg-white border-b">

                <button
                    onClick={() => setActiveTab("evaluate")}
                    className={`px-6 py-4 text-sm font-medium transition
                        ${
                            activeTab === "evaluate"
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-slate-500 hover:text-blue-600"
                        }`}
                >
                    Evaluate JO
                </button>

                <button
                    onClick={() => setActiveTab("maintenance")}
                    className={`px-6 py-4 text-sm font-medium transition
                        ${
                            activeTab === "maintenance"
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-slate-500 hover:text-blue-600"
                        }`}
                >
                    Maintenance
                </button>

            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">

                {activeTab === "evaluate" ? (
                    <MvEvalJODesktopForm
                        joHeaders={joHeaders}
                        joDetails={joDetails}
                        joRefresh={joRefresh}
                        joDetailsRefresh={joDetailsRefresh}
                        isLoading={isLoading}
                        error={error}
                    />
                ) : (
                    <MvMaintenanceDesktopForm
                        joHeaders={joHeaders}
                        joDetails={joDetails}
                        joRefresh={joRefresh}
                        joDetailsRefresh={joDetailsRefresh}
                        isLoading={isLoading}
                        error={error}
                    />
                )}

            </div>

        </div>
    );
}

export default EvaluateJOPage;