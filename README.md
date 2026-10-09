# DinusNexus Synthetic Data Adapters

This project implements the synthetic data adapters required for the DinusNexus hackathon project, including:

1. **Synthetic Dataset Generation** - Complete campus data including buildings, zones, devices, and incidents
2. **Tool Adapters** - Read-only tool implementations for device lookup, zone status, and incident history
3. **Provider Adapters** - Configurable LLM provider with fallback to fake provider
4. **Test Fixtures** - Comprehensive test cases for valid input, empty input, tool failures, and provider failures

## Features Implemented

### 1. Synthetic Campus Data

Generated realistic campus data for:
- **4 Buildings** - Fakultas Teknik, Ekonomi, Ilmu Komputer, Hukum
- **18 Zones** - Labs, classrooms, offices, common areas
- **25 Devices** - Access points, switches, routers, gateways, servers, printers
- **12 Incidents** - Historical network issues with various statuses and priorities

All data is labeled with `sim:` prefix to indicate it's synthetic data for simulation purposes.

### 2. Tool Adapters (Read-Only)

Three read-only tools implemented:
- `device-lookup` - Look up device information by ID
- `zone-status` - Get status information for a zone
- `incident-history` - Get historical incidents for a device or zone

All tools are validated to ensure they only perform read operations and maintain the simulation label.

### 3. Provider Adapters

Configurable LLM provider that:
- Automatically falls back to a fake provider when configuration is incomplete
- Uses OpenAI-compatible API when full configuration is provided
- Properly handles timeouts and retries
- Redacts secrets from logs and error messages
- Reports token usage appropriately

### 4. Test Fixtures

Comprehensive test coverage for:
- **Valid input** - Normal workflow with proper data
- **Empty input** - Server-side validation of missing data
- **Tool failure** - Handling of missing or invalid device data
- **Provider failure** - Graceful handling of LLM provider errors

## Technical Implementation

### Project Structure

```
src/
├── domain/              # Type definitions
│   └── types.ts         # Campus data types and interfaces
├── data/                # Synthetic dataset generation
│   ├── buildings.json   # Campus buildings
│   ├── zones.json       # Campus zones
│   ├── devices.json     # Network devices
│   ├── incidents.json   # Historical incidents
│   ├── seed.ts          # Data loading and validation
│   └── repository.ts    # In-memory data repository
├── tools/               # Tool adapters
│   ├── registry.ts      # Tool registry and execution
│   └── types.ts         # Tool result types
├── providers/           # LLM provider adapters
│   ├── provider.ts      # Provider interface and implementation
│   └── index.ts         # Provider factory
└── index.ts             # Main entry point

tests/                   # Test fixtures and test files
├── fixtures/            # Test data scenarios
│   ├── input-valid.ts
│   ├── input-empty.ts
│   ├── tool-failure.ts
│   └── provider-failure.ts
├── tools.test.ts        # Tool adapter tests
├── provider.test.ts     # Provider adapter tests
└── seed-safety.test.ts  # Data seed validation tests
```

### Key Design Principles

1. **Security by Default** - All synthetic data is clearly labeled as simulated
2. **No Mutating Operations** - All tools are read-only to prevent unintended data changes
3. **Graceful Failure Handling** - Tools and providers handle errors gracefully
4. **Configuration Flexibility** - Providers automatically fallback when configuration is incomplete
5. **Test Coverage** - Comprehensive test suite validates all major scenarios

## Usage

### Initialize System

```typescript
import { seedData, DataRepository, ToolRegistry, executeTool, ProviderFactory, resolveProviderConfig } from './src/index';

// Seed the synthetic data
const data = await seedData();

// Create repository
const repository = new DataRepository();

// Resolve provider configuration
const config = resolveProviderConfig();
const provider = ProviderFactory.createProvider(config);

// Execute a tool
const result = await executeTool({
  repository,
  toolName: 'device-lookup',
  parameters: { deviceId: 'sim:device-AP-A1-01' },
  timestamp: new Date().toISOString()
});
```

### Running Tests

```bash
npm run test
```

### Type Checking

```bash
npm run typecheck
```

## Documentation References

This implementation aligns with the following project documentation:
- [DATA_SECURITY.md](docs/DATA_SECURITY.md) - Security and data handling practices
- [WORKFLOWS.md](docs/WORKFLOWS.md) - Workflow and tool execution patterns
- [TEAM_DEVELOPMENT_PLAN.md](docs/TEAM_DEVELOPMENT_PLAN.md) - Development approach and testing strategies

## Compliance

All synthetic data adheres to:
- Simulation labeling requirements
- Security best practices
- Data anonymization principles
- Testing framework standards