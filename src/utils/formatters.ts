/**
 * Formats a numeric or string value as a currency string with commas and fixed decimals (e.g., $1,000.00).
 * Handles null, undefined, NaN, and string representations gracefully.
 */
export function formatCurrency(
  value: number | string | null | undefined,
  options: {
    showSymbol?: boolean;
    decimals?: number;
    symbol?: string;
  } = {}
): string {
  const { showSymbol = true, decimals = 2, symbol = '$' } = options;

  if (value === null || value === undefined) {
    return showSymbol ? `${symbol}0.00` : '0.00';
  }

  const numericVal = typeof value === 'number' 
    ? value 
    : parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

  if (isNaN(numericVal)) {
    return showSymbol ? `${symbol}0.00` : '0.00';
  }

  const formatted = numericVal.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return showSymbol ? `${symbol}${formatted}` : formatted;
}

/**
 * Formats a numeric value with commas and fixed decimals without the currency symbol (e.g., 1,000.00).
 * Useful when the $ symbol is already positioned separately in the layout.
 */
export function formatAmount(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  return formatCurrency(value, { showSymbol: false, decimals });
}
