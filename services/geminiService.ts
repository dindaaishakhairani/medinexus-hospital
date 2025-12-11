import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AGENTS } from "../constants";
import { AgentId, Message, RoutingResponse } from "../types";

// Initialize Gemini Client
// We assume process.env.API_KEY is available as per instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = "gemini-2.5-flash";
const MODEL_SMART = "gemini-2.5-flash"; // Using flash for responsiveness, but could upgrade to pro

/**
 * Step 1: The Navigator Agent determines which sub-agent should handle the request.
 */
export const routeRequest = async (userMessage: string): Promise<RoutingResponse> => {
  const navigator = AGENTS[AgentId.NAVIGATOR];
  
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
    // Fallback to Patient Info if routing fails
    return { targetAgentId: AgentId.PATIENT_INFO, reasoning: "Routing failed, defaulting to general inquiry." };
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
  
  // Prepare contents history for context
  // We only send the last few messages to keep context relevant but concise
  const historyParts = currentHistory.slice(-6).map(msg => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  // Add the current user input to the end
  const contents = [
    ...historyParts,
    { role: 'user', parts: [{ text: userInput }] }
  ];

  const tools = [];
  // Add Google Search if the agent is allowed to use it
  if (agent.tools?.includes('Google Search')) {
    tools.push({ googleSearch: {} });
  }

  try {
    const result = await ai.models.generateContent({
      model: MODEL_SMART,
      contents: contents as any, // Type cast for simplicity with simple history structure
      config: {
        systemInstruction: agent.systemInstruction,
        tools: tools.length > 0 ? tools : undefined,
      }
    });

    // specific handling for grounding metadata
    let groundingUrl: string | undefined = undefined;
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (groundingChunks && groundingChunks.length > 0) {
      // Find the first chunk with a web URI
      const webChunk = groundingChunks.find((c: any) => c.web?.uri);
      if (webChunk) {
        groundingUrl = webChunk.web.uri;
      }
    }

    return { 
      text: result.text || "I apologize, but I couldn't generate a response at this time.",
      groundingUrl
    };

  } catch (error) {
    console.error("Agent generation error:", error);
    return { text: "System Error: The agent is currently unavailable. Please try again." };
  }
};