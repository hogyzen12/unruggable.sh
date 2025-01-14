const web3 = require("@solana/web3.js");
const axios = require("axios");
const bs58 = require("bs58");

const connection = new web3.Connection("https://damp-fabled-panorama.solana-mainnet.quiknode.pro/186133957d30cece76e7cd8b04bce0c5795c164e/");

async function sendTransactionJito(serializedTransaction) {
  const encodedTx = bs58.encode(serializedTransaction);
  const jitoURL = "https://mainnet.block-engine.jito.wtf/api/v1/transactions";
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "sendTransaction",
    params: [encodedTx],
  };

  try {
    const response = await axios.post(jitoURL, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data.result;
  } catch (error) {
    console.error("Error:", error);
    throw new Error("cannot send!");
  }
}

async function createPaymentTx(amountSol, destinationAddress, senderPublicKey) {
  const lamportsPerSol = web3.LAMPORTS_PER_SOL;
  const amountLamports = amountSol * lamportsPerSol;
  const fromAccount = new web3.Keypair.fromSeed(Uint8Array.from(senderPublicKey.toBytes()));

  const toAccount = new web3.PublicKey(destinationAddress);

  const blockhash = await connection.getLatestBlockhash();

  const config = {
    units: 1000,
    microLamports: 100000,
  };
  const computePriceIx = web3.ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: config.microLamports,
  });
  const computeLimitIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: config.units,
  });
  const instructions = [
    computePriceIx,
    computeLimitIx,
    web3.SystemProgram.transfer({
      fromPubkey: fromAccount.publicKey,
      toPubkey: toAccount,
      lamports: amountLamports,
    }),
    web3.SystemProgram.transfer({
      fromPubkey: fromAccount.publicKey,
      toPubkey: new web3.PublicKey("juLesoSmdTcRtzjCzYzRoHrnF8GhVu6KCV7uxq7nJGp"), // Unruggable tip account
      lamports: 100_000, // tip
    }),
    web3.SystemProgram.transfer({
      fromPubkey: fromAccount.publicKey,
      toPubkey: new web3.PublicKey("DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL"), // Jito tip account
      lamports: 100_000, // tip
    }),
  ];
  const messageV0 = new web3.TransactionMessage({
    payerKey: fromAccount.publicKey,
    recentBlockhash: blockhash.blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new web3.VersionedTransaction(messageV0);
  transaction.sign([fromAccount]);
  const rawTransaction = transaction.serialize();

  const txid = await sendTransactionJito(rawTransaction);
  return txid;
}

module.exports = {
  createPaymentTx,
};