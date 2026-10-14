import { dbQuery } from '../src/db/index';

const BASE_URL = 'http://localhost:3000/api/v1';

interface TestResult {
  scenario: string;
  expected: string;
  actual: string;
  status: 'PASSED' | 'FAILED';
  details?: any;
}

const results: TestResult[] = [];

function record(scenario: string, expected: string, actual: string, passed: boolean, details?: any) {
  results.push({
    scenario,
    expected,
    actual,
    status: passed ? 'PASSED' : 'FAILED',
    details,
  });
  console.log(`${passed ? '✅' : '❌'} [${passed ? 'PASSED' : 'FAILED'}] ${scenario} -> Expected: ${expected}, Got: ${actual}`);
}

async function runTests() {
  console.log('🚀 Starting NepalDrive Automated Authentication & API Test Suite...\n');

  const timestamp = Date.now();
  const testEmail = `qa_tester_${timestamp}@nepaldrive.test`;
  const initialPassword = 'InitialSecurePassword123!';
  const updatedPassword = 'UpdatedSecurePassword456!';
  let authToken = '';
  let resetToken = '';

  try {
    // 1. Locations endpoint
    const locRes = await fetch(`${BASE_URL}/locations`);
    const locData = await locRes.json();
    record(
      'Locations endpoint',
      'HTTP 200 with database-backed JSON array',
      `HTTP ${locRes.status} (Count: ${locData.data?.length ?? 0})`,
      locRes.status === 200 && Array.isArray(locData.data) && locData.data.length > 0
    );

    // 2. Registration with valid data
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
        full_name: 'QA Test Explorer',
        phone: '+977-9841999888',
      }),
    });
    const regData = await regRes.json();
    record(
      'Registration with valid data',
      'HTTP 201 Created with user data',
      `HTTP ${regRes.status} (Success: ${regData.success})`,
      regRes.status === 201 && regData.success === true
    );

    // 3. Registration with duplicate email
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
        full_name: 'Duplicate Attempt',
        phone: '+977-9841999888',
      }),
    });
    const dupData = await dupRes.json();
    record(
      'Registration with duplicate email',
      'HTTP 409 Conflict',
      `HTTP ${dupRes.status} (${dupData.message})`,
      dupRes.status === 409
    );

    // 4. Login with valid credentials
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: initialPassword,
      }),
    });
    const loginData = await loginRes.json();
    authToken = loginData.data?.token || '';
    record(
      'Login with valid credentials',
      'HTTP 200 with JWT token and user profile',
      `HTTP ${loginRes.status} (Token present: ${Boolean(authToken)})`,
      loginRes.status === 200 && Boolean(authToken) && loginData.data?.user?.email === testEmail
    );

    // 5. Login with incorrect password
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
      }),
    });
    record(
      'Login with incorrect password',
      'HTTP 401 Unauthorized',
      `HTTP ${wrongPassRes.status}`,
      wrongPassRes.status === 401
    );

    // 6. Login with nonexistent account
    const nonExistentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `ghost_${timestamp}@nepaldrive.test`,
        password: 'SomePassword123!',
      }),
    });
    record(
      'Login with nonexistent account',
      'HTTP 401 Safe generic failure',
      `HTTP ${nonExistentRes.status}`,
      nonExistentRes.status === 401
    );

    // 7. Login with empty data
    const emptyRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    record(
      'Login with empty data',
      'HTTP 400 Bad Request validation error',
      `HTTP ${emptyRes.status}`,
      emptyRes.status === 400
    );

    // 8. Refresh while logged in (Session persistence via /auth/me)
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    record(
      'Refresh while logged in (/auth/me)',
      'HTTP 200 with current user session',
      `HTTP ${meRes.status} (Email: ${meData.data?.email})`,
      meRes.status === 200 && meData.data?.email === testEmail
    );

    // 9. Access protected route while logged out
    const unauthRes = await fetch(`${BASE_URL}/auth/me`);
    record(
      'Access protected route while logged out',
      'HTTP 401 Unauthenticated',
      `HTTP ${unauthRes.status}`,
      unauthRes.status === 401
    );

    // 10. Access administrative route with customer token
    const adminRes = await fetch(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    record(
      "Access another user's private/admin data",
      'HTTP 403 Forbidden for non-admin customer',
      `HTTP ${adminRes.status}`,
      adminRes.status === 403
    );

    // 11. Forgot password
    const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    const forgotData = await forgotRes.json();
    if (forgotData.data?.resetLink) {
      const url = new URL(forgotData.data.resetLink.replace('#/', ''));
      resetToken = url.searchParams.get('token') || '';
    }
    record(
      'Forgot password request',
      'HTTP 200 with generic confirmation',
      `HTTP ${forgotRes.status} (Reset token generated: ${Boolean(resetToken)})`,
      forgotRes.status === 200 && Boolean(resetToken)
    );

    // 12. Valid reset token -> Password reset succeeds
    const resetRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: updatedPassword,
        confirmPassword: updatedPassword,
      }),
    });
    const resetData = await resetRes.json();
    record(
      'Valid reset token (Password reset succeeds)',
      'HTTP 200 Success message',
      `HTTP ${resetRes.status} (${resetData.message})`,
      resetRes.status === 200 && resetData.success === true
    );

    // 13. Reused reset token -> Rejected
    const reuseRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: resetToken,
        password: 'AnotherPassword789!',
        confirmPassword: 'AnotherPassword789!',
      }),
    });
    record(
      'Reused reset token',
      'HTTP 400 Rejected (Token invalidated)',
      `HTTP ${reuseRes.status}`,
      reuseRes.status === 400
    );

    // 14. Expired reset token
    const expiredRes = await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: 'expired_invalid_token_xyz',
        password: 'AnotherPassword789!',
        confirmPassword: 'AnotherPassword789!',
      }),
    });
    record(
      'Expired or invalid reset token',
      'HTTP 400 Rejected',
      `HTTP ${expiredRes.status}`,
      expiredRes.status === 400
    );

    // 15. Login with new password
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: updatedPassword,
      }),
    });
    const newLoginData = await newLoginRes.json();
    record(
      'Login with new password',
      'HTTP 200 Success with new session',
      `HTTP ${newLoginRes.status} (New token present: ${Boolean(newLoginData.data?.token)})`,
      newLoginRes.status === 200 && Boolean(newLoginData.data?.token)
    );

    // 16. Health & Diagnostics endpoint
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    record(
      'Health & Database latency check',
      'HTTP 200 with PostgreSQL status healthy',
      `HTTP ${healthRes.status} (Status: ${healthData.status}, Host: ${healthData.database?.connection_host}, Latency: ${healthData.database?.latency_ms}ms)`,
      healthRes.status === 200 && healthData.status === 'healthy'
    );

  } catch (err: any) {
    console.error('Fatal test execution error:', err);
  } finally {
    // Clean up test user from database
    try {
      await dbQuery('DELETE FROM users WHERE email = $1', [testEmail]);
      console.log(`\n🧹 Cleaned up isolated test account ${testEmail}`);
    } catch (cleanupErr: any) {
      console.warn('Cleanup notice:', cleanupErr.message);
    }
  }

  console.log('\n========================================');
  console.log('       TEST SUITE EXECUTION SUMMARY     ');
  console.log('========================================');
  const passedCount = results.filter(r => r.status === 'PASSED').length;
  const totalCount = results.length;
  console.log(`Total: ${totalCount} | Passed: ${passedCount} | Failed: ${totalCount - passedCount}`);
  console.log(`Success Rate: ${Math.round((passedCount / totalCount) * 100)}%\n`);

  if (passedCount !== totalCount) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
