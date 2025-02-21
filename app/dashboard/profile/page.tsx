"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { RiShieldUserLine, RiLogoutBoxLine, RiMailLine, RiCalendarLine, RiCheckLine, RiCloseLine } from "react-icons/ri";

interface Role {
  id: string;
  name: string;
  description: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  role_id: string;
  role?: Role;
}

interface Permission {
  id: string;
  role_id: string;
  page_name: string;
  can_view: boolean;
  can_edit: boolean;
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      try {
        // Get the current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw new Error('Not authenticated');
        }

        // First get the profile with role_id
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          throw profileError;
        }

        // Then get the role details
        if (profileData.role_id) {
          const { data: roleData, error: roleError } = await supabase
            .from('roles')
            .select('*')
            .eq('id', profileData.role_id)
            .single();

          if (roleError) {
            throw roleError;
          }

          // Set profile with role data
          setProfile({
            ...profileData,
            role: roleData
          });

          // Fetch permissions for the role
          const { data: permissionsData, error: permissionsError } = await supabase
            .from('permissions')
            .select('*')
            .eq('role_id', profileData.role_id);

          if (permissionsError) {
            throw permissionsError;
          }

          setPermissions(permissionsData || []);
        } else {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        // Don't redirect on error, just show the error state
        setProfile(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [supabase, router]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const hasFullAccess = permissions.some(p => p.page_name === '*' && p.can_view);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile Details</h1>
        <p className="text-gray-500">Manage your account settings and view permissions</p>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt={profile.full_name || 'Profile'} 
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <RiShieldUserLine className="w-8 h-8 text-amber-600" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {profile?.full_name || 'User'}
            </h2>
            <p className="text-gray-500 flex items-center gap-2">
              <RiMailLine className="w-4 h-4" />
              {profile?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Role</div>
            <div className="text-gray-900 flex items-center gap-2">
              <RiShieldUserLine className="w-4 h-4 text-amber-600" />
              {profile?.role?.name || 'No role assigned'}
            </div>
            {/* {profile?.role?.description && (
              <div className="text-sm text-gray-500 mt-1">
                {profile.role.description}
              </div>
            )} */}
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Member Since</div>
            <div className="text-gray-900 flex items-center gap-2">
              <RiCalendarLine className="w-4 h-4" />
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* Access & Permissions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Access & Permissions</h3>
        
        {hasFullAccess ? (
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-100 mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <RiShieldUserLine className="w-5 h-5" />
              <span className="font-medium">Full Access Granted</span>
            </div>
            <p className="text-amber-700 text-sm mt-1">
              You have complete access to all dashboard features and functionalities.
            </p>
          </div>
        ) : permissions.length > 0 ? (
          <div className="space-y-2">
            {permissions.map((permission) => (
              <div key={permission.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">
                    {permission.page_name === '*' ? 'Full Access' : 
                     permission.page_name.split('/').pop()?.replace(/^\w/, c => c.toUpperCase())}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      {permission.can_view ? (
                        <RiCheckLine className="w-4 h-4 text-green-500" />
                      ) : (
                        <RiCloseLine className="w-4 h-4 text-red-500" />
                      )}
                      <span className={permission.can_view ? "text-green-700" : "text-red-700"}>
                        View
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-sm">
                      {permission.can_edit ? (
                        <RiCheckLine className="w-4 h-4 text-green-500" />
                      ) : (
                        <RiCloseLine className="w-4 h-4 text-red-500" />
                      )}
                      <span className={permission.can_edit ? "text-green-700" : "text-red-700"}>
                        Edit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No permissions assigned
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          <RiLogoutBoxLine className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
} 