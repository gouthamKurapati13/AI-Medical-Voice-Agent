import { FaTwitter } from "react-icons/fa";
import { FaYoutube } from "react-icons/fa6";
import { RiInstagramFill } from "react-icons/ri";

export const BLUR_FADE_DELAY = 0.15;

export const siteConfig = {
  name: "AI Medical Agent",
  description: "College project - AI-powered medical assistant with voice conversation capabilities",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: ["Medical AI", "Voice Assistant", "Healthcare", "AI Doctor", "Medical Consultation", "College Project"],
  links: {
    email: "support@aimedicalagent.com",
    twitter: "https://twitter.com/aimedicalagent",
    discord: "https://discord.gg/aimedicalagent",
    github: "https://github.com/aimedicalagent/ai-medical-agent",
    instagram: "https://instagram.com/aimedicalagent/",
  },
  header: [
    {
      label: "Home",
      href: "/",
    },
    {
      label: "Features",
      href: "#features",
    },
    {
      trigger: "Resources",
      content: {
        main: {
          title: "Resources",
          description: "Find helpful resources for your healthcare journey",
          href: "#resources",
          icon: null,
        },
        items: [
          {
            title: "Documentation",
            href: "#",
            description: "Learn how to use our platform",
          },
          {
            title: "API Reference",
            href: "#",
            description: "Explore our API endpoints",
          },
          {
            title: "Health Blog",
            href: "#",
            description: "Read our latest medical articles",
          },
        ],
      },
    },
    {
      label: "Contact",
      href: "#contact",
    },
  ],
  faqs: [
    {
      question: "What is AI Medical Agent?",
      answer: (
        <span>
          AI Medical Agent is a college project showcasing an AI-powered medical assistant that provides real-time voice conversations to help answer health questions. It uses advanced speech-to-text and text-to-speech technology to create a natural, conversational experience.
        </span>
      ),
    },
    {
      question: "How does the voice conversation work?",
      answer: (
        <span>
          The voice conversation follows a natural turn-taking flow. When you start a call, the AI introduces itself, then listens for your input. After you speak, it processes your speech, generates a response, and speaks back to you. This back-and-forth continues until you end the call.
        </span>
      ),
    },
    {
      question: "Is my medical information kept private?",
      answer: (
        <span>
          Yes, we take privacy very seriously. All conversations are encrypted and stored securely. We comply with healthcare privacy standards and do not share your medical information with third parties without your consent.
        </span>
      ),
    },
    {
      question: "Can AI Medical Agent replace my actual doctor?",
      answer: (
        <span>
          No, AI Medical Agent is a college project designed to be a helpful resource but is not a replacement for professional medical care. Always consult with a qualified healthcare professional for medical advice, diagnosis, and treatment.
        </span>
      ),
    },
    {
      question: "What browsers and devices are supported?",
      answer: (
        <span>
          AI Medical Agent works best in Chrome and Edge browsers. The voice features require a device with a microphone and speakers. Safari may have limited WebSocket support. Mobile devices are supported but may have varying performance.
        </span>
      ),
    },
  ],
  footer: [
    {
      title: "Product",
      links: [
        { href: "#", text: "Features", icon: null },
        { href: "#", text: "Documentation", icon: null },
        { href: "#", text: "About", icon: null },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "#", text: "About Project", icon: null },
        { href: "#", text: "GitHub", icon: null },
        { href: "#", text: "Contact", icon: null },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "#", text: "Community", icon: null },
        { href: "#", text: "Contact", icon: null },
        { href: "#", text: "Support", icon: null },
        { href: "#", text: "Status", icon: null },
      ],
    },
    {
      title: "Social",
      links: [
        {
          href: "#",
          text: "Twitter",
          icon: <FaTwitter />,
        },
        {
          href: "#",
          text: "Instagram",
          icon: <RiInstagramFill />,
        },
        {
          href: "#",
          text: "Youtube",
          icon: <FaYoutube />,
        },
      ],
    },
  ],
};

export type SiteConfig = typeof siteConfig;
