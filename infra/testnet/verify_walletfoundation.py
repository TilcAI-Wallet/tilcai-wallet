#!/usr/bin/env python3
"""Read-only verification of a WalletFoundation v2 instance on Stellar Testnet.

Uses only public JSON endpoints: Soroban RPC getNetwork, getLatestLedger and getLedgerEntries,
plus Horizon account reads. It never signs, simulates or submits a transaction, needs no keys
and depends only on the Python 3.8+ standard library.

    python3 -I infra/testnet/verify_walletfoundation.py            # defaults: verified v2 instance
    python3 -I infra/testnet/verify_walletfoundation.py --help

Exit code 0 only when every check passes.
"""
import argparse
import base64
import json
import struct
import sys
import urllib.request

TESTNET = "Test SDF Network ; September 2015"
B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
ACCOUNT_V, CONTRACT_V = 6 << 3, 2 << 3
ENVELOPE_WINDOW_LEDGERS = 1000  # comfortably beyond the 120-ledger validity of a signed spend


def crc16(data):
    crc = 0
    for b in data:
        crc ^= b << 8
        for _ in range(8):
            crc = ((crc << 1) ^ 0x1021) if crc & 0x8000 else (crc << 1)
            crc &= 0xFFFF
    return crc


def strkey_decode(s, version):
    bits = val = 0
    out = bytearray()
    for ch in s:
        val = (val << 5) | B32.index(ch)
        bits += 5
        if bits >= 8:
            bits -= 8
            out.append((val >> bits) & 0xFF)
    raw = bytes(out)
    if len(raw) != 35 or raw[0] != version or struct.pack("<H", crc16(raw[:33])) != raw[33:]:
        raise ValueError(f"invalid strkey {s}")
    return raw[1:33]


def strkey_encode(payload, version):
    raw = bytes([version]) + payload
    raw += struct.pack("<H", crc16(raw))
    bits = val = 0
    out = ""
    for b in raw:
        val = (val << 8) | b
        bits += 8
        while bits >= 5:
            bits -= 5
            out += B32[(val >> bits) & 31]
    if bits:
        out += B32[(val << (5 - bits)) & 31]
    return out


def i32(n):
    return struct.pack(">i", n)


def u32(n):
    return struct.pack(">I", n)


def xdr_string(b):
    return u32(len(b)) + b + b"\0" * ((4 - len(b) % 4) % 4)


def sc_address_contract(cid):
    return i32(1) + strkey_decode(cid, CONTRACT_V)


def contract_data_key(contract, key_val, durability=1):  # LedgerKey CONTRACT_DATA, PERSISTENT
    return i32(6) + sc_address_contract(contract) + key_val + i32(durability)


class Reader:
    def __init__(self, b):
        self.b, self.o = b, 0

    def take(self, n):
        v = self.b[self.o:self.o + n]
        self.o += n
        return v

    def i32(self):
        return struct.unpack(">i", self.take(4))[0]

    def u32(self):
        return struct.unpack(">I", self.take(4))[0]

    def i64(self):
        return struct.unpack(">q", self.take(8))[0]

    def u64(self):
        return struct.unpack(">Q", self.take(8))[0]

    def opaque(self):
        n = self.u32()
        v = self.take(n)
        self.take((4 - n % 4) % 4)
        return v


def sc_address(r):
    t = r.i32()
    if t == 0:
        if r.i32() != 0:
            raise ValueError("unsupported public key type")
        return strkey_encode(r.take(32), ACCOUNT_V)
    if t == 1:
        return strkey_encode(r.take(32), CONTRACT_V)
    raise ValueError(f"unsupported ScAddress {t}")


