import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Account, Asset, Keypair, Networks, Operation, TransactionBuilder, rpc, type rpc as RpcTypes } from "@stellar/stellar-sdk";
import { observeTestnetHash } from "./testnet-lookup.js";

const hash="a".repeat(64);
test("NOT_FOUND and RPC timeout stay uncertain",async()=>{
  const server={getNetwork:async()=>({passphrase:Networks.TESTNET,protocolVersion:"1"}),getTransaction:async()=>({txHash:hash,status:rpc.Api.GetTransactionStatus.NOT_FOUND})} as unknown as Pick<RpcTypes.Server,"getNetwork"|"getTransaction">;
  assert.deepEqual(await observeTestnetHash(server,hash),{status:"uncertain",reason:"not_found"});
  server.getTransaction=async()=>{throw new Error("timeout");};
  assert.deepEqual(await observeTestnetHash(server,hash),{status:"uncertain",reason:"rpc_error"});
});
test("wrong network and mismatched hash never create observations",async()=>{
  const server={getNetwork:async()=>({passphrase:Networks.PUBLIC,protocolVersion:"1"}),getTransaction:async()=>({txHash:hash,status:rpc.Api.GetTransactionStatus.NOT_FOUND})} as unknown as Pick<RpcTypes.Server,"getNetwork"|"getTransaction">;
  await assert.rejects(()=>observeTestnetHash(server,hash),/network mismatch/);
  server.getNetwork=async()=>({passphrase:Networks.TESTNET,protocolVersion:"1"});
  server.getTransaction=async()=>({txHash:"b".repeat(64),status:rpc.Api.GetTransactionStatus.NOT_FOUND} as RpcTypes.Api.GetMissingTransactionResponse);
  await assert.rejects(()=>observeTestnetHash(server,hash),/hash mismatch/);
});

test("RPC success is never promoted to payment confirmation without event verification",async()=>{
  const source=Keypair.random(), target=Keypair.random();
  const tx=new TransactionBuilder(new Account(source.publicKey(),"1"),{fee:"100",networkPassphrase:Networks.TESTNET}).addOperation(Operation.payment({destination:target.publicKey(),asset:Asset.native(),amount:"1"})).setTimeout(30).build();
  const txHash=Buffer.from(tx.hash()).toString("hex");
  const server={getNetwork:async()=>({passphrase:Networks.TESTNET,protocolVersion:"1"}),getTransaction:async()=>({txHash,status:rpc.Api.GetTransactionStatus.SUCCESS,ledger:123,envelopeXdr:tx.toEnvelope()})} as unknown as Pick<RpcTypes.Server,"getNetwork"|"getTransaction">;
  assert.deepEqual(await observeTestnetHash(server,txHash),{status:"unverified",rpcStatus:"SUCCESS",ledger:123});
});
