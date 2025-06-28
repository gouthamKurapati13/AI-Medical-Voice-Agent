"use client"
import { useEffect, useRef, useState } from 'react';

// Define a type for window with webkitAudioContext
interface WindowWithWebkitAudioContext extends Window {
  webkitAudioContext: typeof AudioContext;
}

interface AudioProcessorProps {
  isCallActive: boolean;
  isListening: boolean;
  onTranscriptReceived: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
}

const AudioProcessor = ({
  isCallActive,
  isListening,
  onTranscriptReceived,
  onError
}: AudioProcessorProps) => {
  // References for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);
  const assemblySocketRef = useRef<WebSocket | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const [isAssemblyConnected, setIsAssemblyConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  // Initialize audio context and microphone access
  useEffect(() => {
    if (isCallActive && !audioContextRef.current) {
      initializeAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [isCallActive]);

  // Connect to AssemblyAI when call is active
  useEffect(() => {
    if (isCallActive && !assemblySocketRef.current) {
      connectToAssemblyAI();
    }
  }, [isCallActive]);

  // Control audio processing based on listening state
  useEffect(() => {
    if (isCallActive) {
      if (isListening) {
        startAudioProcessing();
      } else {
        stopAudioProcessing();
      }
    }
  }, [isCallActive, isListening]);

  // Reconnect to AssemblyAI if connection is lost
  useEffect(() => {
    if (isCallActive && !isAssemblyConnected && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      reconnectTimeoutRef.current = setTimeout(() => {
        connectToAssemblyAI();
        reconnectAttemptsRef.current++;
      }, 2000);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isCallActive, isAssemblyConnected]);

  const initializeAudio = async () => {
    try {
      // Initialize audio context
      const AudioContextClass = window.AudioContext ||
        ((window as unknown as WindowWithWebkitAudioContext).webkitAudioContext);
      audioContextRef.current = new AudioContextClass();

      // Get microphone access with best quality settings
      microphoneStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 44100
        }
      });

    } catch {
      onError("Could not access microphone. Please check permissions.");
    }
  };

  const connectToAssemblyAI = async () => {
    const token = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY;

    if (!token) {
      onError("AssemblyAI API key is missing. Please check your environment variables.");
      return;
    }

    try {
      // Close existing connection if any
      if (assemblySocketRef.current) {
        assemblySocketRef.current.close();
        assemblySocketRef.current = null;
      }

      // Create WebSocket connection to AssemblyAI
      assemblySocketRef.current = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000`);

      assemblySocketRef.current.onopen = () => {
        setIsAssemblyConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection

        // Send authentication message
        if (assemblySocketRef.current) {
          assemblySocketRef.current.send(JSON.stringify({
            token: token,
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
          }));
        }
      };

      assemblySocketRef.current.onmessage = (message) => {
        const data = JSON.parse(message.data);

        if (data.message_type === 'FinalTranscript') {
          onTranscriptReceived(data.text, true);
        } else if (data.message_type === 'PartialTranscript') {
          if (data.text && data.text.trim() !== "") {
            onTranscriptReceived(data.text, false);
          }
        } else if (data.message_type === 'SessionBegins') {
        } else if (data.message_type === 'Error') {
          onError(`Speech recognition error: ${data.error || 'Unknown error'}`);
        }
      };

      assemblySocketRef.current.onerror = () => setIsAssemblyConnected(false);

      assemblySocketRef.current.onclose = () => {
        setIsAssemblyConnected(false);
      };
    } catch {
      onError("Failed to connect to speech recognition service.");
      setIsAssemblyConnected(false);
    }
  };

  const startAudioProcessing = () => {
    if (!isCallActive || !isAssemblyConnected) {
      return;
    }

    // Connect microphone to AssemblyAI if not already connected
    if (microphoneStreamRef.current && audioContextRef.current && assemblySocketRef.current?.readyState === WebSocket.OPEN) {
      try {
        // Resume audio context if it's suspended (browser requirement)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        // Only create a new source and processor if we don't already have one
        if (!audioSourceRef.current) {
          audioSourceRef.current = audioContextRef.current.createMediaStreamSource(microphoneStreamRef.current);
        }

        if (!processorNodeRef.current) {
          // Use a larger buffer size for better performance
          processorNodeRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

          processorNodeRef.current.onaudioprocess = (e) => {
            if (assemblySocketRef.current?.readyState === WebSocket.OPEN && isListening) {
              const inputData = e.inputBuffer.getChannelData(0);
              const downsampledBuffer = downsampleBuffer(inputData, 44100, 16000);
              const pcmData = convertFloat32ToInt16(downsampledBuffer);
              assemblySocketRef.current.send(pcmData);
            }
          };
        }

        // Connect the nodes to start audio processing
        audioSourceRef.current.connect(processorNodeRef.current);
        processorNodeRef.current.connect(audioContextRef.current.destination);

      } catch {
        onError("Failed to start audio processing. Please try again.");
      }
    } else {
      if (!assemblySocketRef.current || assemblySocketRef.current.readyState !== WebSocket.OPEN) {
        // Try reconnecting
        connectToAssemblyAI();
      }
    }
  };

  const stopAudioProcessing = () => {
    // Disconnect audio processing nodes but keep the connection open
    if (processorNodeRef.current && audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect(processorNodeRef.current);
        processorNodeRef.current.disconnect();
      } catch {
      }
    }
  };

  const cleanupAudio = () => {
    // Clear any reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close AssemblyAI WebSocket
    if (assemblySocketRef.current) {
      assemblySocketRef.current.close();
      assemblySocketRef.current = null;
      setIsAssemblyConnected(false);
    }

    // Stop microphone stream
    if (microphoneStreamRef.current) {
      microphoneStreamRef.current.getTracks().forEach(track => track.stop());
      microphoneStreamRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Cleanup processor node
    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch {
      }
      processorNodeRef.current = null;
    }

    // Cleanup audio source
    if (audioSourceRef.current) {
      try {
        audioSourceRef.current.disconnect();
      } catch {
      }
      audioSourceRef.current = null;
    }

    // Reset reconnect attempts
    reconnectAttemptsRef.current = 0;
  };

  // Helper function to downsample audio buffer
  const downsampleBuffer = (buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array => {
    if (outSampleRate === sampleRate) {
      return buffer;
    }

    const sampleRateRatio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);

    let offsetResult = 0;
    let offsetBuffer = 0;

    while (offsetResult < result.length) {
      const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
      let accum = 0, count = 0;

      for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
        accum += buffer[i];
        count++;
      }

      result[offsetResult] = accum / count;
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
    }

    return result;
  };

  // Helper function to convert Float32Array to Int16Array
  const convertFloat32ToInt16 = (buffer: Float32Array): Int16Array => {
    const length = buffer.length;
    const buf = new Int16Array(length);

    for (let i = 0; i < length; i++) {
      buf[i] = Math.min(1, buffer[i]) * 0x7FFF;
    }

    return buf;
  };

  return null; // This is a non-visual component
};

export default AudioProcessor; 