import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: NextRequest) {
  try {
    const { text, voiceId, doctorId } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Use Murf AI API for TTS
    const murfApiKey = process.env.MURF_API_KEY;

    if (!murfApiKey) {
      console.error("Murf API key is not configured");

      // Return a simple success response that the client will handle with browser TTS
      return NextResponse.json({
        success: false,
        useBrowserTTS: true,
        text: text
      });
    }

    try {
      // Direct mapping from doctor ID to Murf AI voice
      // This ensures each doctor has a unique voice regardless of the voiceId in the list
      const doctorIdToVoiceMapping: Record<number, string> = {
        1: "en-US-marcus", // General Physician - Male
        2: "en-US-arnold", // Pediatrician - Male
        3: "en-US-terrell", // Dermatologist - Male
        4: "en-US-natalie", // Psychologist - Female
        5: "en-US-sarah", // Nutritionist - Female
        6: "en-US-eliza", // Cardiologist - Female
        7: "en-US-grace", // ENT Specialist - Female
        8: "en-US-ken", // Orthopedic - Male
        9: "en-US-amara", // Gynecologist - Female
        10: "en-US-james" // Dentist - Male
      };

      // Map the voice ID directly to Murf AI voice ID
      // This allows us to use the voice IDs from list.tsx directly
      const voiceIdMapping: Record<string, string> = {
        "marcus": "en-US-marcus",
        "arnold": "en-US-arnold",
        "terrell": "en-US-terrell",
        "natalie": "en-US-natalie",
        "sarah": "en-US-sarah",
        "eliza": "en-US-eliza",
        "grace": "en-US-grace",
        "ken": "en-US-ken",
        "amara": "en-US-amara",
        "james": "en-US-james"
      };

      // Get the Murf voice ID directly from doctor ID if available
      let murfVoiceId = "en-US-natalie"; // Default female voice

      if (doctorId && doctorIdToVoiceMapping[doctorId]) {
        // Use direct mapping from doctor ID
        murfVoiceId = doctorIdToVoiceMapping[doctorId];
        console.log(`Using voice mapping for doctorId ${doctorId}: ${murfVoiceId}`);
      } else if (voiceId && voiceIdMapping[voiceId]) {
        // Use direct mapping from voice ID
        murfVoiceId = voiceIdMapping[voiceId];
        console.log(`Using voice mapping for voiceId ${voiceId}: ${murfVoiceId}`);
      }

      console.log(`Using Murf AI voice: ${murfVoiceId} for doctorId: ${doctorId || 'unknown'}`);

      // Call Murf AI API with correct parameters
      const response = await axios.post(
        "https://api.murf.ai/v1/speech/generate-with-key",
        {
          voice: murfVoiceId,
          text: text,
          format: "mp3",
          speed: 1.0,
          pitch: 0,
          sampleRate: 44100
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-API-KEY": murfApiKey
          },
          timeout: 15000 // 15 second timeout
        }
      );

      // Check if we have a valid audio URL in the response
      if (response.data && response.data.success && response.data.data && response.data.data.url) {
        // Fetch the audio file from the URL
        const audioResponse = await axios.get(response.data.data.url, {
          responseType: 'arraybuffer',
          timeout: 10000 // 10 second timeout
        });

        // Return the audio data as binary
        return new NextResponse(audioResponse.data, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Disposition": "attachment; filename=speech.mp3"
          }
        });
      } else {
        console.error("Invalid Murf API response:", response.data);
        // Return a response that will trigger browser TTS
        return NextResponse.json({
          success: false,
          useBrowserTTS: true,
          text: text
        });
      }
    } catch (murfError) {
      console.error("Error with Murf API:", murfError);

      // Return a response that will trigger browser TTS
      return NextResponse.json({
        success: false,
        useBrowserTTS: true,
        text: text
      });
    }
  } catch (error) {
    console.error("Error in TTS API:", error);
    return NextResponse.json({ error: "Failed to generate speech" }, { status: 500 });
  }
} 