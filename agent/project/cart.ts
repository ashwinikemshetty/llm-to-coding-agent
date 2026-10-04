// A small slice of a checkout page.
// There is a bug in here. The agent's job is to find and fix it.

export type CartItem = { name: string; price: number; qty: number };

export function cartTotal(items: CartItem[], discountPercent = 0): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  const discount = subtotal * (discountPercent / 100);
  return Math.round((subtotal - discount) * 100) / 100;
}

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
