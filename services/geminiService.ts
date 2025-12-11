import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentId, Message, RoutingResponse } from "../types";

// Helper to get the AI client lazily
// This prevents top-level crashes if process.env is undefined at module load time
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from process.env");
    throw new Error("API Key is missing. Please configure it in your environment.");
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_FAST = "gemini-2.5-flash";
const MODEL_SMART = "gemini-2.5-flash";

/**
 * Step 1: The Navigator Agent determines which sub-agent should handle the request.
 */
export const routeRequest = async (userMessage: string): Promise<RoutingResponse> => {
  const navigator = AGENTS[AgentId.NAVIGATOR];
  const ai = getAiClient();
  
  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      targetAgentId: {
        type: Type.STRING,
        enum: [
          AgentId.SCHEDULER,
          AgentId.PATIENT_INFO,
          AgentId.BILLING,
          AgentId.MEDICAL_RECORDS
        ],
        description: "The ID of the specialist agent best suited for the request."
      },
      reasoning: {
        type: Type.STRING,
        description: "A brief explanation of why this agent was chosen."
      }
    },
    required: ["targetAgentId", "reasoning"]
  };

  try {
    const result = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: userMessage,
      config: {
        systemInstruction: navigator.systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for deterministic routing
      }
    });

    const text = result.text;
    if (!text) throw new Error("No response from Navigator");
    
    return JSON.parse(text) as RoutingResponse;
  } catch (error) {
    console.error("Routing error:", error);
    // Fallback to Patient Info if routing fails, or re-throw if critical
    return { targetAgentId: AgentId.PATIENT_INFO, reasoning: "System routing failed, defaulting to general inquiry." };
  }
};

/**
 * Step 2: The Specialist Agent executes the task.
 */
export const generateAgentResponse = async (
  agentId: AgentId,
  currentHistory: Message[],
  userInput: string
): Promise<{ text: string; groundingUrl?: string }> => {
  const agent = AGENTS[agentId];
  const ai = getAiClient();
  
  // Prepare contents history for context
  const historyParts = currentHistory.slice(-6).map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  const contents = [
    ...historyParts,
    { role: 'user', parts: [{ text: userInput }] }
  ];

  const tools = [];
  if (agent.tools?.includes('Google Search')) {
    tools.push({ googleSearch: {} });
  }

  try {
    const result = await ai.models.generateContent({
      model: MODEL_SMART,
      contents: contents as any,
      config: {
        systemInstruction: agent.systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    let groundingUrl: string | undefined = undefined;
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks && groundingChunks.length > 0) {
      const webChunk = groundingChunks.find((c: any) => c.web?.uri);
      if (webChunk) {
        groundingUrl = webChunk.web.uri;
      }
    }

    return { 
      text: result.text || "Mohon maaf, saya tidak dapat memproses permintaan Anda saat ini.",
      groundingUrl
    };

  } catch (error) {
    console.error("Agent generation error:", error);
    return { text: "Terjadi kesalahan sistem. Agen tidak tersedia saat ini." };
  }
};