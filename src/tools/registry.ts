import { ToolResult, Incident } from '../domain/types';
import { DataRepository } from '../data/repository';

// Define allowed tools (read-only operations only)
export type AllowedToolName = 
  | 'device-lookup'
  | 'zone-status'
  | 'incident-history';

// Tool definition interface
export interface ToolDefinition {
  name: AllowedToolName;
  description: string;
  isMutating: boolean;
  parameters: Record<string, { type: string; required: boolean; description: string }>;
}

// Tool registry
export class ToolRegistry {
  private static readonly ALLOWED_TOOLS: Record<AllowedToolName, ToolDefinition> = {
    'device-lookup': {
      name: 'device-lookup',
      description: 'Look up device information by ID',
      isMutating: false,
      parameters: {
        deviceId: { type: 'string', required: true, description: 'ID of the device to look up' }
      }
    },
    'zone-status': {
      name: 'zone-status',
      description: 'Get status information for a zone',
      isMutating: false,
      parameters: {
        zoneId: { type: 'string', required: true, description: 'ID of the zone to check status' }
      }
    },
    'incident-history': {
      name: 'incident-history',
      description: 'Get historical incidents for a device or zone',
      isMutating: false,
      parameters: {
        deviceId: { type: 'string', required: false, description: 'ID of the device to get incidents for' },
        zoneId: { type: 'string', required: false, description: 'ID of the zone to get incidents for' }
      }
    }
  };

  static getAllowedTools(): ToolDefinition[] {
    return Object.values(this.ALLOWED_TOOLS);
  }

  static getToolDefinition(toolName: AllowedToolName): ToolDefinition | null {
    return this.ALLOWED_TOOLS[toolName] || null;
  }

  static isToolAllowed(toolName: string): toolName is AllowedToolName {
    return toolName in this.ALLOWED_TOOLS;
  }

  static isToolMutating(toolName: string): boolean {
    const tool = this.getToolDefinition(toolName as AllowedToolName);
    return tool ? tool.isMutating : false;
  }

  static validateParameters(toolName: string, params: Record<string, any>): string[] {
    const errors: string[] = [];
    const toolDef = this.getToolDefinition(toolName as AllowedToolName);
    
    if (!toolDef) {
      errors.push(`Unknown tool: ${toolName}`);
      return errors;
    }
    
    // Check required parameters
    for (const [paramName, paramDef] of Object.entries(toolDef.parameters)) {
      if (paramDef.required && (params[paramName] === undefined || params[paramName] === null)) {
        errors.push(`Missing required parameter: ${paramName}`);
      }
    }
    
    return errors;
  }
}

// Tool execution context
export interface ToolExecutionContext {
  repository: DataRepository;
  toolName: AllowedToolName;
  parameters: Record<string, any>;
  timestamp: string;
}

// Tool execution function
export async function executeTool(
  context: ToolExecutionContext
): Promise<ToolResult<any>> {
  const { repository, toolName, parameters, timestamp } = context;
  
  // Validate tool is allowed
  if (!ToolRegistry.isToolAllowed(toolName)) {
    return {
      status: "failed",
      sourceId: `sim:tool-${toolName}`,
      observedAt: timestamp,
      retrievedAt: timestamp,
      simulation: true,
      label: "SIMULATED DATA",
      data: null,
      error: {
        code: "TOOL_NOT_ALLOWED",
        message: `Tool '${toolName}' is not allowed`
      }
    };
  }
  
  // Validate parameters
  const paramErrors = ToolRegistry.validateParameters(toolName, parameters);
  if (paramErrors.length > 0) {
    return {
      status: "failed",
      sourceId: `sim:tool-${toolName}`,
      observedAt: timestamp,
      retrievedAt: timestamp,
      simulation: true,
      label: "SIMULATED DATA",
      data: null,
      error: {
        code: "INVALID_PARAMETERS",
        message: paramErrors.join(", ")
      }
    };
  }
  
  // Execute the appropriate tool based on tool name
  try {
    switch (toolName) {
      case 'device-lookup':
        return await executeDeviceLookup(repository, parameters as { deviceId: string }, timestamp);
      case 'zone-status':
        return await executeZoneStatus(repository, parameters as { zoneId: string }, timestamp);
      case 'incident-history':
        return await executeIncidentHistory(repository, parameters as { deviceId?: string; zoneId?: string }, timestamp);
      default:
        return {
          status: "failed",
          sourceId: `sim:tool-${toolName}`,
          observedAt: timestamp,
          retrievedAt: timestamp,
          simulation: true,
          label: "SIMULATED DATA",
          data: null,
          error: {
            code: "UNKNOWN_TOOL",
            message: `Unknown tool: ${toolName}`
          }
        };
    }
  } catch (error) {
    return {
      status: "failed",
      sourceId: `sim:tool-${toolName}`,
      observedAt: timestamp,
      retrievedAt: timestamp,
      simulation: true,
      label: "SIMULATED DATA",
      data: null,
      error: {
        code: "EXECUTION_ERROR",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      }
    };
  }
}

