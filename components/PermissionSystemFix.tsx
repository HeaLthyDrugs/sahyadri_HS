'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from 'react-hot-toast';

interface PermissionSystemFixProps {
  onFixed?: () => void;
}

export function PermissionSystemFix({ onFixed }: PermissionSystemFixProps) {
  const [isChecking, setIsChecking] = useState(true);
  const [needsFix, setNeedsFix] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    checkPermissionSystem();
  }, []);

  const checkPermissionSystem = async () => {
    try {
      setIsChecking(true);
      setError(null);

      // Check if user has a profile and role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          role_id,
          roles:role_id (
            id,
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (profileError || !profile?.role_id) {
        setNeedsFix(true);
        return;
      }

      // Check if there are any permissions for the user's role
      const { data: permissions, error: permError } = await supabase
        .from('permissions')
        .select('*')
        .eq('role_id', profile.role_id);

      if (permError || !permissions || permissions.length === 0) {
        setNeedsFix(true);
        return;
      }

      // System looks good
      setNeedsFix(false);
      onFixed?.();

    } catch (error) {
      console.error('Error checking permission system:', error);
      setError('Error checking permission system');
    } finally {
      setIsChecking(false);
    }
  };

  const fixPermissionSystem = async () => {
    try {
      setIsFixing(true);
      setError(null);

      const response = await fetch('/api/init-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize permissions');
      }

      const result = await response.json();
      toast.success('Permission system fixed successfully!');
      
      // Recheck the system
      await checkPermissionSystem();
      
      // Refresh the page to apply new permissions
      window.location.reload();

    } catch (error) {
      console.error('Error fixing permission system:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fix permissions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsFixing(false);
    }
  };

  if (isChecking) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500"></div>
          </div>
          <p className="text-center text-gray-600">Checking permission system...</p>
        </div>
      </div>
    );
  }

  if (!needsFix) {
    return null; // System is working fine
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Permission System Issue
          </h3>
          <p className="text-gray-600 mb-6">
            Your account doesn't have proper permissions set up. This needs to be fixed to access the dashboard.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={checkPermissionSystem}
              disabled={isFixing}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Recheck
            </button>
            <button
              onClick={fixPermissionSystem}
              disabled={isFixing}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50"
            >
              {isFixing ? 'Fixing...' : 'Fix Now'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}