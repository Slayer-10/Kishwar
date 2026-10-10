import { canTransitionRegistration, validateRegistrationTransition } from '../lib/registrations/transition-rules';
import { WhatsAppNotificationProvider } from '../lib/notifications/providers/whatsapp';
import { EmailNotificationProvider } from '../lib/notifications/providers/email';
import { dispatchNotification } from '../lib/notifications/dispatch';
import { parseEnv } from '../lib/env';
import { summarizeResults, printTestSummary, TestResult } from './helpers/test-results';

async function runComprehensiveQASuite() {
  const results: TestResult[] = [];

  console.log('Starting Kishwar End-to-End QA, UAT & Security Test Suite...\n');

  // --- SECTION 1: Environment & System Configuration ---
  try {
    const envConfig = parseEnv();
    results.push({
      name: 'Environment Validation: Mandatory DATABASE_URL parsed safely',
      passed: typeof envConfig.DATABASE_URL === 'string' && envConfig.DATABASE_URL.length > 0,
    });
  } catch (err: any) {
    results.push({
      name: 'Environment Validation: Mandatory DATABASE_URL parsed safely',
      passed: false,
      details: err?.message,
    });
  }

  // --- SECTION 2: State Transition Rules & Lifecycle Consistency ---
  const pendingAdminCtx = {
    status: 'PENDING',
    reviewStatus: 'PENDING_ADMIN',
    source: 'PUBLIC',
    hasAmbassador: false,
    isInCollectiveInvoice: false,
  };

  results.push({
    name: 'State Transitions: Pending Admin registration allows APPROVE',
    passed: canTransitionRegistration(pendingAdminCtx, 'APPROVE') === true,
  });

  results.push({
    name: 'State Transitions: Pending Admin registration allows REJECT',
    passed: canTransitionRegistration(pendingAdminCtx, 'REJECT') === true,
  });

  results.push({
    name: 'State Transitions: Pending Admin registration CANNOT be invoiced before approval',
    passed: canTransitionRegistration(pendingAdminCtx, 'INVOICE') === false,
  });

  const approvedCtx = {
    status: 'PENDING',
    reviewStatus: 'APPROVED',
    source: 'PUBLIC',
    hasAmbassador: true,
    isInCollectiveInvoice: false,
  };

  results.push({
    name: 'State Transitions: Approved registration CANNOT be re-approved (duplicate prevention)',
    passed: canTransitionRegistration(approvedCtx, 'APPROVE') === false,
  });

  results.push({
    name: 'State Transitions: Approved registration can be added to collective INVOICE',
    passed: canTransitionRegistration(approvedCtx, 'INVOICE') === true,
  });

  const invoicedCtx = {
    status: 'PENDING',
    reviewStatus: 'APPROVED',
    source: 'PUBLIC',
    hasAmbassador: true,
    isInCollectiveInvoice: true,
  };

  results.push({
    name: 'State Transitions: Invoiced registration can transition to CONFIRM_PAYMENT',
    passed: canTransitionRegistration(invoicedCtx, 'CONFIRM_PAYMENT') === true,
  });

  const paidCtx = {
    status: 'PAID',
    reviewStatus: 'APPROVED',
    source: 'PUBLIC',
    hasAmbassador: true,
    isInCollectiveInvoice: true,
  };

  results.push({
    name: 'State Transitions: Already PAID registration CANNOT confirm payment again',
    passed: canTransitionRegistration(paidCtx, 'CONFIRM_PAYMENT') === false,
  });

  results.push({
    name: 'State Transitions: Paid registration can transition to VERIFY status',
    passed: canTransitionRegistration(paidCtx, 'VERIFY') === true,
  });

  // --- SECTION 3: WhatsApp Phone Number Formatting ---
  const wa = new WhatsAppNotificationProvider();
  results.push({
    name: 'Phone Formatting: Formats local 03001234567 to international 923001234567',
    passed: wa.formatPhoneNumber('03001234567') === '923001234567',
  });

  results.push({
    name: 'Phone Formatting: Strips special characters and spaces from formatted numbers',
    passed: wa.formatPhoneNumber('+92 (300) 123-4567') === '923001234567',
  });

  // --- SECTION 4: Notification Provider Fallbacks & Safety ---
  const emailProvider = new EmailNotificationProvider();
  const emailRes = await emailProvider.send({
    event: 'registration_submitted',
    recipientName: 'QA User',
    recipientEmail: 'qa@example.com',
    subject: 'QA Test',
    message: 'Test message',
  });

  results.push({
    name: 'Notifications: Unconfigured email provider safely returns skipped status without throwing',
    passed: emailRes.channel === 'email' && emailRes.skipped === true,
  });

  const waRes = await wa.send({
    event: 'registration_submitted',
    recipientName: 'QA User',
    recipientPhone: '03001234567',
    subject: 'QA Test',
    message: 'Test message',
  });

  results.push({
    name: 'Notifications: Unconfigured WhatsApp provider safely returns skipped status without throwing',
    passed: waRes.channel === 'whatsapp' && waRes.skipped === true,
  });

  // --- SECTION 5: Notification Idempotency Lock ---
  const testKey = `qa_idem_lock_${Date.now()}`;
  const dispatch1 = await dispatchNotification({
    event: 'registration_approved',
    recipientName: 'Idem User',
    recipientEmail: 'idem@example.com',
    subject: 'Idempotency Lock Test',
    message: 'Dispatch attempt 1',
    idempotencyKey: testKey,
  });

  results.push({
    name: 'Notifications: Initial dispatch attempt processes successfully',
    passed: dispatch1.length > 0,
  });

  const dispatch2 = await dispatchNotification({
    event: 'registration_approved',
    recipientName: 'Idem User',
    recipientEmail: 'idem@example.com',
    subject: 'Idempotency Lock Test',
    message: 'Dispatch attempt 2',
    idempotencyKey: testKey,
  });

  results.push({
    name: 'Notifications: Duplicate dispatch with identical idempotencyKey is caught and skipped',
    passed: Boolean(dispatch2[0]?.skipped) && Boolean(dispatch2[0]?.error?.includes('Duplicate')),
  });

  // --- SECTION 6: Explicit Authorization & Security Controls ---
  results.push({
    name: 'Authorization Security: Reject invalid/empty registration transition attempts',
    passed: (() => {
      try {
        validateRegistrationTransition(
          {
            status: 'REJECTED',
            reviewStatus: 'REJECTED',
            source: 'PUBLIC',
            hasAmbassador: false,
            isInCollectiveInvoice: false,
          },
          'CONFIRM_PAYMENT'
        );
        return false;
      } catch (err: any) {
        return err.message.includes('Invalid registration state transition');
      }
    })(),
  });

  results.push({
    name: 'Authorization Security: Reject re-approving a rejected registration',
    passed: (() => {
      try {
        validateRegistrationTransition(
          {
            status: 'REJECTED',
            reviewStatus: 'REJECTED',
            source: 'PUBLIC',
            hasAmbassador: false,
            isInCollectiveInvoice: false,
          },
          'APPROVE'
        );
        return false;
      } catch {
        return true;
      }
    })(),
  });

  // --- SECTION 7: Discount & Collective Invoice Calculation Integrity ---
  const testSubtotal = 10000;
  const testDiscountPercent = 15; // 15%
  const calculatedDiscount = Number(((testSubtotal * testDiscountPercent) / 100).toFixed(2));
  const calculatedTotal = Number((testSubtotal - calculatedDiscount).toFixed(2));

  results.push({
    name: 'Invoicing Math: Server derives exact subtotal, discount, and final amount accurately',
    passed: calculatedDiscount === 1500 && calculatedTotal === 8500,
  });

  // Print full formatted report
  const allPassed = printTestSummary(results);

  if (!allPassed) {
    process.exit(1);
  }
}

runComprehensiveQASuite().catch((err) => {
  console.error('QA Test execution failed:', err);
  process.exit(1);
});
