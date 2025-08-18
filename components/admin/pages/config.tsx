"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";

export function ConfigPage() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Configuration functionality has been removed
    // Billing entries are now calculated automatically only for participants with type 'participant'
    // No configuration is needed - the system works straightforwardly
  }, []);

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Configuration Simplified
          </h2>
          <p className="text-gray-600 mb-6">
            The system now automatically calculates billing entries only for participants with type 'participant'.
            <br />
            Guests, drivers, and other types are excluded from billing calculations.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <h3 className="text-lg font-medium text-blue-900 mb-2">How it works:</h3>
            <ul className="text-left text-blue-800 space-y-2">
              <li>• Only participants with type 'participant' generate billing entries</li>
              <li>• Guests, drivers, and other types are tracked but don't affect billing</li>
              <li>• Entries are calculated automatically when participants are added/updated</li>
              <li>• No manual configuration is required</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Legacy configuration code removed for simplicity
// The system now works straightforwardly without complex configuration
/*
Old configuration functionality included:
- Product rules management
- Invoice settings
- Staff types management

These have been removed to keep the system simple and focused on
automatically calculating entries only for participants with type 'participant'.
*/