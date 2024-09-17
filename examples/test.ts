import { TunerkitClient, HeliconeLogger } from '../src/index';
import OpenAI from 'openai';

// Initialize OpenAI client
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Helicone logger (optional)
// const heliconeLogger = new HeliconeLogger('your-helicone-api-key', 'https://api.hconeai.com');

// Initialize TunerkitClient
const tunerkitClient = new TunerkitClient({
  client: openai,
  tunerkitApiKey: 'your-tunerkit-api-key', // Replace with your actual Tunerkit API key
//   logger: heliconeLogger, // Optional: remove if not using Helicone
  baseURL: 'http://localhost:3000'
});

// Example function using the tool decorator
class AITools {
//   @tunerkitClient.tool({ dev: true })
  static async generateText(prompt: string): Promise<string> {
    const response = await tunerkitClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0].message.content || '';
  }
}

// Main function to run tests
async function runTests() {
  console.log("Starting Tunerkit tests...");

  // Test 1: Basic session and API call
  try {
    const headers = tunerkitClient.startSession({
      inputs: { test: "Basic API call" },
      datasetId: '574b8574-d399-43db-8ace-f4333c447c36',
    //   type: 'test'
    });

    const response = await tunerkitClient.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Hello, how are you?" }],
    });

    console.log("Test 1 - Basic API call response:", response.choices[0].message.content);

    tunerkitClient.endSession({ outputs: response.choices[0].message.content, headers });
  } catch (error) {
    console.error("Test 1 failed:", error);
  }

//   // Test 2: Using the tool decorator
//   try {
//     const headers = tunerkitClient.startSession({
//       inputs: { test: "Test" },
//       datasetId: '574b8574-d399-43db-8ace-f4333c447c36',
//       type: 'test'
//     });

//     const generatedText = await AITools.generateText("Write a haiku about coding.");
//     console.log("Test 2 - Generated haiku:", generatedText);

//     tunerkitClient.endSession({ outputs: { generatedText }, headers });
//   } catch (error) {
//     console.error("Test 2 failed:", error);
//   }

  console.log("Tunerkit tests completed.");
}

// Run the tests
runTests().catch(console.error);
