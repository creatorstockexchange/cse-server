# Token Bonding Curve Smart Contract - System Integration Guide

## Overview

This Anchor smart contract implements a **token bonding curve** mechanism that enables dynamic pricing for creator tokens based on supply and demand. The contract integrates seamlessly with your existing microservices architecture to provide a complete creator token economy.

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [System Architecture](#system-architecture)
3. [Microservices Integration](#microservices-integration)
4. [Transaction Flows](#transaction-flows)
5. [Data Flow Diagrams](#data-flow-diagrams)

---

## How It Works

### Token Bonding Curve Concept

A bonding curve is an automated market maker (AMM) that determines token price algorithmically based on supply:

- **Buying tokens**: Price increases as more tokens are purchased (supply goes up)
- **Selling tokens**: Price decreases as tokens are sold back (supply goes down)
- **Mathematical Formula**: `Price = Initial_Price + (Slope × Current_Supply)`
- **Always Liquid**: Users can buy/sell anytime without needing a counterparty

### Key Characteristics

1. **Deterministic Pricing**: Price is calculated by a mathematical formula, not market orders
2. **Instant Liquidity**: No need to wait for buyers/sellers - contract acts as counterparty
3. **Transparent Economics**: All parameters (slope, initial price, reserve ratio) are visible on-chain
4. **Reserve-Backed**: SOL collected from buys backs the tokens (can be sold back for SOL)
5. **Creator Fees**: Creators earn from the difference between buy and sell prices (reserve ratio)

### Example Scenario

```
Creator: "Alice the Artist"
Initial Settings:
├── Initial Price: 0.001 SOL per token
├── Slope: 0.0001 SOL (price increases by this for each token in circulation)
├── Reserve Ratio: 50% (sellers get 50% back, 50% stays as creator profit)
└── Total Supply: 1,000,000 tokens (max mintable)

Timeline:

Day 1: Bob buys 100 tokens
├── Token #1 costs: 0.001 SOL
├── Token #50 costs: 0.001 + (0.0001 × 50) = 0.006 SOL
├── Token #100 costs: 0.001 + (0.0001 × 100) = 0.011 SOL
├── Total Bob pays: ~0.505 SOL
├── Reserve vault now holds: 0.505 SOL
└── Bob receives: 100 tokens

Day 5: Bob sells 50 tokens back
├── Tokens sold at current price (supply = 100, going down to 50)
├── Fair refund amount: ~0.175 SOL (what those 50 tokens cost to buy)
├── After reserve ratio (50%): Bob gets 0.0875 SOL
├── Remaining in reserve: 0.505 - 0.0875 = 0.4175 SOL
└── Creator can withdraw: 0.4175 - (minimum reserve needed) = profit

Day 10: Carol buys 200 tokens
├── Current supply: 50 (after Bob's partial sell)
├── Price now starts from: 0.001 + (0.0001 × 50) = 0.006 SOL
├── Carol's 200 tokens cost more due to higher starting point
└── Reserve grows as more people buy
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐ │
│  │  Web App    │  │  Mobile App  │  │ Admin Panel │  │ Trading Bot  │ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘ │
│         │                │                  │                 │         │
│         └────────────────┴──────────────────┴─────────────────┘         │
│                                    │                                     │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY / LOAD BALANCER                     │
│                     (Authentication, Rate Limiting, Routing)             │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐
│USER SERVICE  │  │INDEXER       │  │SWEEPER SERVICE           │
│              │  │SERVICE       │  │                          │
│- User Auth   │  │              │  │- Fund Consolidation      │
│- Profiles    │  │- Monitor     │  │- Hot/Cold Wallet Mgmt    │
│- KYC/Verify  │  │  Blockchain  │  │- Liquidity Management    │
│- IPO Mgmt    │  │- Track Txns  │  │- Reserve Rebalancing     │
│- Balances    │  │- Event       │  │- Security Operations     │
│- Trade       │  │  Listening   │  │                          │
│  History     │  │- Sync State  │  │                          │
│              │  │              │  │                          │
│PostgreSQL    │  │Redis Cache   │  │Job Queue (Bull/Bee)      │
│+ Prisma ORM  │  │              │  │                          │
└──────┬───────┘  └──────┬───────┘  └────────┬─────────────────┘
       │                 │                   │
       │                 │                   │
       └─────────────────┼───────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │   BLOCKCHAIN INTERACTION LAYER         │
        │   (New Microservice)                   │
        │                                        │
        │   - Smart Contract Deployment         │
        │   - Buy/Sell Transaction Execution    │
        │   - Price Queries                     │
        │   - Balance Checks                    │
        │   - Event Subscription                │
        │   - RPC Connection Pool               │
        │                                        │
        │   Solana Web3.js + Anchor Client      │
        └──────────────────┬─────────────────────┘
                           │
                           │ RPC Calls
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SOLANA BLOCKCHAIN                                 │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  BONDING CURVE SMART CONTRACT (On-Chain Program)                   │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │ │
│  │  │ Bonding Curve    │  │ Token Mint       │  │ Reserve Vault   │ │ │
│  │  │ State (PDA)      │  │ (SPL Token)      │  │ (PDA)           │ │ │
│  │  │                  │  │                  │  │                 │ │ │
│  │  │ - creator_id     │  │ - Symbol         │  │ - Holds SOL     │ │ │
│  │  │ - slope          │  │ - Decimals       │  │ - Backing       │ │ │
│  │  │ - initial_price  │  │ - Supply         │  │   tokens        │ │ │
│  │  │ - reserve_ratio  │  │ - Mint authority │  │ - Controlled    │ │ │
│  │  │ - current_supply │  │   = bonding_curve│  │   by program    │ │ │
│  │  │ - total_reserve  │  │                  │  │                 │ │ │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘ │ │
│  │                                                                     │ │
│  │  Instructions:                                                      │ │
│  │  ├── initialize_creator_token()                                    │ │
│  │  ├── buy_tokens()                                                  │ │
│  │  ├── sell_tokens()                                                 │ │
│  │  └── withdraw_fees()                                               │ │
│  │                                                                     │ │
│  │  Events Emitted:                                                    │ │
│  │  ├── TokenPurchased {buyer, amount, cost, new_supply}             │ │
│  │  ├── TokenSold {seller, amount, refund, new_supply}               │ │
│  │  └── FeesWithdrawn {creator, amount}                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  USER DEPOSIT ADDRESSES (Existing System)                          │ │
│  │                                                                     │ │
│  │  For each user:                                                     │ │
│  │  ├── Solana Address (for SOL deposits)                            │ │
│  │  ├── Ethereum Address (for ETH/USDC deposits)                     │ │
│  │  └── Bitcoin Address (for BTC deposits)                           │ │
│  │                                                                     │ │
│  │  Monitored by Indexer Service ────┐                                │ │
│  │  Swept by Sweeper Service ────────┘                                │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Microservices Integration

### 1. User Service (Existing - PostgreSQL + Prisma)

**Role**: Central data management and business logic

**Bonding Curve Integration Points**:

```
┌─────────────────────────────────────────────────────────────┐
│ USER SERVICE - Database Schema Extensions                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ creator_token (Enhanced)                                     │
│ ├── Existing Fields:                                        │
│ │   ├── name, symbol, total_supply                         │
│ │   ├── mintAddress (blockchain address)                   │
│ │   └── user_id (links to creator)                         │
│ │                                                            │
│ └── NEW Fields for Bonding Curve:                          │
│     ├── bondingCurveAddress (PDA from smart contract)      │
│     ├── reserveVaultAddress (PDA holding SOL reserves)     │
│     ├── initialPrice (starting price in lamports)          │
│     ├── slope (price increase per token)                   │
│     ├── reserveRatio (percentage for sell refunds)         │
│     ├── currentSupply (synced from blockchain)             │
│     ├── totalReserve (SOL backing tokens)                  │
│     └── currentPrice (cached for quick queries)            │
│                                                              │
│ token_trades (NEW Table)                                    │
│ ├── id, user_id, creator_token_id                          │
│ ├── type (buy/sell)                                         │
│ ├── amount (number of tokens)                              │
│ ├── price_per_token (at time of trade)                     │
│ ├── total_cost (in SOL)                                     │
│ ├── transaction_hash (blockchain signature)                │
│ ├── status (pending/confirmed/failed)                      │
│ └── timestamps                                              │
│                                                              │
│ deposit_addresses (Existing)                                │
│ └── Continues to track user deposit addresses per chain    │
│                                                              │
│ transactions (Existing)                                     │
│ └── Records all deposits, withdrawals, transfers           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Responsibilities**:
- Store bonding curve metadata (addresses, parameters)
- Track all buy/sell trades in `token_trades` table
- Maintain user token balances
- Provide APIs for price queries (cached from blockchain)
- Handle creator profile approvals → trigger bonding curve deployment
- Generate trade history reports and analytics
- Manage user wallets and authentication

**API Endpoints** (Examples):
```
POST   /api/creator-tokens/deploy           - Deploy new bonding curve
GET    /api/creator-tokens/:id/price        - Get current price
POST   /api/creator-tokens/:id/buy          - Initiate buy transaction
POST   /api/creator-tokens/:id/sell         - Initiate sell transaction
GET    /api/creator-tokens/:id/trades       - Get trade history
GET    /api/users/:id/token-balances        - Get user's token holdings
POST   /api/creators/:id/withdraw-fees      - Creator withdraws profits
```

---

### 2. Indexer Service (Existing - Monitors Blockchain)

**Role**: Real-time blockchain monitoring and state synchronization

**Bonding Curve Integration**:

```
┌──────────────────────────────────────────────────────────────┐
│ INDEXER SERVICE - Event Listening & State Sync               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [A] Monitor User Deposit Addresses (EXISTING)                │
│     ┌─────────────────────────────────────────┐             │
│     │ For each active deposit_address:        │             │
│     │ 1. Check balance periodically           │             │
│     │ 2. Detect new deposits                  │             │
│     │ 3. Wait for confirmations (32 blocks)   │             │
│     │ 4. Create transaction record in DB      │             │
│     │ 5. Notify sweeper service               │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│ [B] Listen to Bonding Curve Events (NEW)                     │
│     ┌─────────────────────────────────────────┐             │
│     │ Subscribe to Program Events:            │             │
│     │                                          │             │
│     │ Event: TokenPurchased                   │             │
│     │ ├── Extract: buyer, amount, cost        │             │
│     │ ├── Map buyer wallet → user_id          │             │
│     │ ├── Create token_trades record          │             │
│     │ ├── Update creator_token.currentSupply  │             │
│     │ ├── Update creator_token.totalReserve   │             │
│     │ └── Calculate and cache new price       │             │
│     │                                          │             │
│     │ Event: TokenSold                        │             │
│     │ ├── Extract: seller, amount, refund     │             │
│     │ ├── Map seller wallet → user_id         │             │
│     │ ├── Create token_trades record          │             │
│     │ ├── Update creator_token.currentSupply  │             │
│     │ ├── Update creator_token.totalReserve   │             │
│     │ └── Recalculate and cache price         │             │
│     │                                          │             │
│     │ Event: FeesWithdrawn                    │             │
│     │ ├── Extract: creator, amount            │             │
│     │ ├── Create transaction record           │             │
│     │ └── Update creator balance              │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│ [C] Periodic State Reconciliation (NEW)                      │
│     ┌─────────────────────────────────────────┐             │
│     │ Every 10 minutes:                       │             │
│     │ 1. Fetch all bonding curve accounts     │             │
│     │ 2. Compare on-chain vs DB state         │             │
│     │ 3. Reconcile discrepancies              │             │
│     │ 4. Alert if major differences found     │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│ [D] Transaction Confirmation Tracking                        │
│     ┌─────────────────────────────────────────┐             │
│     │ For pending token_trades:               │             │
│     │ 1. Monitor transaction signature        │             │
│     │ 2. Check confirmation count             │             │
│     │ 3. Update status: pending → confirmed   │             │
│     │ 4. Handle failures and retries          │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Data Flow**:
```
Blockchain Event → Indexer Detects → Parse Event Data → 
Map Wallet to User → Update Database → Invalidate Cache → 
Notify User (WebSocket/Push) → Log for Analytics
```

**Key Features**:
- **WebSocket connections** to Solana RPC for real-time events
- **Event parsing** using Anchor IDL to decode program logs
- **Wallet-to-User mapping** (links blockchain addresses to internal user IDs)
- **Confirmation tracking** (waits for finality before marking confirmed)
- **Error handling** (retry failed updates, alert on anomalies)
- **Redis caching** (stores recent prices and trade data)

---

### 3. Sweeper Service (Existing - Fund Management)

**Role**: Automated treasury and liquidity management

**Bonding Curve Integration**:

```
┌──────────────────────────────────────────────────────────────┐
│ SWEEPER SERVICE - Automated Fund Management                  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ [A] User Deposit Sweeping (EXISTING)                         │
│     ┌─────────────────────────────────────────┐             │
│     │ Triggered by: Indexer detection         │             │
│     │                                          │             │
│     │ Process:                                 │             │
│     │ 1. User deposits SOL to their address   │             │
│     │ 2. Indexer detects → creates txn record │             │
│     │ 3. Wait for 32 confirmations            │             │
│     │ 4. Sweeper transfers to HOT WALLET      │             │
│     │ 5. Update user internal balance         │             │
│     │ 6. Mark transaction as complete         │             │
│     │                                          │             │
│     │ Security:                                │             │
│     │ - Multi-sig for cold wallet moves       │             │
│     │ - Rate limiting on withdrawals          │             │
│     │ - Alert on suspicious patterns          │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│ [B] Reserve Vault Management (NEW)                           │
│     ┌─────────────────────────────────────────┐             │
│     │ Monitor Reserve Vaults:                 │             │
│     │                                          │             │
│     │ For each creator's bonding curve:       │             │
│     │ ├── Check reserve vault balance         │             │
│     │ ├── Calculate minimum reserve needed    │             │
│     │ │   (based on current supply & curve)   │             │
│     │ ├── Calculate excess reserves           │             │
│     │ │   = total_reserve - min_reserve       │             │
│     │ │   - safety_buffer                     │             │
│     │ └── If excess > threshold:              │             │
│     │     └── Move to COLD STORAGE            │             │
│     │                                          │             │
│     │ Why?                                     │             │
│     │ - Security: Minimize hot wallet risk    │             │
│     │ - Efficiency: Optimize capital usage    │             │
│     │ - Safety: Always keep minimum reserve   │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│ [C] Hot Wallet Liquidity Management (NEW)                    │
│     ┌─────────────────────────────────────────┐             │
│     │ Ensure Hot Wallet has enough SOL for:  │             │
│     │                                          │             │
│     │ 1. User buy transactions                │             │
│     │ 2. User withdrawals                     │             │
│     │ 3. Gas fees                             │             │
│     │                                          │             │
│     │ If hot_wallet_balance < MIN_THRESHOLD:  │             │
│     │ ├── Calculate needed amount             │             │
│     │ ├── Request from cold storage           │             │
│     │ ├── Require multi-sig approval          │             │
│     │ └── Transfer and log                    │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
│ [D] Emergency Procedures                                     │
│     ┌─────────────────────────────────────────┐             │
│     │ - Pause trading if anomaly detected     │             │
│     │ - Freeze reserves if hack suspected     │             │
│     │ - Alert ops team immediately            │             │
│     │ - Implement circuit breakers            │             │
│     └─────────────────────────────────────────┘             │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Wallet Architecture**:
```
User Deposits → User Deposit Addresses (Many)
                        ↓
                  HOT WALLET (1)
                  ├── Handles daily operations
                  ├── User withdrawals
                  ├── Buy/sell transactions
                  └── Gas fees
                        ↓
                  COLD STORAGE (1-3)
                  ├── Multi-sig controlled
                  ├── Holds majority of funds
                  ├── Reserve excess
                  └── Emergency backup

Reserve Vaults (Per Creator) → Connected to bonding curves
                               → Swept to cold storage when excess
```

**Sweeper Jobs** (Scheduled Tasks):
- **Every 5 minutes**: Check user deposit addresses
- **Every 15 minutes**: Review reserve vault levels
- **Every hour**: Reconcile hot wallet balance
- **Daily**: Audit all movements, generate reports
- **On-demand**: Emergency freeze/pause operations

---

### 4. Blockchain Interaction Service (NEW)

**Role**: Direct interface to Solana blockchain for bonding curve operations

```
┌──────────────────────────────────────────────────────────────┐
│ BLOCKCHAIN INTERACTION SERVICE                               │
│ (New Microservice - Node.js/TypeScript)                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Core Responsibilities:                                        │
│                                                               │
│ [1] Smart Contract Deployment                                │
│     - When creator approved in User Service                  │
│     - Generate keypairs for token mint                       │
│     - Call initialize_creator_token instruction              │
│     - Return addresses to User Service for storage           │
│                                                               │
│ [2] Transaction Execution                                    │
│     - Build transactions for buy/sell operations             │
│     - Sign with hot wallet                                   │
│     - Submit to blockchain                                   │
│     - Monitor for confirmation                               │
│     - Return signature to User Service                       │
│                                                               │
│ [3] On-Chain Queries                                         │
│     - Fetch bonding curve state (current supply, reserves)   │
│     - Calculate prices (current, for X tokens)               │
│     - Check user token balances                              │
│     - Verify transaction status                              │
│                                                               │
│ [4] RPC Connection Management                                │
│     - Maintain pool of RPC connections                       │
│     - Load balance across providers                          │
│     - Handle rate limits                                     │
│     - Fallback to backup RPCs                                │
│                                                               │
│ [5] Transaction Queue                                        │
│     - Queue incoming buy/sell requests                       │
│     - Process sequentially per user                          │
│     - Retry failed transactions                              │
│     - Prevent duplicate submissions                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Why Separate Service?**
- **Isolation**: Blockchain operations don't impact main business logic
- **Scalability**: Can scale independently based on transaction volume
- **Expertise**: Specialized team can manage blockchain complexity
- **Reliability**: Dedicated error handling and retry logic
- **Security**: Isolated key management and signing operations

---

## Transaction Flows

### Flow 1: Creator Token Deployment

```
┌──────┐         ┌──────────┐         ┌────────────┐         ┌───────────┐
│Admin │         │   User   │         │ Blockchain │         │ Indexer   │
│Panel │         │ Service  │         │  Service   │         │  Service  │
└──┬───┘         └────┬─────┘         └─────┬──────┘         └─────┬─────┘
   │                  │                     │                       │
   │ 1. Approve       │                     │                       │
   │   Creator        │                     │                       │
   ├─────────────────>│                     │                       │
   │                  │                     │                       │
   │                  │ 2. Create           │                       │
   │                  │    creator_token    │                       │
   │                  │    record           │                       │
   │                  │ (DB: pending)       │                       │
   │                  │                     │                       │
   │                  │ 3. Request Deploy   │                       │
   │                  ├────────────────────>│                       │
   │                  │ {creator_id,        │                       │
   │                  │  token_name,        │                       │
   │                  │  initial_price,     │                       │
   │                  │  slope,             │                       │
   │                  │  reserve_ratio}     │                       │
   │                  │                     │                       │
   │                  │                     │ 4. Generate Keypairs  │
   │                  │                     │    (Token Mint)       │
   │                  │                     │                       │
   │                  │                     │ 5. Derive PDAs        │
   │                  │                     │    - bonding_curve    │
   │                  │                     │    - reserve_vault    │
   │                  │                     │                       │
   │                  │                     │ 6. Call Smart Contract│
   │                  │                     │ initialize_creator_   │
   │                  │                     │ token()               │
   │                  │                     ├──────────────┐        │
   │                  │                     │              │        │
   │                  │                     │   Solana     │        │
   │                  │                     │  Blockchain  │        │
   │                  │                     │              │        │
   │                  │                     │ ✓ Created    │        │
   │                  │                     │<─────────────┘        │
   │                  │                     │                       │
   │                  │ 7. Return Addresses │                       │
   │                  │<────────────────────┤                       │
   │                  │ {mint_address,      │                       │
   │                  │  bonding_curve_addr,│                       │
   │                  │  reserve_vault_addr,│                       │
   │                  │  transaction_sig}   │                       │
   │                  │                     │                       │
   │                  │ 8. Update DB        │                       │
   │                  │    (store addresses)│                       │
   │                  │                     │                       │
   │                  │                     │ 9. Emit Event         │
   │                  │                     │   TokenInitialized    │
   │                  │                     ├──────────────────────>│
   │                  │                     │                       │
   │                  │                     │                       │10. Index
   │                  │                     │                       │   Event
   │                  │                     │                       │   Confirm
   │ 11. Notify       │                     │                       │   in DB
   │    Creator       │                     │                       │
   │<─────────────────┤                     │                       │
   │ "Token Live!"    │                     │                       │
   │                  │                     │                       │
```

**Database State Changes**:
```
Before: creator_token {status: null}
After:  creator_token {
  mintAddress: "7xKX...abc",
  bondingCurveAddress: "Bnd9...xyz",
  reserveVaultAddress: "Rsv4...def",
  initialPrice: 0.001,
  slope: 0.0001,
  reserveRatio: 5000,
  currentSupply: 0,
  totalReserve: 0,
  status: "active"
}
```

---

### Flow 2: User Buys Tokens

```
┌──────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌─────────┐
│ User │   │   User   │   │ Blockchain │   │  Solana  │   │Indexer  │
│  App │   │ Service  │   │  Service   │   │   Chain  │   │ Service │
└──┬───┘   └────┬─────┘   └─────┬──────┘   └────┬─────┘   └────┬────┘
   │            │               │               │              │
   │ 1. Click   │               │               │              │
   │   "Buy 100"│               │               │              │
   ├───────────>│               │               │              │
   │            │               │               │              │
   │            │ 2. Check      │               │              │
   │            │    User KYC   │               │              │
   │            │    & Balance  │               │              │
   │            │               │               │              │
   │            │ 3. Calculate  │               │              │
   │            │    Cost       │               │              │
   │            ├──────────────>│               │              │
   │            │ "How much for │               │              │
   │            │  100 tokens?" │               │              │
   │            │               │               │              │
   │            │               │ 4. Query      │              │
   │            │               │    On-chain   │              │
   │            │               ├──────────────>│              │
   │            │               │ Get current   │              │
   │            │               │ supply        │              │
   │            │               │<──────────────┤              │
   │            │               │ supply: 1000  │              │
   │            │               │               │              │
   │            │               │ 5. Calculate  │              │
   │            │               │    Integral   │              │
   │            │               │    Cost       │              │
   │            │               │ = 0.505 SOL   │              │
   │            │               │               │              │
   │            │ 6. Return     │               │              │
   │            │    Quote      │               │              │
   │            │<──────────────┤               │              │
   │            │ {cost: 0.505, │               │              │
   │            │  price: ~0.01}│               │              │
   │            │               │               │              │
   │ 7. Show    │               │               │              │
   │    Quote   │               │               │              │
   │<───────────┤               │               │              │
   │            │               │               │              │
   │ 8. Confirm │               │               │              │
   │    Purchase│               │               │              │
   ├───────────>│               │               │              │
   │            │               │               │              │
   │            │ 9. Create     │               │              │
   │            │    Trade      │               │              │
   │            │    Record     │               │              │
   │            │ (status:      │               │              │
   │            │  pending)     │               │              │
   │            │               │               │              │
   │            │ 10. Execute   │               │              │
   │            │     Buy       │               │              │
   │            ├──────────────>│               │              │
   │            │ {user_wallet, │               │              │
   │            │  amount: 100, │               │              │
   │            │  creator_id}  │               │              │
   │            │               │               │              │
   │            │               │ 11. Build Txn │              │
   │            │               │     - Get user│              │
   │            │               │       token   │              │
   │            │               │       account │              │
   │            │               │     - Create  │              │
   │            │               │       if      │              │
   │            │               │       needed  │              │
   │            │               │     - Call    │              │
   │            │               │       buy_    │              │
   │            │               │       tokens()│              │
   │            │               │               │              │
   │            │               │ 12. Submit    │              │
   │            │               ├──────────────>│              │
   │            │               │               │              │
   │            │               │    Smart      │              │
   │            │               │   Contract    │              │
   │            │               │   Executes:   │              │
   │            │               │   - Transfer  │              │
   │            │               │     0.505 SOL │              │
   │            │               │     to reserve│              │
   │            │               │   - Mint 100  │              │
   │            │               │     tokens    │              │
   │            │               │   - Update    │              │
   │            │               │     supply    │              │
   │            │               │   - Emit      │              │
   │            │               │     event     │              │
   │            │               │               │              │
   │            │               │ 13. ✓ Success │              │
   │            │               │<──────────────┤              │
   │            │               │ {signature}   │              │
   │            │               │               │              │
   │            │ 14. Return Sig│               │              │
   │            │<──────────────┤               │              │
   │            │               │               │              │
   │            │ 15. Update    │               │              │
   │            │     Trade     │               │              │
   │            │ (status:      │               │              │
   │            │  submitted)   │               │              │
   │            │               │               │              │
   │            │               │               │ 16. Event    │
   │            │               │               │ TokenPurchase│
   │            │               │               ├─────────────>│
   │            │               │               │              │
   │            │               │               │              │17. Parse
   │            │               │               │              │   Event
   │            │               │               │              │
   │            │               │               │              │18. Update
   │            │               │               │              │   DB
   │            │               │               │              │   - trade
   │            │               │               │              │     status:
   │            │               │               │              │     confirmed
   │            │               │               │              │   - creator
   │            │               │               │              │     _token
   │            │               │               │              │     supply
   │            │               │               │              │
   │            │ 19. Webhook   │               │              │
   │            │<──────────────┼───────────────┼──────────────┤
   │            │ "Trade        │               │              │
   │            │  Confirmed"   │               │              │
   │            │               │               │              │
   │ 20. Push   │               │               │              │
   │     Notif  │               │               │              │
   │<───────────┤               │               │              │
   │ "You now   │               │               │              │
   │  own 100   │               │               │              │
   │  tokens!"  │               │               │              │
   │            │               │               │              │
```

**Key Points**:
- User never directly interacts with blockchain
- All SOL transfers happen on-chain automatically
- Token minting is atomic with payment
- Indexer confirms and updates database
- User sees real-time balance updates

---

### Flow 3: User Sells Tokens

```
┌──────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌─────────┐
│ User │   │   User   │   │ Blockchain │   │  Solana  │   │Indexer  │
│  App │   │ Service  │   │  Service   │   │   Chain  │   │ Service │
└──┬───┘   └────┬─────┘   └─────┬──────┘   └────┬─────┘   └────┬────┘
   │            │               │               │              │
   │ 1. "Sell   │               │               │              │
   │    50      │               │               │              │
   │    tokens" │               │               │              │
   ├───────────>│               │               │              │
   │            │               │               │              │
   │            │ 2. Check User │               │              │
   │            │    Token      │               │              │
   │            │    Balance    │               │              │
   │            │ (must have ≥50│               │              │
   │            │               │               │              │
   │            │ 3. Calculate  │               │              │
   │            │    Refund     │               │              │
   │            ├──────────────>│               │              │
   │            │               │               │              │
   │            │               │ 4. Query      │              │
   │            │               │    Current    │              │
   │            │               │    State      │              │
   │            │               ├──────────────>│              │
   │            │               │<──────────────┤              │
   │            │               │ supply: 1100  │              │
   │            │               │               │              │
   │            │               │ 5. Calculate  │              │
   │            │               │    Sell Price │              │
   │            │               │ refund_before │              │
   │            │               │ _fee: 0.3 SOL │              │
   │            │               │ after_fee:    │              │
   │            │               │ 0.15 SOL (50%)│              │
   │            │               │               │              │
   │            │ 6. Return     │               │              │
   │            │<──────────────┤               │              │
   │            │ {refund: 0.15}│               │              │
   │            │               │               │              │
   │ 7. Show    │               │               │              │
   │    Quote   │               │               │              │
   │<───────────┤               │               │              │
   │            │               │               │              │
   │ 8. Confirm │               │               │              │
   ├───────────>│               │               │              │
   │            │               │               │              │
   │            │ 9. Create     │               │              │
   │            │    Trade      │               │              │
   │            │    Record     │               │              │
   │            │               │               │              │
   │            │ 10. Execute   │               │              │
   │            │     Sell      │               │              │
   │            ├──────────────>│               │              │
   │            │               │               │              │
   │            │               │ 11. Build Txn │              │
   │            │               │    Call       │              │
   │            │               │    sell_      │              │
   │            │               │    tokens()   │              │
   │            │               │               │              │
   │            │               │ 12. Submit    │              │
   │            │               ├──────────────>│              │
   │            │               │               │              │
   │            │               │   Contract:   │              │
   │            │               │   - Burn 50   │              │
   │            │               │     tokens    │              │
   │            │               │   - Transfer  │              │
   │            │               │     0.15 SOL  │              │
   │            │               │     to user   │              │
   │            │               │   - Update    │              │
   │            │               │     supply    │              │
   │            │               │               │              │
   │            │               │ 13. ✓ Done    │              │
   │            │               │<──────────────┤              │
   │            │               │               │              │
   │            │ 14. Return    │               │              │
   │            │<──────────────┤               │              │
   │            │               │               │              │
   │            │               │               │ 15. Event    │
   │            │               │               │ TokenSold    │
   │            │               │               ├─────────────>│
   │            │               │               │              │
   │            │               │               │              │16. Update
   │            │               │               │              │   DB
   │            │               │               │              │
   │ 17. Notify │               │               │              │
   │<───────────┴───────────────┴───────────────┴──────────────┤
   │ "Sold! Got │               │               │              │
   │  0.15 SOL" │               │               │              │
   │            │               │               │              │
```

---

### Flow 4: Creator Withdraws Fees

```
┌─────────┐   ┌──────────┐   ┌────────────┐   ┌──────────┐   ┌─────────┐
│ Creator │   │   User   │   │ Blockchain │   │  Solana  │   │ Sweeper │
│ Dashboard│  │ Service  │   │  Service   │   │   Chain  │   │ Service │
└────┬────┘   └────┬─────┘   └─────┬──────┘   └────┬─────┘   └────┬────┘
     │             │               │               │              │
     │ 1. Request  │               │               │              │
     │   "Withdraw │               │               │              │
     │    Fees"    │               │               │              │
     ├────────────>│               │               │              │
     │             │               │               │              │
     │             │ 2. Verify     │               │              │
     │             │    Creator    │               │              │
     │             │    Identity   │               │              │
     │             │               │               │              │
     │             │ 3. Calculate  │               │              │
     │             │    Available  │               │              │
     │             │    Fees       │               │              │
     │             ├──────────────>│               │              │
     │             │               │               │              │
     │             │               │ 4. Query      │              │
     │             │               │    Reserve    │              │
     │             │               ├──────────────>│              │
     │             │               │<──────────────┤              │
     │             │               │ total_reserve │              │
     │             │               │ current_supply│              │
     │             │               │               │              │
     │             │               │ 5. Calculate: │              │
     │             │               │ min_reserve = │              │
     │             │               │   integral    │              │
     │             │               │   (for all    │              │
     │             │               │    tokens)    │              │
     │             │               │               │              │
     │             │               │ available =   │              │
     │             │               │  total - min  │              │
     │             │               │               │              │
     │             │ 6. Return     │               │              │
     │             │<──────────────┤               │              │
     │             │ {available:   │               │              │
     │             │  2.5 SOL}     │               │              │
     │             │               │               │              │
     │ 7. Show     │               │               │              │
     │<────────────┤               │               │              │
     │             │               │               │              │
     │ 8. Confirm  │               │               │              │
     │    Amount   │               │               │              │
     │    (1 SOL)  │               │               │              │
     ├────────────>│               │               │              │
     │             │               │               │              │
     │             │ 9. Request    │               │              │
     │             │    Withdrawal │               │              │
     │             ├──────────────>│               │              │
     │             │               │               │              │
     │             │               │10. Call       │              │
     │             │               │   withdraw_   │              │
     │             │               │   fees()      │              │
     │             │               ├──────────────>│              │
     │             │               │               │              │
     │             │               │   Contract:   │              │
     │             │               │   - Verify    │              │
     │             │               │     creator   │              │
     │             │               │   - Check     │              │
     │             │               │     available │              │
     │             │               │   - Transfer  │              │
     │             │               │     1 SOL     │              │
     │             │               │               │              │
     │             │               │11. ✓ Done     │              │
     │             │               │<──────────────┤              │
     │             │               │               │              │
     │             │12. Log        │               │              │
     │             │   Transaction │               │              │
     │             │               │               │              │
     │             │               │               │13. Detect    │
     │             │               │               │   Withdrawal │
     │             │               │               ├─────────────>│
     │             │               │               │              │
     │             │               │               │              │14. Monitor
     │             │               │               │              │   Creator
     │             │               │               │              │   Wallet
     │             │               │               │              │
     │             │               │               │              │15. Optional:
     │             │               │               │              │   Move to
     │             │               │               │              │   Creator's
     │             │               │               │              │   preferred
     │             │               │               │              │   cold
     │             │               │               │              │   wallet
     │13. Notify   │               │               │              │
     │<────────────┤               │               │              │
     │"Withdrawn   │               │               │              │
     │ 1 SOL"      │               │               │              │
     │             │               │               │              │
```

---

### Flow 5: Background - Indexer & Sweeper Coordination

```
┌─────────┐                    ┌─────────┐                  ┌─────────┐
│ Indexer │                    │  User   │                  │ Sweeper │
│ Service │                    │ Service │                  │ Service │
└────┬────┘                    └────┬────┘                  └────┬────┘
     │                              │                            │
     │ ┌──────────────────┐         │                            │
     │ │ Every 10 seconds │         │                            │
     │ └──────────────────┘         │                            │
     │                              │                            │
     │ 1. Scan deposit addresses   │                            │
     │    WHERE is_active = true    │                            │
     │    AND chain = 'solana'      │                            │
     │                              │                            │
     │ 2. Check each address        │                            │
     │    balance on blockchain     │                            │
     │                              │                            │
     │ 3. Found deposit!            │                            │
     │    User ID: 123              │                            │
     │    Amount: 5 SOL             │                            │
     │    Address: 7xKX...          │                            │
     │                              │                            │
     │ 4. Create transaction        │                            │
     │    record                    │                            │
     ├─────────────────────────────>│                            │
     │ INSERT INTO transactions     │                            │
     │ (user_id, type, amount,      │                            │
     │  status, confirmations)      │                            │
     │ VALUES (123, 'deposit',      │                            │
     │  5.0, 'pending', 0)          │                            │
     │                              │                            │
     │ 5. Monitor confirmations     │                            │
     │    (wait for 32 blocks)      │                            │
     │                              │                            │
     │ ... (30 seconds later)       │                            │
     │                              │                            │
     │ 6. Confirmations reached 32  │                            │
     │                              │                            │
     │ 7. Update transaction        │                            │
     ├─────────────────────────────>│                            │
     │ UPDATE transactions          │                            │
     │ SET confirmations = 32       │                            │
     │                              │                            │
     │ 8. Notify sweeper            │                            │
     ├──────────────────────────────┼───────────────────────────>│
     │ {                            │                            │
     │   user_id: 123,              │                            │
     │   address: "7xKX...",        │                            │
     │   amount: 5.0,               │                            │
     │   txn_id: "uuid-..."         │                            │
     │ }                            │                            │
     │                              │                            │
     │                              │                            │
     │                              │         9. Queue job       │
     │                              │            "sweep-deposit" │
     │                              │                            │
     │                              │         10. Execute sweep  │
     │                              │             - Transfer from│
     │                              │               user address │
     │                              │               to hot wallet│
     │                              │                            │
     │                              │         11. Update txn     │
     │                              │<───────────────────────────┤
     │                              │ UPDATE transactions        │
     │                              │ SET status = 'confirmed',  │
     │                              │ blockchain_hash = '...'    │
     │                              │                            │
     │                              │12. Credit user balance     │
     │                              │    (internal accounting)   │
     │                              │                            │
     │                              │         13. Sweep complete │
     │                              │            notification    │
     │<─────────────────────────────┴────────────────────────────┤
     │                              │                            │
     │                              │                            │
     │ Meanwhile...                 │                            │
     │                              │                            │
     │ 14. Listen to bonding        │                            │
     │     curve events             │                            │
     │     (TokenPurchased,         │                            │
     │      TokenSold)              │                            │
     │                              │                            │
     │ 15. Parse events and         │                            │
     │     update DB                │                            │
     ├─────────────────────────────>│                            │
     │ UPDATE creator_token         │                            │
     │ UPDATE token_trades          │                            │
     │                              │                            │
     │                              │                            │
     │                              │         ┌────────────────┐ │
     │                              │         │ Every 15 mins  │ │
     │                              │         └────────────────┘ │
     │                              │                            │
     │                              │         16. Check reserve  │
     │                              │             vaults         │
     │                              │                            │
     │                              │         FOR EACH creator:  │
     │                              │         - Get on-chain     │
     │                              │           reserve balance  │
     │                              │         - Calculate min    │
     │                              │           needed           │
     │                              │         - If excess > 10   │
     │                              │           SOL:             │
     │                              │           Move to cold     │
     │                              │           storage          │
     │                              │                            │
     │                              │         17. Log all moves  │
     │                              │<───────────────────────────┤
     │                              │ INSERT INTO transactions   │
     │                              │ (type: 'cold_storage_      │
     │                              │  transfer')                │
     │                              │                            │
```

---

## Data Flow Diagrams

### User Balance Flow

```
USER DEPOSITS SOL
       │
       ▼
┌──────────────────┐
│ User Deposit     │ ← Unique address per user/chain
│ Address (Solana) │
└─────────┬────────┘
          │
          │ Indexer detects
          ▼
┌──────────────────┐
│ Transactions     │ ← Record created (status: pending)
│ Table (DB)       │
└─────────┬────────┘
          │
          │ After 32 confirmations
          ▼
┌──────────────────┐
│ Sweeper Service  │ ← Transfers to hot wallet
│                  │
└─────────┬────────┘
          │
          ▼
┌──────────────────┐
│ Hot Wallet       │ ← Platform's operational wallet
│ (SOL Balance)    │
└─────────┬────────┘
          │
          │ User requests buy
          ▼
┌──────────────────┐
│ Bonding Curve    │ ← SOL transferred here automatically
│ Reserve Vault    │
└─────────┬────────┘
          │
          │ Excess reserves
          ▼
┌──────────────────┐
│ Cold Storage     │ ← Multi-sig secured
│                  │
└──────────────────┘
```

### Token Lifecycle

```
CREATOR APPROVED
       │
       ▼
┌──────────────────────────┐
│ Deploy Bonding Curve     │
│ - Create token mint      │
│ - Set parameters         │
│ - Initialize reserve     │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Token Mint Created       │
│ Supply: 0                │
│ Price: initial_price     │
└──────────┬───────────────┘
           │
           ▼
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌────────┐   ┌────────┐
│  BUY   │   │  SELL  │
└───┬────┘   └───┬────┘
    │            │
    │            │
    ▼            ▼
┌─────────────────────┐
│ Supply Changes      │
│ ├─ Buy: +tokens     │
│ └─ Sell: -tokens    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Price Adjusts       │
│ P = P₀ + (m × s)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Reserve Updates     │
│ ├─ Buy: +SOL        │
│ └─ Sell: -SOL       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Indexer Updates DB  │
│ - creator_token     │
│ - token_trades      │
└─────────────────────┘
```

### Multi-Service Event Flow

```
BLOCKCHAIN EVENT OCCURS
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐   ┌───────────┐  ┌──────────┐  ┌──────────┐
│ Indexer  │   │ Blockchain│  │  User    │  │ Sweeper  │
│ Service  │   │  Service  │  │ Service  │  │ Service  │
│          │   │           │  │          │  │          │
│ Listens  │   │ Queries   │  │ Receives │  │ Monitors │
│ to logs  │   │ on demand │  │ webhooks │  │ balances │
└─────┬────┘   └─────┬─────┘  └────┬─────┘  └────┬─────┘
      │              │             │             │
      │ Parse event  │             │             │
      ▼              │             │             │
┌──────────────┐     │             │             │
│ Extract data │     │             │             │
│ - user_id    │     │             │             │
│ - amount     │     │             │             │
│ - type       │     │             │             │
└──────┬───────┘     │             │             │
       │             │             │             │
       │ Update DB   │             │             │
       ├────────────────────────────>            │
       │             │             │             │
       │             │ Trigger     │             │
       │             │ webhook     │             │
       │             ├────────────>│             │
       │             │             │             │
       │             │             │ Push to     │
       │             │             │ user        │
       │             │             │             │
       │             │             │ Check if    │
       │             │             │ rebalance   │
       │             │             │ needed      │
       │             │             ├────────────>│
       │             │             │             │
       │             │             │             │ Execute
       │             │             │             │ sweep/
       │             │             │             │ rebalance
       │             │             │             │
       └─────────────┴─────────────┴─────────────┘
                     All services synchronized
```

---