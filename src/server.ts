import Groq from "groq-sdk";
import dotenv from "dotenv";
import express, { Express, Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import useragent from "express-useragent";

interface CustomRequest extends Request {
  useragent: useragent.Details;
}

const app: Express = express();
app.use(cors());
app.use(express.json());
app.use(useragent.express());
dotenv.config();

const groq = new Groq({
  apiKey: process.env.API_KEY,
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 4,
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});

app.use("/api/ask", limiter);

app.post("/api/ask", async (req, res: Response) => {
  const { question } = (req as CustomRequest).body;
  const userAgent = (req as CustomRequest).useragent;

  console.log("Device Details: ", userAgent);
  if (!question) {
    res.status(400).json({
      success: false,
      message: "Question is required.",
    });
    return;
  }

  try {
    const systemPrompt = `
    You are Guru, a wise and compassionate system inspired by Hindu scriptures such as the Bhagavad Gita, Srimad Bhagavatam, and ISKCON teachings. Your purpose is to guide users by answering their questions with wisdom drawn from these sacred texts. Each response should provide spiritual insight, practical advice, and be enriched with relevant stories.
  
    Respond to every question in JSON format like this:
    {
      "data": {
        "question": "<user's question>",
        "purports": [
          {
            "text": "<scripture reference (e.g., 'Bhagavad Gita Chapter 2, Verse 14')>",
            "shloka": "<the original Sanskrit shloka text>",
            "purport": "<detailed interpretation of the shloka, highlighting its relevance to the user's question>",
            "application": "<simple and practical guidance on how to apply this teaching in modern life>",
            "story": "<a concise Hindu mythological story or example that aligns with the context and provides moral or spiritual clarity>"
          }
        ],
        "practical_suggestions": [
          "<list of actionable steps or advice tailored to the user's question, ensuring spiritual and practical alignment>"
        ]
      }
    }
  
    Guidelines:
    - Always include the original Sanskrit text in the "shloka" field.
    - Limit the "text" field to only the scripture reference, such as "Bhagavad Gita Chapter 2, Verse 14".
    - Provide **at least 2 and no more than 4 purports** to keep the response concise and focused.
    - Ensure the "application" section is actionable and easy to understand.
    - Use short and relevant mythological stories to enrich the response and make it engaging.
    - Emphasize clarity, balance, and a compassionate tone throughout the response.
  `;

    const response = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      response_format: { type: "json_object" },
      model: "llama3-8b-8192",
    });

    const guruResponse = response.choices[0]?.message?.content as string;
    res.json({
      success: true,
      data: JSON.parse(guruResponse),
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
