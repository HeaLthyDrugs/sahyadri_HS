const fs = require('fs');
const path = require('path');

// Pages that should be protected
const protectedPages = [
  '/dashboard/billing/invoice',
  '/dashboard/billing/entries', 
  '/dashboard/billing/reports',
  '/dashboard/users/roles',
  '/dashboard/users/permissions',
  '/dashboard/users/manage',
  '/dashboard/config',
  '/dashboard/inventory/packages',
  '/dashboard/inventory/products',
  '/dashboard/consumer/programs',
  '/dashboard/consumer/participants',
  '/dashboard/consumer/staff'
];

// Convert path to file path
function getPageFilePath(pagePath) {
  return path.join(__dirname, '..', 'app', pagePath.substring(1), 'page.tsx');
}

// Check if file contains permission protection
function checkFileProtection(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const hasStrictPermission = content.includes('withStrictPermission') || 
                               content.includes('StrictPermissionGuard');
    const hasOldPermission = content.includes('withPermission') && 
                            !content.includes('withStrictPermission');
    const hasNoPermission = !content.includes('withPermission') && 
                           !content.includes('PermissionGuard');
    
    return {
      hasStrictPermission,
      hasOldPermission,
      hasNoPermission,
      content: content.substring(0, 200) + '...'
    };
  } catch (error) {
    return { error: error.message };
  }
}

console.log('🔍 Checking page protection status...\n');

protectedPages.forEach(pagePath => {
  const filePath = getPageFilePath(pagePath);
  const protection = checkFileProtection(filePath);
  
  console.log(`📄 ${pagePath}`);
  console.log(`   File: ${filePath}`);
  
  if (protection.error) {
    console.log(`   ❌ Error: ${protection.error}`);
  } else if (protection.hasNoPermission) {
    console.log(`   🚨 NOT PROTECTED - No permission guards found!`);
  } else if (protection.hasOldPermission && !protection.hasStrictPermission) {
    console.log(`   ⚠️  OLD PROTECTION - Using legacy permission system`);
  } else if (protection.hasStrictPermission) {
    console.log(`   ✅ PROTECTED - Using strict permission system`);
  }
  
  console.log('');
});

console.log('✨ Check complete!');
console.log('\nLegend:');
console.log('✅ PROTECTED - Page uses strict permission checking');
console.log('⚠️  OLD PROTECTION - Page uses legacy permission system (should be updated)');
console.log('🚨 NOT PROTECTED - Page has no permission guards (SECURITY RISK!)');