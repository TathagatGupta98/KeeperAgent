# @keeperhub/plugin-keeperkit

ElizaOS plugin for **KeeperHub** blockchain automation. Wraps the [`keeperkit`](https://www.npmjs.com/package/keeperkit) SDK to expose all KeeperHub capabilities as ElizaOS-native actions, providers, and services — enabling AI agents to manage workflows, execute on-chain operations, and access the marketplace with **x402 payment** support.

## Installation

```bash
# Using npm
npm install @keeperhub/plugin-keeperkit

# Using pnpm
pnpm add @keeperhub/plugin-keeperkit

# Using bun
bun add @keeperhub/plugin-keeperkit
```

> **Note:** `@elizaos/core` is a peer dependency — your ElizaOS agent project should already have it installed.

## Configuration

Set the following environment variables (or configure via ElizaOS runtime settings):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KEEPERHUB_API_KEY` | ✅ | — | Your KeeperHub API key (starts with `kh_`) |
| `KEEPERHUB_DIRECT_EXECUTION_API_KEY` | ❌ | `KEEPERHUB_API_KEY` | API key used for direct execution endpoints (`X-API-Key`) |
| `KEEPERHUB_BASE_URL` | ❌ | `https://app.keeperhub.com/api` | API base URL |
| `KEEPERHUB_TIMEOUT` | ❌ | `30000` | Request timeout in ms |

### `.env` example

```env
KEEPERHUB_API_KEY=kh_your_api_key_here
KEEPERHUB_DIRECT_EXECUTION_API_KEY=keeper_your_direct_execution_key_here
KEEPERHUB_BASE_URL=https://app.keeperhub.com/api
KEEPERHUB_TIMEOUT=30000
```

## Quick Start

Register the plugin in your ElizaOS agent configuration:

```typescript
import { keeperKitPlugin } from '@keeperhub/plugin-keeperkit';

const agent = {
  plugins: [keeperKitPlugin],
  settings: {
    KEEPERHUB_API_KEY: process.env.KEEPERHUB_API_KEY,
  },
};
```

That's it! Your agent now has access to all KeeperHub actions.

## Available Actions (22 total)

### Workflow Management (7)

| Action | Description | Example Prompt |
|--------|-------------|----------------|
| `LIST_WORKFLOWS` | List all workflows | "Show me my workflows" |
| `GET_WORKFLOW` | Get workflow details | "Show workflow wf_abc123" |
| `CREATE_WORKFLOW` | Create from description | "Create a balance monitor workflow" |
| `UPDATE_WORKFLOW` | Modify a workflow | "Rename workflow wf_abc to 'Updated'" |
| `DELETE_WORKFLOW` | Delete a workflow | "Delete workflow wf_abc123" |
| `ENABLE_WORKFLOW` | Enable a workflow | "Enable workflow wf_abc123" |
| `DISABLE_WORKFLOW` | Disable a workflow | "Turn off workflow wf_abc123" |

### Execution (5)

| Action | Description | Example Prompt |
|--------|-------------|----------------|
| `EXECUTE_WORKFLOW` | Trigger execution | "Run workflow wf_abc123" |
| `GET_EXECUTION` | Check execution status | "Status of execution exec_001" |
| `LIST_EXECUTIONS` | Execution history | "Show executions for wf_abc123" |
| `GET_EXECUTION_LOGS` | Per-node logs | "Show logs for execution exec_001" |
| `WAIT_EXECUTION` | Poll until complete | "Wait for execution exec_001" |

### Direct On-Chain Execution (3)

| Action | Description | Example Prompt |
|--------|-------------|----------------|
| `TRANSFER_TOKEN` | Token transfer | "Transfer 100 USDC to 0xAddr on Base" |
| `CONTRACT_CALL` | Contract function call | "Call approve on 0xToken for 0xSpender" |
| `CHECK_AND_EXECUTE` | Conditional execution | "If balance > 1 ETH, transfer 0.5" |

### Marketplace with x402 Payments (2)

| Action | Description | Example Prompt |
|--------|-------------|----------------|
| `SEARCH_MARKETPLACE` | Search listed workflows | "Search marketplace for DeFi workflows" |
| `CALL_LISTED_WORKFLOW` | Call with x402 support | "Call the balance-check workflow" |

### Integrations (3)

| Action | Description | Example Prompt |
|--------|-------------|----------------|
| `LIST_INTEGRATIONS` | List connections | "Show my integrations" |
| `CREATE_INTEGRATION` | Add connection | "Create a Discord integration" |
| `DELETE_INTEGRATION` | Remove connection | "Delete integration int_abc" |

### Chains & Schemas (2)

| Action | Description | Example Prompt |
|--------|-------------|----------------|
| `LIST_CHAINS` | Supported blockchains | "What chains does KeeperHub support?" |
| `GET_CONTRACT_ABI` | Fetch contract ABI | "Get ABI for 0xAddr on chain 1" |
| `GET_MCP_SCHEMAS` | Available actions/triggers | "What actions are available?" |

## Available Providers

| Provider | Dynamic | Description |
|----------|---------|-------------|
| `KEEPERHUB_WORKFLOWS` | ✅ | Injects active workflow summaries into agent context |
| `KEEPERHUB_CHAINS` | ❌ | Injects supported chains (cached) |
| `KEEPERHUB_RECENT_EXECUTIONS` | ✅ | Injects recent execution statuses |

## x402 Payment Integration

The `CALL_LISTED_WORKFLOW` action handles **x402 HTTP Payment Required** challenges:

1. **Calls** the listed workflow via `client.listedWorkflows.call(slug, input)`
2. If the workflow requires payment, parses the **402 challenge** (price, rails, recipient)
3. **Auto-pays** via the agent's wallet service if available:
   - Finds the x402 rail
   - Signs USDC payment to the recipient
   - Retries the call with `X-PAYMENT` header
4. **Falls back** to presenting the payment challenge to the user if auto-pay isn't available

```
User: "Call the yield-optimizer workflow"

Agent: 💰 Payment Required
- Workflow: yield-optimizer
- Price: 0.01 USDC per call
- Payment rails:
  - X402: 10000 on chain 8453 → 0xRecipient
```

## Usage Examples

### Natural Language → Agent Action

```
User: "List my workflows"
Agent: Found 3 workflow(s):
  1. Balance Monitor (wf_abc) — ✅ Enabled
  2. Price Alert (wf_def) — ❌ Disabled
  3. Auto Swap (wf_ghi) — ✅ Enabled

User: "Enable workflow wf_def"
Agent: ✅ Price Alert (wf_def) is now enabled.

User: "Execute workflow wf_abc"
Agent: 🚀 Workflow wf_abc triggered!
  Execution ID: exec_001

User: "Wait for execution exec_001"
Agent: ⏳ Waiting for execution exec_001...
Agent: ✅ Execution exec_001 completed with status: success
  Duration: 4500ms, Steps: 5/5

User: "Transfer 1000000 USDC to 0xRecipient on Base"
Agent: 💸 Initiating transfer...
Agent: ✅ Transfer completed — Tx: 0xabc...
```

## Development

### Setup (from monorepo root)

```bash
# Install dependencies
pnpm install

# Build the SDK first (plugin depends on it)
pnpm build:sdk

# Build the plugin
pnpm build:plugin

# Type-check
pnpm --filter @keeperhub/plugin-keeperkit type-check

# Run tests
pnpm --filter @keeperhub/plugin-keeperkit test
```

### Project Structure

```
plugin-elizaos/
├── src/
│   ├── index.ts                      # Plugin entry point
│   ├── services/
│   │   └── keeperkit-service.ts      # KeeperKit client singleton
│   ├── actions/
│   │   ├── workflow-actions.ts       # 7 workflow actions
│   │   ├── execution-actions.ts      # 5 execution actions
│   │   ├── direct-execute-actions.ts # 3 direct execution actions
│   │   ├── marketplace-actions.ts    # 2 marketplace actions (x402)
│   │   ├── integration-actions.ts    # 3 integration actions
│   │   ├── chain-actions.ts          # 2 chain actions
│   │   └── schema-actions.ts         # 1 schema action
│   ├── providers/
│   │   ├── workflow-provider.ts      # Active workflows context
│   │   ├── chain-provider.ts         # Supported chains context
│   │   └── execution-provider.ts     # Recent executions context
│   ├── evaluators/
│   │   └── execution-evaluator.ts    # Execution outcome tracking
│   └── types/
│       └── index.ts                  # Shared types & constants
└── __tests__/
    ├── test-utils.ts                 # Mock runtime & service
    ├── service.test.ts
    ├── actions.test.ts
    └── providers.test.ts
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  ElizaOS Agent                   │
├─────────────────────────────────────────────────┤
│  @keeperhub/plugin-keeperkit                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ Actions  │ │Providers │ │    Evaluators     │ │
│  │ (22)     │ │ (3)      │ │ (1)              │ │
│  └────┬─────┘ └────┬─────┘ └────────┬─────────┘ │
│       │            │               │             │
│       └────────────┼───────────────┘             │
│                    │                             │
│          ┌─────────┴─────────┐                   │
│          │  KeeperKitService │                   │
│          │  (singleton)      │                   │
│          └─────────┬─────────┘                   │
├────────────────────┼────────────────────────────┤
│                    │                             │
│          ┌─────────┴─────────┐                   │
│          │    keeperkit SDK  │                   │
│          │  (workspace dep)  │                   │
│          └─────────┬─────────┘                   │
│                    │                             │
│          KeeperHub API                           │
└─────────────────────────────────────────────────┘
```

## License

MIT
