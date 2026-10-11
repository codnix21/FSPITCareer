import { APPLICATION_STATUS_LABEL } from './labels';

export function applicationStatusLabel(status?: string | null) {
  if (!status) return '—';
  return APPLICATION_STATUS_LABEL[status] || status;
}

export function canWithdrawApplication(status?: string | null) {
  return status === 'SUBMITTED' || status === 'REVIEWING';
}

export function isActiveApplication(status?: string | null) {
  return status === 'SUBMITTED' || status === 'REVIEWING';
}
