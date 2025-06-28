"use client"
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import axios from 'axios';

interface TextToSpeechProps {
  text: string;
  voiceId?: string;
  doctorId?: number;
  onSpeakingStart: () => void;
  onSpeakingEnd: () => void;
  onError: (error: string) => void;
}

export interface TextToSpeechRef {
  stopSpeaking: () => void;
}

const TextToSpeech = forwardRef<TextToSpeechRef, TextToSpeechProps>(({
  text,
  voiceId = 'will',
  doctorId,
  onSpeakingStart,
  onSpeakingEnd,
  onError
}, ref) => {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const [pendingText, setPendingText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const previousTextRef = useRef<string>("");
  const speechSynthesisUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Expose the stopSpeaking method to the parent component
  useImperativeHandle(ref, () => ({
    stopSpeaking: () => {
      stopSpeaking();
    }
  }));

  // Initialize audio element
  useEffect(() => {
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio();

      // Set up event listeners
      audioElementRef.current.addEventListener('ended', handleAudioEnded);
      audioElementRef.current.addEventListener('error', handleAudioError);
    }

    return () => {
      stopSpeaking();

      if (audioElementRef.current) {
        audioElementRef.current.removeEventListener('ended', handleAudioEnded);
        audioElementRef.current.removeEventListener('error', handleAudioError);
        audioElementRef.current = null;
      }
    };
  }, []);

  // Process new text when it changes
  useEffect(() => {
    if (text && text.trim() !== '' && text !== previousTextRef.current) {
      previousTextRef.current = text;

      if (isProcessing) {
        // Queue the text for later
        setPendingText(text);
      } else {
        processText(text);
      }
    }
  }, [text]);

  // Process pending text when processing finishes
  useEffect(() => {
    if (!isProcessing && pendingText) {
      const textToProcess = pendingText;
      setPendingText("");
      processText(textToProcess);
    }
  }, [isProcessing, pendingText]);

  const handleAudioEnded = () => {
    setIsProcessing(false);
    onSpeakingEnd();
  };

  const handleAudioError = () => {
    setIsProcessing(false);
    onSpeakingEnd();
  };

  // Stop any ongoing speech
  const stopSpeaking = () => {

    // Stop audio element playback
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }

    // Cancel browser speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Cancel current utterance
    if (speechSynthesisUtteranceRef.current) {
      speechSynthesisUtteranceRef.current = null;
    }

    // Reset state
    setIsProcessing(false);
    setPendingText("");
  };

  const processText = async (textToSpeak: string) => {
    if (!textToSpeak || textToSpeak.trim() === '') return;

    // Stop any ongoing speech first
    stopSpeaking();

    setIsProcessing(true);
    onSpeakingStart();

    try {
      // Call API to get Murf AI TTS audio
      const response = await axios.post('/api/tts', {
        text: textToSpeak,
        voiceId: voiceId,
        doctorId: doctorId
      }, {
        responseType: 'blob',
        validateStatus: function (status) {
          return status < 500; // Accept all responses with status code < 500
        }
      });

      // Check if we got a binary response or a JSON response
      const contentType = response.headers['content-type'];

      if (contentType && contentType.includes('audio')) {
        // We got binary audio data
        const audioUrl = URL.createObjectURL(response.data);

        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;

          try {
            await audioElementRef.current.play();
            // The ended event will trigger onSpeakingEnd and setIsProcessing(false)
          } catch { 
            setIsProcessing(false);
            onSpeakingEnd();

            // Use browser's built-in TTS as fallback
            await playBrowserTTS(textToSpeak);
          }
        }
      } else {
        // We got a JSON response - likely a fallback request for browser TTS
        try {
          // Convert the blob to JSON
          const jsonResponse = JSON.parse(await response.data.text());

          if (jsonResponse.useBrowserTTS) {
            await playBrowserTTS(jsonResponse.text || textToSpeak);
          } else {
            throw new Error("Invalid TTS response");
          }
        } catch {
          await playBrowserTTS(textToSpeak);
        }
      }
    } catch {
      setIsProcessing(false);
      onError("Failed to generate speech. Using browser TTS instead.");

      // Fallback to browser's built-in TTS
      await playBrowserTTS(textToSpeak);
    }
  };

  // Fallback to browser's built-in TTS
  const playBrowserTTS = (textToSpeak: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(textToSpeak);
          speechSynthesisUtteranceRef.current = utterance;

          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          utterance.onend = () => {
            setIsProcessing(false);
            onSpeakingEnd();
            resolve();
          };

          utterance.onerror = () => {
            setIsProcessing(false);
            onSpeakingEnd();
            resolve();
          };

          window.speechSynthesis.speak(utterance);
        } else {
          setIsProcessing(false);
          onSpeakingEnd();
          resolve();
        }
      } catch {
        setIsProcessing(false);
        onSpeakingEnd();
        resolve();
      }
    });
  };

  return null; // This is a non-visual component
});

TextToSpeech.displayName = 'TextToSpeech';

export default TextToSpeech; 