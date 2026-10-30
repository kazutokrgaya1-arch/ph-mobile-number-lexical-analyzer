// Run with: node --test
const test = require("node:test");
const assert = require("node:assert");
const { runDfa, tokenize, analyze } = require("./mobile_dfa.js");

const VALID = ["09171234567", "09999999999", "09000000000", "09281234567"];
const INVALID = [
  "0917123456", // too short
  "091712345678", // too long
  "08171234567", // wrong prefix
  "9171234567", // missing leading 0
  "+639171234567", // international format
  "0917-123-4567", // separators inside a number
  "0917abc4567", // letters
  "09171234567a", // trailing letter
  "0",
  "09",
  "０９１７１２３４５６７", // full-width digits
  "",
];

test("valid numbers are accepted", () => {
  for (const s of VALID) assert.ok(runDfa(s).accepted, s);
});

test("invalid numbers are rejected", () => {
  for (const s of INVALID) assert.ok(!runDfa(s).accepted, JSON.stringify(s));
});

test("DFA agrees with the regular expression 09[0-9]{9}", () => {
  const rx = /^09[0-9]{9}$/;
  for (const s of [...VALID, ...INVALID, "09" + "1".repeat(9), "09" + "1".repeat(10)]) {
    assert.strictEqual(runDfa(s).accepted, rx.test(s), JSON.stringify(s));
  }
});

test("tokenize splits on whitespace, commas and semicolons", () => {
  assert.deepStrictEqual(tokenize("a b,c;d\ne\t f"), ["a", "b", "c", "d", "e", "f"]);
});

test("batch of mixed numbers", () => {
  const res = analyze("09171234567, 0917123\n09281234567 08171234567");
  assert.deepStrictEqual(res.map((r) => r.valid), [true, false, true, false]);
});

test("empty batch gives no results", () => {
  assert.deepStrictEqual(analyze("  \n , "), []);
});

test("a space inside a number splits it into two invalid entries", () => {
  const res = analyze("0917 1234567");
  assert.strictEqual(res.length, 2);
  assert.ok(res.every((r) => !r.valid));
});
