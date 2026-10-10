import { canTransitionRegistration, validateRegistrationTransition } from '../lib/registrations/transition-rules';
import { WhatsAppNotificationProvider } from '../lib/notifications/providers/whatsapp';
import { EmailNotificationProvider } from '../lib/notifications/providers/email';
import { dispatchNotification } from '../lib/notifications/dispatch';
import { parseEnv } from '../lib/env';

async function runTests() {
  console.log('=== KISHWAR END-TO-END VALIDATION TEST SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. Environment Variable Parsing Test
  console.log('--- Testing Environment Validation ---');
  try {
    const config = parseEnv();
    assert(
      typeof config.DATABASE_URL === 'string' && config.DATABASE_URL.length > 0,
      'DATABASE_URL is correctly parsed and non-empty'
    );
  } catch (err: any) {
    assert(false, `Environment parsing threw error: ${err?.message}`);
  }

  // 2. Transition Rules Tests
  console.log('\n--- Testing Transition Rules ---');

  const pendingContext = {
    status: 'PENDING',
    reviewStatus: 'PENDING_ADMIN',
    source: 'PUBLIC',
    hasAmbassador: false,
    isInCollectiveInvoice: false,
  };

  assert(
    canTransitionRegistration(pendingContext, 'APPROVE') === true,
    'Pending admin registration can transition to APPROVE'
  );

  assert(
    canTransitionRegistration(pendingContext, 'REJECT') === true,
    'Pending admin registration can transition to REJECT'
  );

  assert(
    canTransitionRegistration(pendingContext, 'INVOICE') === false,
    'Pending admin registration CANNOT transition to INVOICE before approval'
  );

  const approvedContext = {
    status: 'PENDING',
    reviewStatus: 'APPROVED',
    source: 'PUBLIC',
    hasAmbassador: true,
    isInCollectiveInvoice: false,
  };

  assert(
    canTransitionRegistration(approvedContext, 'APPROVE') === false,
    'Approved registration CANNOT be re-approved'
  );

  assert(
    canTransitionRegistration(approvedContext, 'INVOICE') === true,
    'Approved registration can be added to collective INVOICE'
  );

  const invoicedContext = {
    status: 'PENDING',
    reviewStatus: 'APPROVED',
    source: 'PUBLIC',
    hasAmbassador: true,
    isInCollectiveInvoice: true,
  };

  assert(
    canTransitionRegistration(invoicedContext, 'CONFIRM_PAYMENT') === true,
    'Invoiced approved registration can transition to CONFIRM_PAYMENT'
  );

  const paidContext = {
    status: 'PAID',
    reviewStatus: 'APPROVED',
    source: 'PUBLIC',
    hasAmbassador: true,
    isInCollectiveInvoice: true,
  };

  assert(
    canTransitionRegistration(paidContext, 'CONFIRM_PAYMENT') === false,
    'Already PAID registration CANNOT confirm payment again'
  );

  assert(
    canTransitionRegistration(paidContext, 'VERIFY') === true,
    'Paid registration can transition to VERIFY status'
  );

  // 3. Phone Number Formatter Tests
  console.log('\n--- Testing WhatsApp Phone Formatting ---');
  const wa = new WhatsAppNotificationProvider();

  assert(
    wa.formatPhoneNumber('03001234567') === '923001234567',
    'Converts local Pakistani number 03001234567 to 923001234567'
  );

  assert(
    wa.formatPhoneNumber('+92 300 1234567') === '923001234567',
    'Cleans spaces and special chars from +92 300 1234567'
  );

  // 4. Provider Adapter Fallback Tests
  console.log('\n--- Testing Notification Provider Fallbacks ---');
  const emailProvider = new EmailNotificationProvider();

  const emailRes = await emailProvider.send({
    event: 'registration_submitted',
    recipientName: 'Test User',
    recipientEmail: 'test@example.com',
    subject: 'Test',
    message: 'Test message',
  });

  assert(
    emailRes.channel === 'email' && emailRes.skipped === true,
    'Unconfigured email provider safely returns skipped status without throwing error'
  );

  const waRes = await wa.send({
    event: 'registration_submitted',
    recipientName: 'Test User',
    recipientPhone: '03001234567',
    subject: 'Test',
    message: 'Test message',
  });

  assert(
    waRes.channel === 'whatsapp' && waRes.skipped === true,
    'Unconfigured WhatsApp provider safely returns skipped status without throwing error'
  );

  // 5. Notification Dispatcher & Idempotency Lock Tests
  console.log('\n--- Testing Notification Idempotency ---');
  const testKey = `test_idem_${Date.now()}`;

  const dispatch1 = await dispatchNotification({
    event: 'registration_approved',
    recipientName: 'Idem User',
    recipientEmail: 'idem@example.com',
    subject: 'Idempotency Test',
    message: 'Testing dispatch',
    idempotencyKey: testKey,
  });

  assert(
    dispatch1.length > 0,
    'First dispatch completes successfully'
  );

  const dispatch2 = await dispatchNotification({
    event: 'registration_approved',
    recipientName: 'Idem User',
    recipientEmail: 'idem@example.com',
    subject: 'Idempotency Test',
    message: 'Testing dispatch duplicate',
    idempotencyKey: testKey,
  });

  assert(
    Boolean(dispatch2[0]?.skipped) && Boolean(dispatch2[0]?.error?.includes('Duplicate')),
    'Second dispatch with same idempotencyKey is caught by idempotent lock and skipped'
  );

  console.log(`\n=== SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
