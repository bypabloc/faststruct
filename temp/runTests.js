const { execSync } = require('child_process');

try {
  console.log('Running tests...');
  const result = execSync('pnpm test', { 
    encoding: 'utf8',
    stdio: 'pipe',
    cwd: '/home/bypablo/projects/bypabloc/faststruct'
  });
  console.log(result);
} catch (error) {
  console.error('Test failed:');
  console.error(error.stdout);
  console.error(error.stderr);
  process.exit(1);
}