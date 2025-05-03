import { OpenAI } from "openai";
import Arcade from "@arcadeai/arcadejs";

const ARCADE_API_KEY = process.env.ARCADE_API_KEY; // Your Arcade API key from the previous step
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL; // The email address where you want to send the email
const USER_ID = process.env.YOUR_EMAIL; // Your email address
const TOOL_NAME = "Google.SendEmail";
 
// Instantiate the OpenAI client pointing to Arcade's endpoint
const client = new Arcade();

export const sendEmail = async (body: string) => {
  // Start the authorization process
  const authResponse = await client.tools.authorize({
    tool_name: TOOL_NAME,
    user_id: USER_ID,
  });

  if (authResponse.status !== "completed") {
    console.log(`Click this link to authorize: ${authResponse.url}`);
  }

  await client.auth.waitForCompletion(authResponse);

  const toolInput = {
    subject: "News Digest Today",
    body: body,
    recipient: RECIPIENT_EMAIL
  };
  
  const response = await client.tools.execute({
    tool_name: TOOL_NAME,
    input: toolInput,
    user_id: USER_ID,
  });
  
  console.log(response);
}
