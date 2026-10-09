// Main entry point for the synthetic data adapters
import { seedData } from './data/seed';
import { DataRepository } from './data/repository';
import { ToolRegistry, executeTool } from './tools/registry';
import { ProviderFactory, resolveProviderConfig } from './providers/provider';

console.log('DinusNexus Synthetic Data Adapters initialized');

// Initialize the system
async function initSystem() {
  try {
    // Seed the data
    const data = await seedData();
    console.log(`✓ Loaded ${data.buildings.length} buildings`);
    console.log(`✓ Loaded ${data.zones.length} zones`);
    console.log(`✓ Loaded ${data.devices.length} devices`);
    console.log(`✓ Loaded ${data.incidents.length} incidents`);
    
    // Create repository
    const repository = new DataRepository();
    console.log('✓ Data repository created');
    
    // List allowed tools
    const tools = ToolRegistry.getAllowedTools();
    console.log('✓ Available tools:');
    tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    
    // Resolve provider configuration
    const config = resolveProviderConfig();
    console.log('✓ Provider configuration resolved');
    
    // Create provider
    const provider = ProviderFactory.createProvider(config);
    console.log(`✓ Provider created: ${provider.name}`);
    
    console.log('\nSystem initialization complete!');
    console.log('Ready to use synthetic data adapters for IT Helpdesk workflow.');
    
    return {
      repository,
      tools,
      provider
    };
  } catch (error) {
    console.error('✗ Failed to initialize system:', error);
    process.exit(1);
  }
}

// Export for use in tests and other modules
export { seedData, DataRepository, ToolRegistry, executeTool, ProviderFactory, resolveProviderConfig };

// If run directly, initialize the system
if (require.main === module) {
  initSystem().catch(console.error);
}

export default initSystem;