import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/aiService';

const geminiKey = process.env.GEMINI_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ambulanceLocation,
      ambulanceDirection,
      emergencyLevel,
      trafficLevel,
      nearbyVehicles,
      roadType,
      lanes
    } = body;

    if (!emergencyLevel) {
      return NextResponse.json(
        { error: 'Emergency level is required' },
        { status: 400 }
      );
    }

    // Prefer Gemini when configured, else local provider with rule-based fallback.
    const aiConfig = geminiKey
      ? { provider: 'gemini', apiKey: geminiKey }
      : { provider: 'ollama' };

    const aiService = new AIService(aiConfig as any);
    const instructions = await aiService.analyzeTrafficAndProvideInstructions({
      ambulanceLocation,
      ambulanceDirection,
      emergencyLevel,
      trafficLevel,
      nearbyVehicles,
      roadType,
      lanes
    });

    // Generate voice-friendly version
    const voiceInstruction = aiService.generateVoiceInstruction(instructions.instruction);

    return NextResponse.json({
      success: true,
      data: {
        ...instructions,
        voiceInstruction,
        aiProvider: aiConfig.provider
      }
    });
  } catch (error: any) {
    console.error('AI instructions API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate instructions' },
      { status: 500 }
    );
  }
}
