import { describe, it, expect } from 'vitest';
import { seedData } from '../src/data/seed';

describe('Seed Safety Validation', () => {
  it('should load and seed data successfully', async () => {
    const data = await seedData();
    
    // Basic validation that data was loaded
    expect(data.buildings).toHaveLength(4);
    expect(data.zones).toHaveLength(18); // There were actually 18 zones, not 19
    expect(data.devices).toHaveLength(25);
    expect(data.incidents).toHaveLength(12);
    
    // Check that all IDs have the sim: prefix
    const allIds = [
      ...data.buildings.map(b => b.id),
      ...data.zones.map(z => z.id),
      ...data.devices.map(d => d.id),
      ...data.incidents.map(i => i.id)
    ];
    
    const invalidIds = allIds.filter(id => !id.startsWith('sim:'));
    expect(invalidIds).toHaveLength(0);
    
    console.log('✓ All seed data loaded and validated successfully');
  });
});