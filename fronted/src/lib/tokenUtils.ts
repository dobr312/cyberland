/**
 * Utility functions for handling ICRC-1 token amounts with proper decimal conversion
 * CBR token uses 8 decimals (10^8 = 100,000,000 base units per 1 CBR)
 */

const CBR_DECIMALS = 8;
const CBR_DECIMAL_MULTIPLIER = 10n ** BigInt(CBR_DECIMALS);

/**
 * Formats a raw token balance (in base units/e8s) to a human-readable decimal string
 * @param balance - Raw balance as bigint (e.g., 100000000n for 1 CBR)
 * @param decimals - Number of decimal places (default: 8 for CBR)
 * @param displayDecimals - Number of decimal places to show (default: 4)
 * @returns Formatted string (e.g., "1.0000")
 */
export function formatTokenBalance(
  balance: bigint,
  decimals: number = CBR_DECIMALS,
  displayDecimals: number = 4
): string {
  try {
    const balanceStr = balance.toString();
    
    // Handle zero balance
    if (balance === 0n) {
      return '0.' + '0'.repeat(displayDecimals);
    }
    
    // If balance is smaller than the decimal multiplier, it's less than 1 token
    if (balanceStr.length <= decimals) {
      const paddedBalance = '0'.repeat(decimals - balanceStr.length) + balanceStr;
      const decimalPart = paddedBalance.slice(0, displayDecimals);
      return '0.' + decimalPart;
    }
    
    // Split into integer and decimal parts
    const integerPart = balanceStr.slice(0, -decimals);
    const decimalPart = balanceStr.slice(-decimals).slice(0, displayDecimals);
    
    // Pad decimal part if needed
    const paddedDecimalPart = decimalPart.padEnd(displayDecimals, '0');
    
    return `${integerPart}.${paddedDecimalPart}`;
  } catch (error) {
    console.error('Error formatting token balance:', error);
    return '0.0000';
  }
}

/**
 * Converts a human-readable decimal amount to raw token units (base units/e8s)
 * @param amount - Decimal amount as string or number (e.g., "1.5" or 1.5)
 * @param decimals - Number of decimal places (default: 8 for CBR)
 * @returns Raw amount as bigint (e.g., 150000000n for 1.5 CBR)
 */
export function parseTokenAmount(
  amount: string | number,
  decimals: number = CBR_DECIMALS
): bigint {
  try {
    const amountStr = typeof amount === 'number' ? amount.toString() : amount;
    
    // Remove any whitespace
    const cleanAmount = amountStr.trim();
    
    // Handle empty or invalid input
    if (!cleanAmount || cleanAmount === '0') {
      return 0n;
    }
    
    // Split by decimal point
    const parts = cleanAmount.split('.');
    const integerPart = parts[0] || '0';
    const decimalPart = parts[1] || '';
    
    // Pad or truncate decimal part to match token decimals
    const paddedDecimalPart = decimalPart.padEnd(decimals, '0').slice(0, decimals);
    
    // Combine and convert to bigint
    const combinedStr = integerPart + paddedDecimalPart;
    return BigInt(combinedStr);
  } catch (error) {
    console.error('Error parsing token amount:', error);
    return 0n;
  }
}

/**
 * Formats token balance with thousands separators for better readability
 * @param balance - Raw balance as bigint
 * @param decimals - Number of decimal places (default: 8 for CBR)
 * @param displayDecimals - Number of decimal places to show (default: 4)
 * @returns Formatted string with separators (e.g., "1,234.5678")
 */
export function formatTokenBalanceWithSeparators(
  balance: bigint,
  decimals: number = CBR_DECIMALS,
  displayDecimals: number = 4
): string {
  try {
    const formatted = formatTokenBalance(balance, decimals, displayDecimals);
    const [integerPart, decimalPart] = formatted.split('.');
    
    // Add thousands separators to integer part
    const withSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    
    return decimalPart ? `${withSeparators}.${decimalPart}` : withSeparators;
  } catch (error) {
    console.error('Error formatting token balance with separators:', error);
    return '0.0000';
  }
}

/**
 * Checks if user has sufficient balance for a transaction
 * @param balance - User's current balance as bigint
 * @param required - Required amount as bigint
 * @returns true if balance >= required
 */
export function hasSufficientBalance(balance: bigint, required: bigint): boolean {
  return balance >= required;
}

/**
 * Formats a token amount for display in error messages
 * @param amount - Amount as bigint
 * @param decimals - Number of decimal places (default: 8 for CBR)
 * @returns Formatted string for error messages
 */
export function formatTokenAmountForError(
  amount: bigint,
  decimals: number = CBR_DECIMALS
): string {
  return formatTokenBalanceWithSeparators(amount, decimals, 2);
}
