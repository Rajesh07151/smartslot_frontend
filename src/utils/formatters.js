/**
 * Formatting utilities for SmartSlot (INR currency and localized dates)
 */

export function formatINR(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  const num = Number(amount);
  return '₹' + num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2
  });
}

export function formatDuration(minutes) {
  if (!minutes) return '0 min';
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs} hr${hrs > 1 ? 's' : ''}`;
  return `${mins} mins`;
}

export function formatFriendlyDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
