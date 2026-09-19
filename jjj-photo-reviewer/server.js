import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import sharp from "sharp";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const port = Number(process.env.PORT || 3000);
const modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";

if (!process.env.GEMINI_API_KEY) {
  console.warn("WARNING: GEMINI_API_KEY is not set.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.static("public"));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again in a minute."
  }
});

app.use("/api/analyze", limiter);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "daily-bugle-photo-rater"
  });
});

const schema = {
  type: "object",
  properties: {
    headline: {
      type: "string"
    },
    overall_score: {
      type: "integer"
    },
    verdict: {
      type: "string"
    },
    lighting: {
      type: "object",
      properties: {
        score: {
          type: "integer"
        },
        comment: {
          type: "string"
        }
      },
      required: ["score", "comment"]
    },
    focus: {
      type: "object",
      properties: {
        score: {
          type: "integer"
        },
        comment: {
          type: "string"
        }
      },
      required: ["score", "comment"]
    },
    framing: {
      type: "object",
      properties: {
        score: {
          type: "integer"
        },
        comment: {
          type: "string"
        }
      },
      required: ["score", "comment"]
    },
    jameson_quote: {
      type: "string"
    }
  },
  required: [
    "headline",
    "overall_score",
    "verdict",
    "lighting",
    "focus",
    "framing",
    "jameson_quote"
  ]
};

app.post("/api/analyze", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server."
      });
    }

    const { image } = req.body;

    if (
      typeof image !== "string" ||
      !image.startsWith("data:image/")
    ) {
      return res.status(400).json({
        error: "Please provide an image as a data URL."
      });
    }

    const match = image.match(
      /^data:image\/(jpeg|jpg|png);base64,(.+)$/i
    );

    if (!match) {
      return res.status(400).json({
        error: "Only JPEG and PNG images are supported."
      });
    }

    const inputBuffer = Buffer.from(match[2], "base64");

    if (inputBuffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({
        error: "Image is larger than the 8 MB limit."
      });
    }

    const normalized = await sharp(inputBuffer)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({ quality: 88 })
      .toBuffer();

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7
      }
    });

    const prompt = `
You are J. Jonah Jameson reviewing a submitted photograph for the Daily Bugle.

Analyze the image using EXACTLY these three criteria and no additional criteria:

1. Lighting
2. Focus
3. Framing

Give useful, specific feedback based only on what can be seen.

Be energetic and newspaper-editorial in tone, inspired by a dramatic newspaper editor.

Do not use slurs, threats, or abusive language.

Scores must be integers from 0 to 100.

The overall score should reflect the three criteria.

Keep comments concise enough for a web card.

Return ONLY valid JSON matching the requested structure.
`;

    const result = await model.generateContent([
      {
        text: prompt
      },
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: normalized.toString("base64")
        }
      }
    ]);

    const responseText = result.response.text();

    const resultData = JSON.parse(responseText);

    res.json(resultData);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not analyze the image.",
      details:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined
    });
  }
});

app.listen(port, () => {
  console.log(
    `Daily Bugle Photo Rater running at http://localhost:${port}`
  );
});