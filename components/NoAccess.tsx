import { RiLockLine } from "react-icons/ri";

export function NoAccess() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow">
      <div className="text-amber-600 mb-6">
        <RiLockLine className="w-16 h-16" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Limited Access</h1>
      <p className="text-gray-500 text-center max-w-md">
        This page is not available for your account at the moment. Please contact the administrator for any required assistance.
      </p>
    </div>
  );
} 