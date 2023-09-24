import {
  Initialize,
  ModifyPosition,
  Swap as SwapEvent,
} from "../generated/PoolManager/PoolManager";
import { ContractStat, Pool, Position, Swap } from "../generated/schema";
import { Bytes, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import {
  ADDRESS_ZERO,
  CONTRACT_ADDRESS,
  ONE_BI,
  ZERO_BD,
  ZERO_BI,
} from "./constants";
import {
  handlePoolCreated,
  loadContractStat,
  loadTransaction,
  sqrtPriceX96ToTokenPrices,
} from "./helpers";
import { updatePoolHourData } from "./updateIntervals";

export function handleInitialize(event: Initialize): void {
  handlePoolCreated();
  let pool = new Pool(event.params.id.toHexString());
  pool.poolKey = event.params.id;
  pool.currency0 = event.params.currency0;
  pool.currency1 = event.params.currency1;
  pool.fee = event.params.fee;
  pool.tickSpacing = event.params.tickSpacing;
  pool.hookAddress = event.params.hooks;
  pool.txCnt = ZERO_BI;
  pool.liquidity = ZERO_BI;
  pool.sqrtPrice = ZERO_BI;
  pool.token0Price = ZERO_BD;
  pool.token1Price = ZERO_BD;
  pool.tick = ZERO_BI;
  pool.save();
}

export function handleModifyPosition(event: ModifyPosition): void {
  let stat = loadContractStat();
  stat.txCnt = stat.txCnt.plus(ONE_BI);
  stat.modifyPositionCnt = stat.modifyPositionCnt.plus(ONE_BI);
  stat.save();
  let trans = loadTransaction(event);
  let pool = Pool.load(event.params.id.toHexString());
  if (pool === null) {
    throw `Pool ${event.params.id.toHexString()} is non-existent when modifying liquidity.`;
  }
  let position = new Position(
    trans.id.toString() + "#" + pool.txCnt.toString()
  );
  position.transaction = trans.id;
  position.poolKey = event.params.id;
  position.sender = event.params.sender;
  position.logIndex = event.logIndex;

  position.currency0 = pool.currency0;
  position.currency1 = pool.currency1;
  pool.txCnt = pool.txCnt.plus(ONE_BI);

  position.liquidity = event.params.liquidityDelta.plus(pool.liquidity);
  position.sqrtPriceX96 = pool.sqrtPrice;
  let prices: BigDecimal[];
  if (pool.sqrtPrice.gt(ZERO_BI)) {
    prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice);
  } else {
    prices = [ZERO_BD, ZERO_BD];
  }
  position.token0Price = prices[0];
  position.token1Price = prices[1];
  position.tick = pool.tick;
  position.save();

  pool.liquidity = position.liquidity;
  pool.save();

  updatePoolHourData(event, position.poolKey.toHexString());
}

export function handleSwap(event: SwapEvent): void {
  let stat = loadContractStat();
  stat.txCnt = stat.txCnt.plus(ONE_BI);
  stat.swapCnt = stat.swapCnt.plus(ONE_BI);
  stat.save();
  let trans = loadTransaction(event);
  let pool = Pool.load(event.params.id.toHexString());
  if (pool === null) {
    throw `Pool ${event.params.id.toHexString()} is non-existent when doing swap.`;
  }
  let swap = new Swap(trans.id.toString() + "#" + pool.txCnt.toString());
  swap.transaction = trans.id;
  swap.poolKey = event.params.id;
  swap.sender = event.params.sender;

  swap.currency0 = pool.currency0;
  swap.currency1 = pool.currency1;
  pool.txCnt = pool.txCnt.plus(ONE_BI);

  swap.liquidity = event.params.liquidity;
  swap.sqrtPriceX96 = event.params.sqrtPriceX96;
  swap.amount0Delta = event.params.amount0;
  swap.amount1Delta = event.params.amount1;
  swap.logIndex = event.logIndex;
  swap.tick = BigInt.fromI32(event.params.tick);

  let prices = sqrtPriceX96ToTokenPrices(swap.sqrtPriceX96);
  swap.token0Price = prices[0];
  swap.token1Price = prices[1];
  swap.save();

  pool.liquidity = swap.liquidity;
  pool.sqrtPrice = swap.sqrtPriceX96;
  pool.token0Price = swap.token0Price;
  pool.token1Price = swap.token1Price;
  pool.tick = swap.tick;
  pool.save();

  updatePoolHourData(event, swap.poolKey.toHexString());
}
