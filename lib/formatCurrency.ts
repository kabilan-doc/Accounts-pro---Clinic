export function formatINR(amount: number | string | null | undefined) {
  const value = typeof amount === 'string' ? Number(amount) : Number(amount ?? 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}
