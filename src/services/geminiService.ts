import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface DecisionAnalysis {
  summary: string;
  recommendation: string;
  risks: string[];
  opportunities: string[];
}

export async function analyzeDecision(
  title: string,
  description: string,
  options: { name: string; pros: string[]; cons: string[] }[]
): Promise<DecisionAnalysis> {
  const prompt = `
    Analyze the following decision:
    Title: ${title}
    Description: ${description}
    
    Options:
    ${options.map(opt => `
      Option: ${opt.name}
      Pros: ${opt.pros.join(', ')}
      Cons: ${opt.cons.join(', ')}
    `).join('\n')}
    
    Provide a structured analysis including a summary, a clear recommendation, potential risks, and hidden opportunities.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          recommendation: { type: Type.STRING },
          risks: { type: Type.ARRAY, items: { type: Type.STRING } },
          opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["summary", "recommendation", "risks", "opportunities"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
