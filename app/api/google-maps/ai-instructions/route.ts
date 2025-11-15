import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/services/aiService';

// Check for different AI provider configurations
const groqKey = process.env.GROQ_API_KEY || '';
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

    // Determine which AI provider to use
    let aiConfig = {};
    if (groqKey) {
      aiConfig = { provider: 'groq', apiKey: groqKey, model: 'llama3-8b-8192' };
    } else if (geminiKey) {
      aiConfig = { provider: 'gemini', apiKey: geminiKey };
    } else {
      // No AI provider, will use fallback rule-based system
      aiConfig = { provider: 'ollama' };
    }

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
        aiProvider: aiConfig.provider || 'fallback'
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
