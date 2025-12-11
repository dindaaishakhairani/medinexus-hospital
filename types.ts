export enum AgentId {
  NAVIGATOR = 'NAVIGATOR',
  SCHEDULER = 'SCHEDULER',
  PATIENT_INFO = 'PATIENT_INFO',
  BILLING = 'BILLING',
  MEDICAL_RECORDS = 'MEDICAL_RECORDS',
}

export interface AgentConfig {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  color: string; // Tailwind color prefix (e.g., 'blue', 'green')
  bgColor: string; // Hex or tailwind class for background
  iconName: 'Network' | 'Calendar' | 'User' | 'CreditCard' | 'FileText';
  systemInstruction: string;
  tools?: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  agentId?: AgentId; // The agent who sent this message
  timestamp: Date;
  metadata?: {
    isHandover?: boolean;
    groundingUrl?: string;
  };
}

export interface RoutingResponse {
  targetAgentId: AgentId;
  reasoning: string;
}