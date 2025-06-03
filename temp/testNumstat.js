const { execSync } = require('child_process');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');
console.log('Testing git diff --numstat parsing...\n');

// Test 1: Direct command
console.log('=== TEST 1: Direct git command ===');
try {
  const cmd = `git diff --numstat master...dev -- package.json`;
  console.log('Command:', cmd);
  const output = execSync(cmd, { cwd: workspaceRoot, encoding: 'utf8' });
  console.log('Raw output:', JSON.stringify(output));
  console.log('Trimmed output:', JSON.stringify(output.trim()));
  
  const parts = output.trim().split('\t');
  console.log('Split parts:', JSON.stringify(parts));
  console.log('Parts length:', parts.length);
  
  if (parts.length >= 2) {
    const additions = parseInt(parts[0], 10);
    const deletions = parseInt(parts[1], 10);
    console.log('Parsed additions:', additions);
    console.log('Parsed deletions:', deletions);
  }
} catch (error) {
  console.error('Error:', error.message);
}

// Test 2: With quotes
console.log('\n=== TEST 2: With quoted filename ===');
try {
  const escapedPath = 'package.json'.replace(/'/g, "'\\''");
  const cmd = `git diff --numstat master...dev -- '${escapedPath}'`;
  console.log('Command:', cmd);
  const output = execSync(cmd, { cwd: workspaceRoot, encoding: 'utf8' });
  console.log('Raw output:', JSON.stringify(output));
  console.log('Trimmed output:', JSON.stringify(output.trim()));
  
  const parts = output.trim().split('\t');
  console.log('Split parts:', JSON.stringify(parts));
  console.log('Parts length:', parts.length);
} catch (error) {
  console.error('Error:', error.message);
}

// Test 3: Multiple files
console.log('\n=== TEST 3: Multiple files ===');
try {
  const cmd = `git diff --numstat master...dev | head -5`;
  console.log('Command:', cmd);
  const output = execSync(cmd, { cwd: workspaceRoot, encoding: 'utf8' });
  console.log('Output:');
  console.log(output);
} catch (error) {
  console.error('Error:', error.message);
}