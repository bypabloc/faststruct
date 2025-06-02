const { execSync } = require('child_process');

try {
  console.log('Running jest tests only (no compile)...');
  const result = execSync('npx jest --no-coverage', { 
    encoding: 'utf8',
    stdio: 'pipe',
    cwd: '/home/bypablo/projects/bypabloc/faststruct'
  });
  console.log(result);
} catch (error) {
  console.error('Some tests failed:');
  if (error.stdout) {
    const lines = error.stdout.split('\n');
    const summaryStart = lines.findIndex(line => line.includes('Test Suites:'));
    if (summaryStart >= 0) {
      console.log('\nTest Summary:');
      console.log(lines.slice(summaryStart, summaryStart + 5).join('\n'));
    }
  }
}