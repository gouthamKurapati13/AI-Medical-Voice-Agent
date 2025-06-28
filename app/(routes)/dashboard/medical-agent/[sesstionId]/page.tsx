"use client"
import dynamic from 'next/dynamic'

// Use dynamic import with no SSR to ensure components that use browser APIs
// are only loaded on the client side
const MedicalVoiceAgent = dynamic(
  () => import('./MedicalVoiceAgent'),
  { ssr: false }
)

export default function MedicalAgentPage() {
  return <MedicalVoiceAgent />
}
