"use client";

import { useStrictPermissions } from '@/hooks/use-strict-permissions';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { getAvailablePages } from '@/lib/permission-utils';

interface PermissionDebuggerProps {
  show?: boolean;
}

/**
 * Debug component to help troubleshoot permission issues
 * Only shows in development mode
 */
export function PermissionDebugger({ show = false }: PermissionDebuggerProps) {
  const [isOpen, setIsOpen] = useState(show);
  const pathname = usePathname();
  const { 
    isLoading, 
    canView, 
    canEdit, 
    permissions, 
    hasPermissionFor,
    getAccessiblePaths,
    getEditablePaths 
  } = useStrictPermissions();

  // Only show in development
  if (process.env.NODE_ENV !== 'development' && !show) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-red-500 text-white px-3 py-1 rounded text-xs z-50"
      >
        Debug Permissions
      </button>
    );
  }

  const availablePages = getAvailablePages();
  const accessiblePaths = getAccessiblePaths();
  const editablePaths = getEditablePaths();

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Permission Debugger</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Current Page Status */}
        <div className="border-b pb-2">
          <h4 className="font-semibold">Current Page: {pathname}</h4>
          <div className="mt-1">
            <span className={`inline-block px-2 py-1 rounded text-xs ${
              canView ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              View: {canView ? 'Allowed' : 'Denied'}
            </span>
            <span className={`inline-block px-2 py-1 rounded text-xs ml-1 ${
              canEdit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              Edit: {canEdit ? 'Allowed' : 'Denied'}
            </span>
          </div>
        </div>

        {/* User Permissions */}
        <div className="border-b pb-2">
          <h4 className="font-semibold">Your Permissions ({permissions.length})</h4>
          <div className="max-h-32 overflow-y-auto">
            {permissions.length === 0 ? (
              <p className="text-gray-500">No permissions found</p>
            ) : (
              permissions.map((perm, index) => (
                <div key={index} className="flex justify-between items-center py-1">
                  <span className="truncate">{perm.page_name}</span>
                  <div>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      perm.can_view ? 'bg-green-500' : 'bg-red-500'
                    }`} title={`View: ${perm.can_view}`}></span>
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      perm.can_edit ? 'bg-blue-500' : 'bg-gray-300'
                    }`} title={`Edit: ${perm.can_edit}`}></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Page Access Test */}
        <div className="border-b pb-2">
          <h4 className="font-semibold">Page Access Test</h4>
          <div className="max-h-32 overflow-y-auto">
            {availablePages.map((page) => {
              const canViewPage = hasPermissionFor(page.path, 'view');
              const canEditPage = hasPermissionFor(page.path, 'edit');
              
              return (
                <div key={page.path} className="flex justify-between items-center py-1">
                  <span className="truncate text-xs" title={page.path}>
                    {page.name}
                  </span>
                  <div>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1 ${
                      canViewPage ? 'bg-green-500' : 'bg-red-500'
                    }`} title={`View: ${canViewPage}`}></span>
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      canEditPage ? 'bg-blue-500' : 'bg-gray-300'
                    }`} title={`Edit: ${canEditPage}`}></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div>
          <h4 className="font-semibold">Summary</h4>
          <p>Accessible Pages: {accessiblePaths.length}</p>
          <p>Editable Pages: {editablePaths.length}</p>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t text-xs text-gray-500">
        <p>🟢 View Access | 🔵 Edit Access | 🔴 No Access</p>
      </div>
    </div>
  );
}

/**
 * Simple permission status indicator
 */
export function PermissionStatus() {
  const { canView, canEdit } = useStrictPermissions();
  
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs z-50">
      <span className={canView ? 'text-green-400' : 'text-red-400'}>V</span>
      <span className={canEdit ? 'text-blue-400' : 'text-gray-400'}>E</span>
    </div>
  );
}