/**
 * Shared text utility functions
 */

export const truncateMessage = (message: string, maxLength: number = 35): string => {
  if (!message) return '';
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
};

export const truncateMessageMobile = (message: string, maxLength: number = 20): string => {
  if (!message) return '';
  if (message.length <= maxLength) return message;
  return message.substring(0, maxLength) + '...';
};

export const truncateText = (text: string, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (text: string): string => {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

export const formatPriceCompact = (price: number): string => {
  if (price >= 1000000) {
    return `₦${(price / 1000000).toFixed(1)}M`;
  } else if (price >= 1000) {
    return `₦${(price / 1000).toFixed(0)}K`;
  }
  return `₦${price.toLocaleString()}`;
};
