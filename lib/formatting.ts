const localeMap: { [key: string]: string } = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
};

export const formatCurrency = (
  amount: number,
  currency: string | null | undefined
) => {
  // Fallback ke IDR jika tidak ada currency di profil
  const currencyCode = currency || 'IDR';
  
  // Fallback ke locale id-ID
  const locale = localeMap[currencyCode] || 'id-ID';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};