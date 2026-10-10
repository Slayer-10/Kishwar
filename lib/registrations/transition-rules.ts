import type {
  RegistrationStatus,
  RegistrationReviewStatus,
  RegistrationSource,
} from '@prisma/client';

export type RegistrationTransitionContext = {
  status: RegistrationStatus | string;
  reviewStatus: RegistrationReviewStatus | string;
  source: RegistrationSource | string;
  hasAmbassador: boolean;
  isInCollectiveInvoice: boolean;
};

export type RegistrationTransitionAction =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'INVOICE'
  | 'CONFIRM_PAYMENT'
  | 'VERIFY';

export function canTransitionRegistration(
  context: RegistrationTransitionContext,
  action: RegistrationTransitionAction
): boolean {
  switch (action) {
    case 'SUBMIT':
      return true;

    case 'APPROVE':
      return (
        context.reviewStatus === 'PENDING_ADMIN' ||
        context.reviewStatus === 'PENDING_AMBASSADOR'
      );

    case 'REJECT':
      return (
        context.reviewStatus === 'PENDING_ADMIN' ||
        context.reviewStatus === 'PENDING_AMBASSADOR'
      );

    case 'INVOICE':
      return (
        context.reviewStatus === 'APPROVED' &&
        context.status !== 'REJECTED' &&
        !context.isInCollectiveInvoice
      );

    case 'CONFIRM_PAYMENT':
      return (
        context.reviewStatus === 'APPROVED' &&
        context.status !== 'REJECTED' &&
        context.isInCollectiveInvoice &&
        context.status !== 'PAID'
      );

    case 'VERIFY':
      return (
        context.reviewStatus === 'APPROVED' &&
        context.status === 'PAID'
      );

    default:
      return false;
  }
}

export function validateRegistrationTransition(
  context: RegistrationTransitionContext,
  action: RegistrationTransitionAction
): void {
  if (!canTransitionRegistration(context, action)) {
    throw new Error(
      `Invalid registration state transition '${action}' for current state (reviewStatus: ${context.reviewStatus}, status: ${context.status}, invoiced: ${context.isInCollectiveInvoice}).`
    );
  }
}
