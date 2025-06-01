const { execSync } = require('child_process');
const path = require('path');

const workspaceRoot = path.resolve(__dirname, '..');

console.log('=== TESTING BRANCH COMPARISON ORDER ===\n');

// Test semantics
const targetBranch = 'master';  // Base branch
const sourceBranch = 'dev';     // Branch with changes

console.log(`Target (base) branch: ${targetBranch}`);
console.log(`Source (changes) branch: ${sourceBranch}\n`);

// Test 1: targetBranch...sourceBranch (current implementation)
console.log(`1. ${targetBranch}...${sourceBranch} (current implementation)`);
console.log('   This shows: changes in sourceBranch that are NOT in targetBranch');
try {
  const output = execSync(`git diff --numstat ${targetBranch}...${sourceBranch} -- package.json`, {
    cwd: workspaceRoot,
    encoding: 'utf8'
  });
  console.log('   Result:', output.trim() || '(no output)');
  if (output.trim()) {
    const [add, del] = output.trim().split('\t');
    console.log(`   Interpretation: ${sourceBranch} has +${add}/-${del} lines compared to ${targetBranch}`);
  }
} catch (error) {
  console.error('   Error:', error.message);
}

// Test 2: sourceBranch...targetBranch (inverted)
console.log(`\n2. ${sourceBranch}...${targetBranch} (inverted)`);
console.log('   This shows: changes in targetBranch that are NOT in sourceBranch');
try {
  const output = execSync(`git diff --numstat ${sourceBranch}...${targetBranch} -- package.json`, {
    cwd: workspaceRoot,
    encoding: 'utf8'
  });
  console.log('   Result:', output.trim() || '(no output)');
  if (output.trim()) {
    const [add, del] = output.trim().split('\t');
    console.log(`   Interpretation: ${targetBranch} has +${add}/-${del} lines compared to ${sourceBranch}`);
  }
} catch (error) {
  console.error('   Error:', error.message);
}

// Test 3: Without three dots (direct comparison)
console.log(`\n3. ${targetBranch}..${sourceBranch} (two dots)`);
console.log('   This shows: direct diff from targetBranch to sourceBranch');
try {
  const output = execSync(`git diff --numstat ${targetBranch}..${sourceBranch} -- package.json`, {
    cwd: workspaceRoot,
    encoding: 'utf8'
  });
  console.log('   Result:', output.trim() || '(no output)');
} catch (error) {
  console.error('   Error:', error.message);
}

// Summary
console.log('\n=== SUMMARY ===');
console.log('For branch comparison where:');
console.log(`- targetBranch (${targetBranch}) is the BASE/REFERENCE branch`);
console.log(`- sourceBranch (${sourceBranch}) is the branch WITH CHANGES`);
console.log('\nThe correct order is:');
console.log(`git diff ${targetBranch}...${sourceBranch}`);
console.log('\nThis shows what changes sourceBranch has that targetBranch does not have.');