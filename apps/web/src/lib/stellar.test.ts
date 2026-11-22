import { equal } from "node:assert/strict";
import { test } from "node:test";
import { demoAddress, isStellarAddress, isStellarSecret, shortKey } from "./stellar.ts";

// Ejemplos publicados en la documentación de Stellar.
const address = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const secret = "SAV76USXIJOBMEQXPANUOQM6F5LIOTLPDIDVRJBFFE2MDJXG24TAPUU7";

test("accepts valid Stellar keys and rejects wrong ones", () => {
  equal(isStellarAddress(address), true);
  equal(isStellarSecret(secret), true);
  equal(isStellarAddress(secret), false);
  equal(isStellarSecret(address), false);
  equal(isStellarAddress(address.slice(0, -1) + "A"), false, "checksum");
  equal(isStellarAddress("GABC"), false);
  equal(isStellarAddress(address.toLowerCase()), false);
});

test("the demo address is valid and shortens for display", () => {
  equal(isStellarAddress(demoAddress), true);
  equal(shortKey(address), "GAAZI…CCWN7");
});
