import Groq from 'groq-sdk';

// Initialize Groq client (free alternative to OpenAI)
let groq: Groq | null = null;

function getGroqClient() {
  if (!groq && process.env.GROQ_API_KEY) {
    groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groq;
}

/**
 * Generate AI-powered voice instruction for emergency alert
 * @param context Context data (distance, direction, etc.)
 * @returns Instruction text
 */
export async function generateVoiceInstruction(context: {
  distance: number;
  direction?: string;
  vehicleType?: string;
}): Promise<string> {
  const client = getGroqClient();

  // Fallback to rule-based if Groq not configured
  if (!client) {
    return generateRuleBasedInstruction(context);
  }

  try {
    const response = await client.chat.completions.create({
      model: 'llama-3.1-8b-instant', // Fast and free Groq model
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates brief, clear emergency vehicle alert instructions for drivers. Keep instructions under 20 words, calm and actionable.',
        },
        {
          role: 'user',
          content: `Generate a brief alert instruction for a driver. An ${context.vehicleType || 'ambulance'} is ${Math.round(context.distance)}m away${context.direction ? ` to the ${context.direction}` : ''}. Tell them what to do.`,
        },
      ],
      max_tokens: 50,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || generateRuleBasedInstruction(context);
  } catch (error) {
    console.error('Error generating AI instruction:', error);
    return generateRuleBasedInstruction(context);
  }
}

/**
 * Rule-based instruction generator (fallback)
 * @param context Context data
 * @returns Instruction text
 */
export function generateRuleBasedInstruction(context: {
  distance: number;
  direction?: string;
  vehicleType?: string;
}): string {
  const distance = Math.round(context.distance);
  const vehicle = context.vehicleType || 'ambulance';

  const instructions = [
    `Emergency ${vehicle} approaching ${distance} meters away. Slow down and move to the side.`,
    `${vehicle.toUpperCase()} ALERT! ${distance}m away. Clear the lane immediately.`,
    `Emergency vehicle ${distance} meters ahead. Keep left and reduce speed.`,
    `URGENT: ${vehicle} approaching. Create free passage lane.`,
    `Emergency response vehicle nearby. Do not panic, move safely to the side.`,
  ];

  // Select instruction based on distance
  if (distance < 100) {
    return 'EMERGENCY VEHICLE VERY CLOSE! Clear lane immediately!';
  } else if (distance < 200) {
    return instructions[1];
  } else if (distance < 350) {
    return instructions[2];
  } else {
    return instructions[0];
  }
}

/**
 * Text-to-speech using browser API
 * @param text Text to speak
 * @param lang Language code (default 'en-IN')
 */
export function speakInstruction(text: string, lang: string = 'en-IN') {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('Speech synthesis not supported');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = 1.1; // Slightly faster for urgency
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  window.speechSynthesis.speak(utterance);
}

/**
 * Generate different instruction variations
 */
export const INSTRUCTION_TEMPLATES = [
  'Ambulance approaching, slow down and keep left.',
  'Do not panic or stop suddenly. Move to the side safely.',
  'Create a free lane for emergency response vehicle.',
  'Emergency vehicle ahead. Reduce speed and give way.',
  'Life-saving ambulance nearby. Clear the path immediately.',
  'Medical emergency in progress. Allow ambulance to pass.',
];

/**
 * Get random instruction template
 */
export function getRandomInstruction(): string {
  return INSTRUCTION_TEMPLATES[Math.floor(Math.random() * INSTRUCTION_TEMPLATES.length)];
}
