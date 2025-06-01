const { minimatch } = require('minimatch');
const path = require('path');

console.log('Testing minimatch pattern matching for "*env*" against ".env.local"\n');

// Test cases
const pattern = '*env*';
const testPaths = [
  '.env.local',
  'env.local',
  '.env',
  'env',
  'environment.js',
  '.environment',
  'myenv.txt',
  'my.env.local',
  'development.env'
];

console.log('Pattern:', pattern);
console.log('=' .repeat(50));

// Test 1: Direct matching
console.log('\n1. DIRECT MATCHING (full path):');
console.log('-'.repeat(30));
testPaths.forEach(testPath => {
  const matches = minimatch(testPath, pattern);
  console.log(`${testPath.padEnd(20)} => ${matches ? 'MATCH' : 'NO MATCH'}`);
});

// Test 2: Basename matching
console.log('\n2. BASENAME MATCHING:');
console.log('-'.repeat(30));
testPaths.forEach(testPath => {
  const basename = path.basename(testPath);
  const matches = minimatch(basename, pattern);
  console.log(`${testPath.padEnd(20)} => basename: ${basename.padEnd(15)} => ${matches ? 'MATCH' : 'NO MATCH'}`);
});

// Test 3: With different options
console.log('\n3. WITH DOT OPTION (dot: true):');
console.log('-'.repeat(30));
testPaths.forEach(testPath => {
  const matches = minimatch(testPath, pattern, { dot: true });
  console.log(`${testPath.padEnd(20)} => ${matches ? 'MATCH' : 'NO MATCH'}`);
});

// Test 4: Testing specific patterns for .env files
console.log('\n4. TESTING SPECIFIC PATTERNS FOR .env FILES:');
console.log('-'.repeat(30));
const envPatterns = ['*env*', '*.env*', '*env', 'env*', '**/*env*', '**/*.env*'];
const envFile = '.env.local';

envPatterns.forEach(p => {
  const directMatch = minimatch(envFile, p);
  const dotMatch = minimatch(envFile, p, { dot: true });
  console.log(`Pattern: ${p.padEnd(15)} => Direct: ${directMatch ? 'MATCH' : 'NO MATCH'}, With dot: ${dotMatch ? 'MATCH' : 'NO MATCH'}`);
});

// Test 5: Understanding dot files behavior
console.log('\n5. UNDERSTANDING DOT FILES BEHAVIOR:');
console.log('-'.repeat(30));
console.log('minimatch behavior with dot files:');
console.log('- By default, patterns starting with * do NOT match dot files');
console.log('- To match dot files, either:');
console.log('  1. Use { dot: true } option');
console.log('  2. Start pattern with a dot (e.g., ".*env*")');
console.log('  3. Use ** patterns with dot option');

// Test 6: Patterns that WILL match .env.local
console.log('\n6. PATTERNS THAT WILL MATCH .env.local:');
console.log('-'.repeat(30));
const workingPatterns = ['.*env*', '.env*', '**/.env*', '**/.*env*'];
workingPatterns.forEach(p => {
  const matches = minimatch('.env.local', p);
  const matchesWithDot = minimatch('.env.local', p, { dot: true });
  console.log(`Pattern: ${p.padEnd(15)} => Default: ${matches ? 'MATCH' : 'NO MATCH'}, With dot: ${matchesWithDot ? 'MATCH' : 'NO MATCH'}`);
});