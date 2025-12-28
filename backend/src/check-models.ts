// src/check-models.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function check() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  console.log("Checking available models...");
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    // We try to list models using the generic client
    // Note: The specific method to list models varies by SDK version, 
    // but requesting a specific model usually validates access.
    
    console.log("Attempting to connect with key...");
    // @ts-ignore
    const result = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await result.json();
    
    if (data.models) {
        console.log("\n✅ SUCCESS! Your API Key works. Here are your valid model names:");
        console.log("---------------------------------------------------------------");
        data.models.forEach((m: any) => {
            if (m.supportedGenerationMethods.includes("generateContent")) {
                console.log(`Model: ${m.name.replace("models/", "")}`);
            }
        });
        console.log("---------------------------------------------------------------");
        console.log("👉 Update your .env file with one of the names above.");
    } else {
        console.error("❌ API Error:", data);
    }

  } catch (error) {
    console.error("Connection Failed:", error);
  }
}

check();