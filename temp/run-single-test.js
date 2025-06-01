const { execSync } = require('child_process');

const testFile = process.argv[2];
if (!testFile) {
  console.error('Usage: node run-single-test.js <test-file>');
  process.exit(1);
}

try {
  console.log(`Running test: ${testFile}`);
  const result = execSync(`npx jest ${testFile} --no-coverage`, { 
    encoding: 'utf8',
    stdio: 'pipe',
    cwd: '/home/bypablo/projects/bypabloc/faststruct'
  });
  console.log(result);
} catch (error) {
  console.error('Test failed:');
  console.error(error.stdout);
  console.error(error.stderr);
}