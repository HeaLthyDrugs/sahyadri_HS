"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { RiShieldUserLine, RiLogoutBoxLine, RiMailLine, RiCalendarLine } from "react-icons/ri";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  role?: {
    name: string;
  };
}

export default function ProfilePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
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

        // Get the profile data
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select(`
            id,
            email,
            full_name,
            avatar_url,
            created_at
          `)
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        // Get the user_profile data with role
        const { data: userProfileData, error: userProfileError } = await supabase
          .from('user_profiles')
          .select(`
            id,
            role:role_id (
              name
            )
          `)
          .eq('auth_id', user.id)
          .single();

        if (userProfileError) {
          console.error('Error fetching user profile:', userProfileError);
        }

        setProfile({
          ...profileData,
          role: userProfileData?.role
        });
      } catch (error) {
        console.error('Error loading profile:', error);
        router.push('/auth/login');
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
            <div className="text-gray-900">{profile?.role?.name || 'User'}</div>
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
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Access & Permissions</h3>
        <div className="space-y-4">
            {profile?.roles?.role_modules?.map(({ modules }) => (
            <div key={modules.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">{modules.name}</div>
              <div className="text-sm text-gray-500">{modules.description}</div>
            </div>
          ))}
        </div>
      </div> */}

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