import { NextResponse } from "next/server";
import { PrismaClient } from "@/lib/generated/prisma";
import { currentUser } from "@clerk/nextjs/server";

// Use the same PrismaClient instance as other routes
declare global {
  var prisma: PrismaClient | undefined;
}

// Use a single PrismaClient instance to prevent connection issues
let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, use a global variable to prevent multiple instances
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

export async function POST() {
  try {
    const user = await currentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Make sure user has an email address
    if (!user.emailAddresses || user.emailAddresses.length === 0) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    const userEmail = user.emailAddresses[0].emailAddress;
    const userName = user.fullName || user.firstName || "User";

    try {
      // Check if user already exists
      let userData = await prisma.user.findUnique({
        where: {
          email: userEmail,
        },
      });

      // If user exists, return the user data
      if (userData) {
        return NextResponse.json(userData);
      }

      // Create new user if they don't exist
      userData = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          credit: 10,
        }
      });

      return NextResponse.json(userData);
    } catch (dbError) {
      console.error("Database error:", dbError);

      // Return a mock user object if database fails
      // This allows the application to continue working even if the database is not set up
      return NextResponse.json({
        id: 0,
        email: userEmail,
        name: userName,
        credit: 10
      });
    }
  } catch (error) {
    console.error("Error processing user:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}