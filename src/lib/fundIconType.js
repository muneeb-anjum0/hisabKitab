export function fundIconType(name = '') {
  const normalizedName = name.toLowerCase();
  if (/gym|fitness/.test(normalizedName)) return 'gym';
  if (/travel|trip/.test(normalizedName)) return 'travel';
  if (/kitchen|food|house|home/.test(normalizedName)) return 'home';
  if (/fuel|car/.test(normalizedName)) return 'fuel';
  if (/university|study/.test(normalizedName)) return 'study';
  if (/saving|emergency/.test(normalizedName)) return 'savings';
  if (/personal/.test(normalizedName)) return 'personal';
  return 'misc';
}
