// The component the bug report came from: "2 keyboards + 1 mouse shows $15.00, should be $25.00".
// (Shown for context. The agent demo only runs the unit tests in cart.test.ts.)
import { cartTotal, formatPrice, type CartItem } from "./cart.ts";

export function CartSummary({ items, discountPercent }: { items: CartItem[]; discountPercent: number }) {
  return (
    <p className="cart-summary">
      Total: <strong>{formatPrice(cartTotal(items, discountPercent))}</strong>
    </p>
  );
}
