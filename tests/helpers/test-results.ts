export type TestResult = {
  name: string;
  passed: boolean;
  details?: string;
};

export function summarizeResults(results: TestResult[]) {
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    allPassed: failed === 0,
  };
}

export function printTestSummary(results: TestResult[]) {
  const summary = summarizeResults(results);

  console.log('\n==================================================');
  console.log('       KISHWAR QA & UAT TEST SUMMARY              ');
  console.log('==================================================');
  results.forEach((r, idx) => {
    const icon = r.passed ? '[PASS]' : '[FAIL]';
    console.log(`${icon} ${idx + 1}. ${r.name}`);
    if (r.details) {
      console.log(`       Details: ${r.details}`);
    }
  });
  console.log('--------------------------------------------------');
  console.log(`TOTAL: ${summary.total} | PASSED: ${summary.passed} | FAILED: ${summary.failed}`);
  console.log('==================================================\n');

  return summary.allPassed;
}