def sc_val(r):
    t = r.i32()
    if t == 0:
        return bool(r.u32())
    if t == 1:
        return None
    if t == 3:
        return ("u32", r.u32())
    if t == 4:
        return ("i32", r.i32())
    if t in (5, 7, 8):
        return ("u64", r.u64())
    if t == 6:
        return ("i64", r.i64())
    if t == 9:
        hi, lo = r.u64(), r.u64()
        return ("u128", (hi << 64) | lo)
    if t == 10:
        hi, lo = r.i64(), r.u64()
        return ("i128", (hi << 64) | lo)
    if t == 13:
        return ("bytes", r.opaque())
    if t in (14, 15):
        return ("sym" if t == 15 else "str", r.opaque().decode())
    if t == 16:
        return ("vec", [sc_val(r) for _ in range(r.u32())] if r.u32() else None)
    if t == 17:
        return ("map", [(sc_val(r), sc_val(r)) for _ in range(r.u32())] if r.u32() else None)
    if t == 18:
        return ("addr", sc_address(r))
    if t == 19:
        executable = ("wasm", r.take(32).hex()) if r.i32() == 0 else ("stellar_asset", None)
        storage = [(sc_val(r), sc_val(r)) for _ in range(r.u32())] if r.u32() else None
        return ("instance", executable, storage)
    if t == 20:
        return ("instance_key", None)
    if t == 21:
        return ("nonce", r.i64())
    raise ValueError(f"unsupported ScVal {t}")


def contract_data_value(entry_b64):
    r = Reader(base64.b64decode(entry_b64))
    if r.i32() != 6 or r.i32() != 0:
        raise ValueError("unexpected ledger entry")
    sc_address(r)
    sc_val(r)
    r.i32()
    return sc_val(r)


def plain(v):
    return v[1] if isinstance(v, tuple) else v


