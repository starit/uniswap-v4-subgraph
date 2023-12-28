/* eslint-disable prefer-const */
import {
  log,
  BigInt,
  BigDecimal,
  Address,
  ethereum,
} from "@graphprotocol/graph-ts";
import { PoolManager, Transaction } from "../generated/schema";
import {
  ADDRESS_ZERO,
  POOL_MANAGER_ADDRESS,
  ONE_BI,
  ZERO_BI,
  ZERO_BD,
  BI_18,
} from "./constants";

export function loadTransaction(event: ethereum.Event): Transaction {
  let transaction = Transaction.load(event.transaction.hash.toHexString());
  if (transaction === null) {
    transaction = new Transaction(event.transaction.hash.toHexString());
  }
  transaction.blockNumber = event.block.number;
  transaction.timestamp = event.block.timestamp;
  transaction.gasLimit = event.transaction.gasLimit;
  transaction.gasPrice = event.transaction.gasPrice;
  transaction.from = event.transaction.from;
  transaction.to = event.transaction.to;
  transaction.save();
  return transaction as Transaction;
}

// ? todo: fix params, add POOL_MANAGER_ADDRESS
export function loadPoolManagerCreated(): PoolManager {
  // load pool manager
  let poolManager = PoolManager.load(POOL_MANAGER_ADDRESS);
  if (poolManager === null) {
    poolManager = new PoolManager(POOL_MANAGER_ADDRESS);
    poolManager.poolCount = ZERO_BI;
    poolManager.txCount = ZERO_BI;
    poolManager.modifyPositionCount = ZERO_BI;
    poolManager.swapCount = ZERO_BI;
    poolManager.totalLiquidity = ZERO_BI;
    poolManager.lockLength = ZERO_BI;
    // poolManager.protocolFeeController = ADDRESS_ZERO; // Todo:: fix this
    poolManager.controllerGasLimit = ZERO_BI; // Todo:: fix this

    poolManager.owner = ADDRESS_ZERO;
    poolManager.save();
  }
  // poolManager.poolCount = poolManager.poolCount.plus(ONE_BI);
  
  return poolManager;
}

let Q192 = BigInt.fromI32(2).pow(192);

export function exponentToBigDecimal(decimals: BigInt): BigDecimal {
  let bd = BigDecimal.fromString("1");
  for (let i = ZERO_BI; i.lt(decimals as BigInt); i = i.plus(ONE_BI)) {
    bd = bd.times(BigDecimal.fromString("10"));
  }
  return bd;
}

// return 0 if denominator is 0 in division
export function safeDiv(amount0: BigDecimal, amount1: BigDecimal): BigDecimal {
  if (amount1.equals(ZERO_BD)) {
    return ZERO_BD;
  } else {
    return amount0.div(amount1);
  }
}

export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: BigInt): BigDecimal[] {
  let num = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal();
  let denom = BigDecimal.fromString(Q192.toString());
  // log.critical("num: {}, denom: {}", [num.toString(), denom.toString()]);
  // log.critical("{}", [exponentToBigDecimal(BI_18).toString()]);
  let price1 = num
    .div(denom)
    .times(exponentToBigDecimal(BI_18))
    .div(exponentToBigDecimal(BI_18));

  let price0 = safeDiv(BigDecimal.fromString("1"), price1);
  return [price0, price1];
}
