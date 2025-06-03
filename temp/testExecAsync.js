const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);
const workspaceRoot = path.resolve(__dirname, '..');

async function testExecAsync() {
  console.log('Testing execAsync behavior...\n');
  
  try {
    const filePath = 'package.json';
    const targetBranch = 'master';
    const sourceBranch = 'dev';
    const escapedPath = filePath.replace(/'/g, "'\\''");
    const command = `git diff --numstat ${targetBranch}...${sourceBranch} -- '${escapedPath}'`;
    
    console.log('Command:', command);
    console.log('Working directory:', workspaceRoot);
    
    const { stdout, stderr } = await execAsync(command, {
      cwd: workspaceRoot,
      maxBuffer: 1024 * 1024 * 10,
    });
    
    console.log('\nstdout:', JSON.stringify(stdout));
    console.log('stderr:', JSON.stringify(stderr));
    console.log('stdout.trim():', JSON.stringify(stdout.trim()));
    console.log('stdout.trim().split("\\t"):', JSON.stringify(stdout.trim().split('\t')));
    
    // Test different approaches
    console.log('\n=== Different parsing approaches ===');
    
    // Approach 1: Direct split
    const parts1 = stdout.trim().split('\t');
    console.log('Approach 1 - Direct split:');
    console.log('  Parts:', JSON.stringify(parts1));
    console.log('  Length:', parts1.length);
    
    // Approach 2: Split by lines first
    const lines = stdout.trim().split('\n');
    console.log('\nApproach 2 - Split by lines first:');
    console.log('  Lines:', JSON.stringify(lines));
    console.log('  First line:', JSON.stringify(lines[0]));
    if (lines[0]) {
      const parts2 = lines[0].split('\t');
      console.log('  Parts from first line:', JSON.stringify(parts2));
      console.log('  Length:', parts2.length);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testExecAsync();