def main():
    p = argparse.ArgumentParser(description="Read-only WalletFoundation v2 verification on Stellar Testnet")
    p.add_argument("--rpc", default="https://soroban-testnet.stellar.org")
    p.add_argument("--horizon", default="https://horizon-testnet.stellar.org")
    p.add_argument("--contract", default="CCLONQVFVRZ3EXR76R4WTFVQ77UM4IJW2MU4BB5S2RQ3PNRGI4VRFUIA")
    p.add_argument("--owner", default="GAFWOEXSFUXQMTMJG5VZEOMMSABYX4NRA3GTUCEF3CQCZW4XPVPQ6LWW")
    p.add_argument("--agent", default="GBJA2MS5XC52VBLDARCDO333LEPCCU7OSTYXUCOQXKYFE66IDRDJ3LT2")
    p.add_argument("--recipient", default="GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX")
    p.add_argument("--asset", default="CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA")
    p.add_argument("--asset-issuer", default="GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5")
    p.add_argument("--amount", type=int, default=5_000_000)
    p.add_argument("--expected-revision", type=int, default=0)
    p.add_argument("--expected-wasm-hash", default=None, help="optional: fail unless the deployed Wasm has this SHA-256")
    a = p.parse_args()
    if not (a.rpc.startswith("https://") and a.horizon.startswith("https://")):
        sys.exit("RPC and Horizon URLs must use HTTPS")

    def post(method, params=None):
        body = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params or {}}).encode()
        req = urllib.request.Request(a.rpc, body, {"Content-Type": "application/json", "User-Agent": "tilcai-readonly-check"})
        res = json.load(urllib.request.urlopen(req, timeout=20))
        if "error" in res:
            raise RuntimeError(res["error"])
        return res["result"]

    def horizon(path):
        req = urllib.request.Request(a.horizon + path, headers={"User-Agent": "tilcai-readonly-check"})
        return json.load(urllib.request.urlopen(req, timeout=20))

    def entries(keys):
        return post("getLedgerEntries", {"keys": [base64.b64encode(k).decode() for k in keys]})["entries"] or []

    results = []

    def check(label, ok, detail=""):
        results.append(bool(ok))
        print(("PASS " if ok else "FAIL ") + label + (f" -> {detail}" if detail else ""))

    net = post("getNetwork")
    latest = post("getLatestLedger")["sequence"]
    check("RPC network is Testnet", net["passphrase"] == TESTNET, f"protocol {net.get('protocolVersion')}, ledger {latest}")

    inst = entries([contract_data_key(a.contract, i32(20))])
    check("contract instance exists", len(inst) == 1)
    if not inst:
        return 1
    _, executable, storage = contract_data_value(inst[0]["xdr"])
    ttl = inst[0].get("liveUntilLedgerSeq") or 0
    check("instance TTL beyond the signed-envelope window", ttl - latest > ENVELOPE_WINDOW_LEDGERS, f"live until ledger {ttl} ({ttl - latest} left)")
    check("executable is Wasm (not a Stellar Asset Contract)", executable[0] == "wasm", f"wasm sha256 {executable[1]}")
    if a.expected_wasm_hash:
        check("deployed Wasm matches the expected hash", executable[1] == a.expected_wasm_hash.lower())
    store = {}
    for k, v in storage or []:
        store[k[1][0][1] if k[0] == "vec" and k[1] else repr(k)] = v
    policy = {kk[1]: plain(vv) for kk, vv in store["Policy"][1]} if "Policy" in store else {}
    revision = plain(store.get("PolicyRevision", ("u64", 0)))
    print("INFO policy " + json.dumps(policy, default=str) + f", revision {revision}")
    check("policy owner", policy.get("owner") == a.owner)
    check("policy agent", policy.get("agent") == a.agent)
    check("policy asset", policy.get("asset") == a.asset)
    check("policy recipient", policy.get("recipient") == a.recipient)
    check("max_per_payment covers the amount", policy.get("max_per_payment", 0) >= a.amount, str(policy.get("max_per_payment")))
    check("limit - spent covers the amount", policy.get("limit", 0) - policy.get("spent", 0) >= a.amount, f"limit {policy.get('limit')} spent {policy.get('spent')}")
    check("not frozen", policy.get("frozen") is False)
    check("policy revision matches the reviewed revision", revision == a.expected_revision, f"{'stored' if 'PolicyRevision' in store else 'not stored, contract default'} {revision}")
    check("owner differs from agent", a.owner != a.agent)

    code = entries([i32(7) + bytes.fromhex(executable[1])])
    check("contract code entry exists", len(code) == 1)
    if code:
        r = Reader(base64.b64decode(code[0]["xdr"]))
        r.i32()
        if r.i32() == 1:  # ContractCodeEntry ext v1: cost inputs
            r.i32()
            [r.u32() for _ in range(10)]
        r.take(32)
        wasm = r.opaque()
        code_ttl = code[0].get("liveUntilLedgerSeq") or 0
        check("code TTL beyond the signed-envelope window", code_ttl - latest > ENVELOPE_WINDOW_LEDGERS, f"{code_ttl - latest} left")
        for name in (b"version", b"policy_state", b"policy_revision", b"spend", b"recipient", b"expected_policy_revision", b"PolicyChanged"):
            check(f"v2 interface present in contract spec: {name.decode()}", name in wasm)

    balance_key = contract_data_key(a.asset, i32(16) + u32(1) + u32(2) + i32(15) + xdr_string(b"Balance") + i32(18) + sc_address_contract(a.contract))
    bal = entries([balance_key])
    check("contract has an asset balance entry", len(bal) == 1)
    if bal:
        b = {kk[1]: plain(vv) for kk, vv in contract_data_value(bal[0]["xdr"])[1]}
        check("contract balance covers the amount", b.get("amount", 0) >= a.amount, f"{b.get('amount')} units")
        check("contract balance authorized", b.get("authorized") is True)

    for label, gid in (("agent", a.agent), ("recipient", a.recipient)):
        acc = horizon(f"/accounts/{gid}")
        xlm = next((x["balance"] for x in acc["balances"] if x["asset_type"] == "native"), "0")
        signers = [(s["key"], s["weight"]) for s in acc["signers"] if s["weight"] > 0]
        if label == "agent":
            check("agent account exists with XLM for fees", float(xlm) >= 1, f"{xlm} XLM, sequence {acc['sequence']}")
            check("agent is controlled only by its own key", signers == [(a.agent, signers[0][1])] if signers else False, str(signers))
        else:
            trust = next((x for x in acc["balances"] if x.get("asset_code") == "USDC" and x.get("asset_issuer") == a.asset_issuer), None)
            check("recipient has an authorized USDC trustline", trust is not None and trust.get("is_authorized") is True)

    print(f"SUMMARY {sum(results)}/{len(results)} checks passed")
    return 0 if all(results) else 1


if __name__ == "__main__":
    sys.exit(main())