// Individual tool implementations
async function executeDeviceLookup(
  repository: DataRepository,
  params: { deviceId: string },
  timestamp: string
): Promise<ToolResult<any>> {
  const device = repository.getDevice(params.deviceId);
  
  if (!device) {
    return {
      status: "failed",
      sourceId: `sim:device-${params.deviceId}`,
      observedAt: timestamp,
      retrievedAt: timestamp,
      simulation: true,
      label: "SIMULATED DATA",
      data: null,
      error: {
        code: "DEVICE_NOT_FOUND",
        message: `Device with ID ${params.deviceId} not found`
      }
    };
  }
  
  return {
    status: "ok",
    sourceId: device.id,
    observedAt: device.lastSeen,
    retrievedAt: timestamp,
    simulation: true,
    label: "SIMULATED DATA",
    data: device
  };
}

async function executeZoneStatus(
  repository: DataRepository,
  params: { zoneId: string },
  timestamp: string
): Promise<ToolResult<any>> {
  const zone = repository.getZone(params.zoneId);
  
  if (!zone) {
    return {
      status: "failed",
      sourceId: `sim:zone-${params.zoneId}`,
      observedAt: timestamp,
      retrievedAt: timestamp,
      simulation: true,
      label: "SIMULATED DATA",
      data: null,
      error: {
        code: "ZONE_NOT_FOUND",
        message: `Zone with ID ${params.zoneId} not found`
      }
    };
  }
  
  // Get devices in this zone
  const devicesInZone = repository.getDevicesByZone(zone.id);
  
  // Count devices by status
  const statusCount: Record<string, number> = {};
  devicesInZone.forEach(device => {
    statusCount[device.status] = (statusCount[device.status] || 0) + 1;
  });
  
  return {
    status: "ok",
    sourceId: zone.id,
    observedAt: timestamp,
    retrievedAt: timestamp,
    simulation: true,
    label: "SIMULATED DATA",
    data: {
      zone,
      deviceCount: devicesInZone.length,
      statusBreakdown: statusCount
    }
  };
}

async function executeIncidentHistory(
  repository: DataRepository,
  params: { deviceId?: string; zoneId?: string },
  timestamp: string
): Promise<ToolResult<any>> {
  let incidents: Incident[] = [];
  
  if (params.deviceId) {
    // Look for incidents affecting this device
    incidents = repository.listIncidents().filter(incident => 
      incident.affectedDevices.includes(params.deviceId!)
    );
  } else if (params.zoneId) {
    // Look for incidents in this zone
    incidents = repository.getIncidentsByZone(params.zoneId);
  } else {
    // Return all incidents
    incidents = repository.listIncidents();
  }
  
  // Filter out incidents that are resolved or closed if needed
  const activeIncidents = incidents.filter(i => 
    i.status !== 'resolved' && i.status !== 'closed'
  );
  
  return {
    status: "ok",
    sourceId: params.deviceId ? `sim:device-${params.deviceId}` : 
             params.zoneId ? `sim:zone-${params.zoneId}` : 
             "sim:all-incidents",
    observedAt: timestamp,
    retrievedAt: timestamp,
    simulation: true,
    label: "SIMULATED DATA",
    data: {
      totalIncidents: incidents.length,
      activeIncidents: activeIncidents.length,
      incidents: incidents.slice(0, 10) // Limit results for performance
    }
  };
}