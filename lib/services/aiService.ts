/**
 * AI Service for intelligent traffic management (AMBUCLEAR Integration)
 * Supports multiple AI backends: Ollama (local), Google Gemini
 */

interface TrafficContext {
  ambulanceLocation?: { lat: number; lng: number };
  ambulanceDirection?: number;
  emergencyLevel: 'red' | 'yellow' | 'green';
  trafficLevel?: 'low' | 'medium' | 'high' | 'severe' | 'unknown';
  nearbyVehicles?: any[];
  roadType?: 'highway' | 'main-road' | 'narrow-street';
  lanes?: number;
}

interface AIInstruction {
  action: 'move-left' | 'move-right' | 'stop-and-wait' | 'maintain-speed';
  instruction: string;
  urgency: 'high' | 'medium' | 'low';
  estimatedClearTime: number;
}

interface AIConfig {
  provider?: 'ollama' | 'gemini';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export class AIService {
  private provider: string;
  private apiKey?: string;
  private baseUrl: string;
  private model: string;

  constructor(config: AIConfig = {}) {
    this.provider = config.provider || 'ollama';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.model = config.model || 'llama3.1:8b';
  }

  /**
   * Analyze traffic situation and provide movement instructions
   */
  async analyzeTrafficAndProvideInstructions(context: TrafficContext): Promise<AIInstruction> {
    const prompt = this._buildPrompt(context);

    try {
      let response: string;
      switch (this.provider) {
        case 'ollama':
          response = await this._queryOllama(prompt);
          break;
        case 'gemini':
          response = await this._queryGemini(prompt);
          break;
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }

      return this._parseResponse(response);
    } catch (error) {
      console.error('AI service error:', error);
      return this._fallbackInstructions(context);
    }
  }

  /**
   * Build prompt for AI model
   */
  private _buildPrompt(context: TrafficContext): string {
    const urgencyMap = {
      red: 'critical trauma emergency',
      yellow: 'moderate medical emergency',
      green: 'non-emergency transport'
    };

    return `You are a traffic management AI assistant for emergency vehicle routing.
An ambulance with ${urgencyMap[context.emergencyLevel]} is approaching.

Context:
- Ambulance Location: ${context.ambulanceLocation ? `${context.ambulanceLocation.lat}, ${context.ambulanceLocation.lng}` : 'unknown'}
- Direction: ${context.ambulanceDirection ?? 'unknown'}
- Traffic Level: ${context.trafficLevel || 'unknown'}
- Road Type: ${context.roadType || 'main-road'}
- Lanes: ${context.lanes || 2}
- Nearby Vehicles: ${context.nearbyVehicles?.length || 0}

Respond ONLY in valid JSON with this exact shape:
{
  "action": "move-left" | "move-right" | "stop-and-wait" | "maintain-speed",
  "instruction": "short, clear instruction",
  "urgency": "high" | "medium" | "low",
  "estimatedClearTime": number
}`;
  }

  /**
   * Query Ollama (local LLM)
   */
  private async _queryOllama(prompt: string): Promise<string> {
    const url = `${this.baseUrl}/api/generate`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: prompt,
        stream: false,
        format: 'json'
      })
    });

    const data = await response.json();
    return data.response;
  }

  /**
   * Query Google Gemini API
   */
  private async _queryGemini(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    return data.candidates[0]?.content?.parts[0]?.text || '';
  }

  /**
   * Parse AI response into structured format
   */
  private _parseResponse(response: string): AIInstruction {
    try {
      if (typeof response === 'string') {
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                         response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
      }
      return response as any;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        action: 'move-left',
        instruction: response.substring(0, 200),
        urgency: 'high',
        estimatedClearTime: 30
      };
    }
  }

  /**
   * Fallback rule-based instructions when AI fails
   */
  private _fallbackInstructions(context: TrafficContext): AIInstruction {
    const { emergencyLevel, trafficLevel, lanes = 2, roadType } = context;

    let action: AIInstruction['action'] = 'move-left';
    let instruction = '';
    let urgency: AIInstruction['urgency'] = 'medium';
    let estimatedClearTime = 20;

    if (emergencyLevel === 'red') {
      urgency = 'high';
      estimatedClearTime = 10;
      if (lanes >= 2) {
        action = 'move-left';
        instruction = 'EMERGENCY: Critical ambulance approaching. Move to the LEFT lane immediately and reduce speed.';
      } else {
        action = 'stop-and-wait';
        instruction = 'EMERGENCY: Critical ambulance approaching. Pull over to the LEFT side and STOP.';
      }
    } else if (emergencyLevel === 'yellow') {
      urgency = 'medium';
      estimatedClearTime = 15;
      if (lanes >= 2) {
        action = 'move-left';
        instruction = 'Ambulance approaching. Please move to the LEFT lane and allow passage.';
      } else {
        action = 'move-left';
        instruction = 'Ambulance approaching. Move to the LEFT side and slow down.';
      }
    } else {
      urgency = 'low';
      estimatedClearTime = 30;
      action = 'maintain-speed';
      instruction = 'Ambulance in area. Drive carefully and be prepared to yield.';
    }

    if (trafficLevel === 'severe' || trafficLevel === 'high') {
      estimatedClearTime *= 1.5;
    }

    return {
      action,
      instruction,
      urgency,
      estimatedClearTime: Math.round(estimatedClearTime)
    };
  }

  /**
   * Generate voice-friendly text
   */
  generateVoiceInstruction(instruction: string): string {
    return instruction
      .replace(/EMERGENCY:/gi, 'Emergency.')
      .replace(/LEFT/g, 'left')
      .replace(/RIGHT/g, 'right')
      .replace(/STOP/g, 'stop')
      .trim();
  }
}
