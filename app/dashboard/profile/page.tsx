"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RiShieldUserLine, RiLogoutBoxLine, RiMailLine, RiCalendarLine } from "react-icons/ri";
import { auth } from "@/lib/auth";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  roles: {
    name: string;
    description: string;
    role_modules: {
      modules: {
        name: string;
        description: string;
      };
    }[];
  };
  created_at: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from('profiles')
            .select(`
              id,
              full_name,
              created_at,
              roles!inner (
                name,
                description,
                role_modules (
                  modules (
                    name,
                    description
                  )
                )
              )
            `)
            .eq('id', session.user.id)
            .single();

          if (error) throw error;
          
          const profileData: UserProfile = {
            id: data.id,
            full_name: data.full_name,
            email: session.user.email || '',
            created_at: data.created_at,
            roles: {
              name: String(data.roles.name),
              description: String(data.roles.description),
              role_modules: data.roles.role_modules?.map(rm => ({
                modules: {
                  name: String(rm.modules.name),
                  description: String(rm.modules.description)
                }
              })) || []
            }
          };
          
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
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
            <RiShieldUserLine className="w-8 h-8 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{profile?.full_name}</h2>
            <p className="text-gray-500 flex items-center gap-2">
              <RiMailLine className="w-4 h-4" />
              {profile?.email}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Role</div>
            <div className="text-gray-900">{profile?.roles?.name || 'No role assigned'}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-500 mb-1">Member Since</div>
            <div className="text-gray-900 flex items-center gap-2">
              <RiCalendarLine className="w-4 h-4" />
              {new Date(profile?.created_at || '').toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Access & Permissions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Access & Permissions</h3>
        <div className="space-y-4">
          {profile?.roles?.role_modules?.map(({ modules }) => (
            <div key={modules.name} className="p-4 bg-gray-50 rounded-lg">
              <div className="font-medium text-gray-900 mb-1">{modules.name}</div>
              <div className="text-sm text-gray-500">{modules.description}</div>
            </div>
          ))}
        </div>
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