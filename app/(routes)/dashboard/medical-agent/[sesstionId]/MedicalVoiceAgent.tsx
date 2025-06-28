"use client"
import axios from 'axios'
import { useParams } from 'next/navigation'
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Circle, PhoneCall, StopCircle } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Doctor } from '../../_components/DoctorsList'
import AudioProcessor from '../components/AudioProcessor'
import TextToSpeech, { TextToSpeechRef } from '../components/TextToSpeech'
import ConversationDisplay from '../components/ConversationDisplay'
import ConversationManager, { Message, ConversationManagerRef } from '../components/ConversationManager'
import VoiceRecordButton from '../components/VoiceRecordButton'
import TranscriptionLoading from '../components/TranscriptionLoading'
import { convertAudioToText } from '../services/speechToText'

type Session = {
  id: number
  notes: string
  sessionId: string
  report: Record<string, unknown>
  selectedDocter: Doctor | null
  createdOn: string
}

function MedicalVoiceAgent() {
  const { sesstionId } = useParams()

  // Session and doctor state
  const [session, setSession] = useState<Session>()
  const [doctorImage, setDoctorImage] = useState<string | null>(null)
  const [doctorSpecialist, setDoctorSpecialist] = useState<string>("")
  const [doctorPrompt, setDoctorPrompt] = useState<string>("")
  const [doctorId, setDoctorId] = useState<number | undefined>(undefined)

  // Call state
  const [isCallActive, setIsCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Conversation state
  const [messages, setMessages] = useState<Message[]>([])
  const [userCaption, setUserCaption] = useState<string>("")
  const [assistantCaption, setAssistantCaption] = useState<string>("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentAssistantText, setCurrentAssistantText] = useState<string>("")

  // Timer reference
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Conversation manager reference
  const conversationManagerRef = useRef<ConversationManagerRef>(null)

  // Add a state for transcription loading
  const [isTranscribing, setIsTranscribing] = useState(false)

  // Add audioElementRef
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  // Add a ref for the TextToSpeech component
  const textToSpeechRef = useRef<TextToSpeechRef>(null);

  // Load session details
  useEffect(() => {
    if (sesstionId) {
      getSessionDetails()
    }

    return () => {
      stopCall()
    }
  }, [sesstionId])

  // Timer for call duration
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isCallActive])

  const getSessionDetails = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await axios.get(`/api/session-chat?sessionId=${sesstionId}`)
      setSession(response.data)

      // Handle the doctor data from selectedDocter field (note the spelling in the DB)
      if (response.data?.selectedDocter) {
        const doctorData = response.data.selectedDocter
        setDoctorImage(doctorData.image || null)
        setDoctorSpecialist(doctorData.specialist || "AI Medical Agent")
        setDoctorPrompt(doctorData.agentPrompt || "")
        setDoctorId(doctorData.id)
      }

      setIsLoading(false)
    } catch (error: unknown) {
      console.error("Error fetching session details:", error)
      setError("Failed to load session details. Using default settings.")
      setIsLoading(false)

      // Set default values so the app can still function
      setDoctorSpecialist("AI Medical Agent")
      setDoctorImage("/doctor1.png")
      setDoctorId(1)
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Start the voice call
  const startCall = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setIsCallActive(true)

      // We'll start listening automatically after the AI's initial greeting is spoken
      // This is handled by the handleSpeakingEnd callback

      setIsLoading(false)
    } catch (error: unknown) {
      console.error("Error starting call:", error)
      setError("Could not start call. Please try again.")
      setIsLoading(false)
    }
  }

  // Stop the voice call
  const stopCall = () => {
    console.log("Stopping call and resetting all components...")

    // Stop any ongoing speech
    if (textToSpeechRef.current) {
      textToSpeechRef.current.stopSpeaking();
    }

    // Stop any ongoing audio playback
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.src = ''
    }

    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Reset state
    setIsCallActive(false)
    setIsListening(false)
    setIsSpeaking(false)
    setIsTranscribing(false)
    setUserCaption("")
    setAssistantCaption("")
    setCurrentAssistantText("")
    setCallDuration(0)

    // Clear messages
    setMessages([])

    console.log("Call stopped and all components reset")
  }

  // Handle transcript from AudioProcessor
  const handleTranscript = useCallback((transcript: string, isFinal: boolean) => {
    setUserCaption(transcript);

    if (conversationManagerRef.current) {
      conversationManagerRef.current.handleTranscript(transcript, isFinal);
    }
  }, []);

  // Handle new message from ConversationManager
  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      // Check if message already exists to prevent duplicates
      const exists = prev.some(m =>
        m.role === message.role &&
        m.content === message.content &&
        Math.abs(m.timestamp - message.timestamp) < 1000
      );

      if (exists) return prev;
      return [...prev, message];
    });

    if (message.role === 'assistant') {
      setAssistantCaption(message.content);
      setCurrentAssistantText(message.content);
    }
  }, []);

  // Handle speaking start/end
  const handleSpeakingStart = useCallback(() => {
    setIsSpeaking(true);
    setIsListening(false);
  }, []);

  const handleSpeakingEnd = useCallback(() => {
    setIsSpeaking(false);
    // Start listening after AI finishes speaking
    setTimeout(() => {
      setIsListening(true);
    }, 500);
  }, []);

  // Handle errors
  const handleError = useCallback((errorMessage: string) => {
    console.error(errorMessage);
    setError(errorMessage);
  }, []);

  // Update the handleRecordingComplete function
  const handleRecordingComplete = async (audioBlob: Blob) => {
    try {
      setIsTranscribing(true)
      setError(null)

      console.log("Processing recorded audio...")

      // Use our service to convert audio to text
      const transcript = await convertAudioToText(audioBlob)

      console.log("Transcription result:", transcript)

      // Update user caption
      setUserCaption(transcript)

      // Send to conversation manager
      if (conversationManagerRef.current) {
        conversationManagerRef.current.handleTranscript(transcript, true)
      }
    } catch (error: unknown) {
      console.error("Error processing recording:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setError(`Recording error: ${errorMessage}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  return (
    <div className='p-5 border-2 rounded-xl bg-secondary'>
      <div className='flex items-center justify-between'>
        <h2 className='p-1 px-2 border rounded-md flex items-center gap-2'>
          {isCallActive ? (
            <>
              <Circle className="text-green-500 animate-pulse" /> Connected
            </>
          ) : (
            <>
              <Circle /> Not Connected
            </>
          )}
        </h2>
        <h2 className='text-xl font-bold text-gray-500'>{formatTime(callDuration)}</h2>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4 mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      <div className='flex flex-col items-center gap-2 mt-10 justify-center'>
        {doctorImage ? (
          <Image
            src={doctorImage}
            alt={doctorSpecialist || "AI Doctor"}
            width={120}
            height={120}
            className='w-[100px] h-[100px] object-cover rounded-full'
          />
        ) : (
          <div className='w-[100px] h-[100px] bg-gray-200 rounded-full flex items-center justify-center'>
            <span className='text-gray-400'>No Image</span>
          </div>
        )}
        <div className='flex flex-col items-center justify-center'>
          <h2 className='text-lg font-bold mt-2'>{doctorSpecialist}</h2>
          <p className='text-sm text-gray-500'>AI Medical Agent</p>

          {/* Conversation Display */}
          <ConversationDisplay
            messages={messages}
            userCaption={userCaption}
            assistantCaption={assistantCaption}
            isCallActive={isCallActive}
            isListening={isListening}
            isSpeaking={isSpeaking}
          />

          {!isCallActive ? (
            <Button
              className='mt-6 flex items-center justify-center'
              onClick={startCall}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : (
                <>
                  <PhoneCall className='w-4 h-4 mr-2' /> Start Call
                </>
              )}
            </Button>
          ) : (
            <Button
              className='mt-6 flex items-center justify-center bg-red-500 hover:bg-red-600'
              onClick={stopCall}
              disabled={isLoading}
            >
              <StopCircle className='w-4 h-4 mr-2' /> End Call
            </Button>
          )}
        </div>
      </div>

      {/* Non-visual components */}
      {isCallActive && (
        <>
          <AudioProcessor
            isCallActive={isCallActive}
            isListening={isListening}
            onTranscriptReceived={handleTranscript}
            onError={handleError}
          />

          <TextToSpeech
            ref={textToSpeechRef}
            text={currentAssistantText}
            voiceId={session?.selectedDocter?.voiceId}
            doctorId={doctorId}
            onSpeakingStart={handleSpeakingStart}
            onSpeakingEnd={handleSpeakingEnd}
            onError={handleError}
          />

          <ConversationManager
            ref={conversationManagerRef}
            isCallActive={isCallActive}
            doctorPrompt={doctorPrompt}
            onNewMessage={handleNewMessage}
            onError={handleError}
          />

          <div className="mt-4 flex justify-center">
            <VoiceRecordButton
              isCallActive={isCallActive}
              onRecordingComplete={handleRecordingComplete}
            />
          </div>

          <TranscriptionLoading isLoading={isTranscribing} />
        </>
      )}
    </div>
  )
}

export default MedicalVoiceAgent 