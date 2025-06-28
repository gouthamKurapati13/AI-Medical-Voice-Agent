import { AIDoctorAgents } from "@/shared/list";
import { NextRequest, NextResponse } from "next/server";

// Helper function to find the most appropriate doctor based on symptoms
function findDoctorBySymptoms(symptoms: string) {
  // Define symptom keywords for each specialist
  const specialistKeywords: Record<string, string[]> = {
    "General Physician": ["fever", "cold", "cough", "flu", "headache", "pain", "general", "health", "tired", "fatigue", "weakness"],
    "Pediatrician": ["child", "baby", "infant", "kid", "toddler", "children", "pediatric", "growth", "development"],
    "Dermatologist": ["skin", "rash", "acne", "itch", "dermatitis", "eczema", "mole", "hair", "nail", "allergy"],
    "Psychologist": ["stress", "anxiety", "depression", "mental", "mood", "sleep", "trauma", "emotion", "behavior", "panic", "fear"],
    "Nutritionist": ["diet", "weight", "nutrition", "food", "eating", "appetite", "obesity", "underweight", "meal", "vitamin", "deficiency"],
    "Cardiologist": ["heart", "chest", "pain", "blood pressure", "hypertension", "palpitation", "cardiovascular", "cholesterol"],
    "ENT Specialist": ["ear", "nose", "throat", "hearing", "sinus", "voice", "snoring", "tonsil", "neck", "smell", "taste"],
    "Orthopedic": ["bone", "joint", "muscle", "back", "spine", "knee", "shoulder", "fracture", "sprain", "arthritis", "pain"],
    "Gynecologist": ["menstrual", "period", "pregnancy", "uterus", "ovary", "vaginal", "women", "female", "reproductive", "pelvic"],
    "Dentist": ["tooth", "teeth", "gum", "dental", "mouth", "jaw", "bite", "cavity", "oral", "tongue"]
  };

  // Convert symptoms to lowercase for case-insensitive matching
  const lowercaseSymptoms = symptoms.toLowerCase();

  // Count keyword matches for each specialist
  const matchCounts: Record<string, number> = {};

  Object.entries(specialistKeywords).forEach(([specialist, keywords]) => {
    matchCounts[specialist] = keywords.filter(keyword =>
      lowercaseSymptoms.includes(keyword.toLowerCase())
    ).length;
  });

  // Find the specialist with the most keyword matches
  let bestMatch = "General Physician"; // Default
  let highestCount = 0;

  Object.entries(matchCounts).forEach(([specialist, count]) => {
    if (count > highestCount) {
      highestCount = count;
      bestMatch = specialist;
    }
  });

  // Find the doctor object that matches the best specialist
  const doctor = AIDoctorAgents.find(doc => doc.specialist === bestMatch);

  // Return the doctor or default to first doctor if no match found
  return doctor || AIDoctorAgents[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { notes } = body;

    if (!notes) {
      return NextResponse.json({ error: "Notes are required" }, { status: 400 });
    }

    // If notes are very short (less than 5 characters), return a general physician
    if (notes.trim().length < 5) {
      const defaultDoctor = AIDoctorAgents[0];
      // Ensure image path is valid
      if (!defaultDoctor.image.startsWith("http")) {
        defaultDoctor.image = defaultDoctor.image || "/doctor1.png";
      }
      return NextResponse.json(defaultDoctor);
    }

    // Use our local matching algorithm
    const matchedDoctor = findDoctorBySymptoms(notes);

    // Ensure image path is valid
    if (matchedDoctor && !matchedDoctor.image.startsWith("http")) {
      matchedDoctor.image = matchedDoctor.image || "/doctor1.png";
    }

    return NextResponse.json(matchedDoctor);
  } catch (error) {
    console.error("Request processing error:", error);
    // Return the first doctor as a fallback in case of any error
    const defaultDoctor = AIDoctorAgents[0];
    if (defaultDoctor.image && !defaultDoctor.image.startsWith("http")) {
      defaultDoctor.image = defaultDoctor.image || "/doctor1.png";
    }
    return NextResponse.json(defaultDoctor);
  }
}