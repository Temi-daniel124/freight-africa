/** LSR123XY becomes LSR 123 XY (the usual Nigerian plate shape); anything else is shown as it is. */
export function formatPlate(value: string) {
  const match = /^([A-Z]{3})(\d{2,3})([A-Z]{2})$/.exec(value);
  return match ? `${match[1]} ${match[2]} ${match[3]}` : value;
}
