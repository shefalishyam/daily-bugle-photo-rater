# Daily Bugle Photo Rater

A hackathon-ready MVP that lets a user upload a JPEG/PNG photo, receives an AI critique in the style of J. Jonah Jameson, and turns the result into a Daily Bugle-inspired comic card.

## Features

- Drag-and-drop JPEG/PNG upload with preview
- OpenAI image analysis through a server-side API
- J. Jonah Jameson-inspired editorial voice
- Exactly three criteria: Lighting, Focus, Framing
- Structured JSON response
- Daily Bugle newspaper/comic UI
- Canvas-based comic/pop-art transformation
- Downloadable comic image
- Server-side API key handling
- 8 MB upload limit
- Rate limiting
- Helmet security headers
- Sharp image normalization
- `/api/health` endpoint

## Requirements

- Node.js 18+
- An OpenAI API key

## Run locally

```bash
npm install
```

Copy `.env.example` to `.env` and add your key:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.5
PORT=3000
```

Then:

```bash
npm run dev
```

Open:

http://localhost:3000

## Important

Never put your real OpenAI API key in `public/app.js` or any other frontend file. The browser sends the image to `/api/analyze`, and only the server communicates with OpenAI.

## GitHub

Do not commit `.env`. It is already included in `.gitignore`.

```bash
git init
git add .
git config user.name "YOUR_NAME"
git config user.email "EMAIL_TO_USE_FOR_THE_COMMIT"
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
