module.exports = {
  // TypeScript files
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 0',
    // Run type checking on all TypeScript files
    () => 'tsc --noEmit',
  ],
  
  // Test related files
  'src/**/*.ts': [
    'jest --bail --findRelatedTests --passWithNoTests',
  ],
  
  // Package files
  'package.json': [
    // Ensure package.json is valid
    () => 'npm run compile',
  ],
};