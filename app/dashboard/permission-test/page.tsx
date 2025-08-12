'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface DebugData {
  user: any;
  profile: any;
  permissions: any[];
  allRoles: any[];
  allPermissions: any[];
  debug: any;
}

export default function PermissionTestPage() {
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const fetchDebugData = async () => {
    try {
      const response = await fetch('/api/debug-permissions');
      if (response.ok) {
        const data = await response.json();
        setDebugData(data);
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
      toast.error('Failed to fetch debug data');
    } finally {
      setLoading(false);
    }
  };

  const initializePermissions = async () => {
    setInitializing(true);
    try {
      const response = await fetch('/api/init-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Permission system initialized successfully!');
        // Refresh debug data
        await fetchDebugData();
      } else {
        const error = await response.json();
        toast.error(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error initializing permissions:', error);
      toast.error('Failed to initialize permissions');
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Permission System Test</h1>
            <p className="text-gray-600 mt-1">Debug and manage the permission system</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchDebugData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Refresh Data
            </button>
            <button
              onClick={initializePermissions}
              disabled={initializing}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {initializing ? 'Initializing...' : 'Initialize Permissions'}
            </button>
          </div>
        </div>

        {debugData && (
          <div className="space-y-6">
            {/* Debug Summary */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Debug Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Has Profile:</span>
                  <span className={`ml-2 ${debugData.debug.hasProfile ? 'text-green-600' : 'text-red-600'}`}>
                    {debugData.debug.hasProfile ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Has Role:</span>
                  <span className={`ml-2 ${debugData.debug.hasRole ? 'text-green-600' : 'text-red-600'}`}>
                    {debugData.debug.hasRole ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Permissions:</span>
                  <span className="ml-2">{debugData.debug.permissionsCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Roles:</span>
                  <span className="ml-2">{debugData.debug.totalRoles}</span>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Current User</h3>
              <div className="text-sm space-y-1">
                <div><span className="text-gray-600">ID:</span> {debugData.user.id}</div>
                <div><span className="text-gray-600">Email:</span> {debugData.user.email}</div>
                <div><span className="text-gray-600">Created:</span> {new Date(debugData.user.created_at).toLocaleString()}</div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Profile</h3>
              {debugData.profile ? (
                <div className="text-sm space-y-1">
                  <div><span className="text-gray-600">Full Name:</span> {debugData.profile.full_name || 'Not set'}</div>
                  <div><span className="text-gray-600">Role:</span> {debugData.profile.roles?.name || 'No role assigned'}</div>
                  <div><span className="text-gray-600">Active:</span> {debugData.profile.is_active ? 'Yes' : 'No'}</div>
                </div>
              ) : (
                <p className="text-red-600">No profile found</p>
              )}
            </div>

            {/* User Permissions */}
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Your Permissions ({debugData.permissions.length})</h3>
              {debugData.permissions.length > 0 ? (
                <div className="space-y-2">
                  {debugData.permissions.map((perm, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-white p-2 rounded">
                      <span className="font-mono">{perm.page_name}</span>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs ${perm.can_view ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {perm.can_view ? 'View' : 'No View'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${perm.can_edit ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {perm.can_edit ? 'Edit' : 'No Edit'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-red-600">No permissions assigned</p>
              )}
            </div>

            {/* All Roles */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">All Roles ({debugData.allRoles.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {debugData.allRoles.map((role) => (
                  <div key={role.id} className="bg-white p-2 rounded text-sm">
                    <div className="font-medium">{role.name}</div>
                    <div className="text-gray-600 text-xs">{role.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Permissions */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">All System Permissions ({debugData.allPermissions.length})</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {debugData.allPermissions.map((perm, index) => (
                  <div key={index} className="flex items-center justify-between text-xs bg-white p-2 rounded">
                    <div>
                      <span className="font-medium">{perm.roles?.name}</span>
                      <span className="text-gray-600 ml-2">{perm.page_name}</span>
                    </div>
                    <div className="flex gap-1">
                      <span className={`px-1 py-0.5 rounded text-xs ${perm.can_view ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {perm.can_view ? 'V' : 'X'}
                      </span>
                      <span className={`px-1 py-0.5 rounded text-xs ${perm.can_edit ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                        {perm.can_edit ? 'E' : 'X'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}