import { test } from "node:test";
import assert from "node:assert/strict";
import { cartTotal, formatPrice } from "./cart.ts";

const cart = [
  { name: "Keyboard", price: 10, qty: 2 },
  { name: "Mouse", price: 5, qty: 1 },
];

test("cartTotal multiplies price by quantity", () => {
  assert.equal(cartTotal(cart), 25);
});

test("cartTotal applies a percentage discount", () => {
  assert.equal(cartTotal(cart, 10), 22.5);
});

test("formatPrice shows two decimals", () => {
  assert.equal(formatPrice(22.5), "$22.50");
});
