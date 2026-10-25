// Small helpers for showing numbers and dates.

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

// 125000 -> "₹1,25,000"
export function formatMoney(amount) {
  return inr.format(amount || 0);
}

// "12 Oct 2026"
export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Whole days left until the date. 0 means "last day", negative means it has passed.
export function daysLeft(value) {
  return Math.floor((new Date(value) - Date.now()) / (24 * 60 * 60 * 1000));
}

// Percent of the goal reached, between 0 and 100.
export function percent(raised, goal) {
  if (!goal) return 0;
  return Math.min(100, Math.round((raised / goal) * 100));
}

// A date input wants "YYYY-MM-DD".
export function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}
