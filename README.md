# Thinkr — GenAI Chatbot

![Thinkr Logo](frontend/public/Logo.png)

**Thinkr** is an intelligent AI-powered chatbot that combines a large language model with real-time web search to deliver accurate, context-aware answers. It remembers your conversation history within a session, searches the web only when needed, and presents responses with rich formatting including code blocks, bullet lists, and bold text.

---

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Reference](#api-reference)
- [How the Chatbot Works](#how-the-chatbot-works)
- [Docker Deployment](#docker-deployment)
- [UI Overview](#ui-overview)

---

## Features

| Feature | Description |
|---|---|
| 🧠 **LLM-Powered Answers** | Uses Llama 3.1 8B Instant via Groq for fast, accurate responses |
| 🌐 **Real-Time Web Search** | Automatically searches the web via Tavily when real-time data is needed |
| 💬 **Session Memory** | Maintains full conversation history per user session (24-hour expiry) |
| 🔁 **Context Awareness** | Follow-up questions use prior conversation context — no repeated lookups |
| 🖥️ **Rich Formatting** | Responses support Markdown: bold text, inline code, code blocks, and bullet lists |
| 📱 **Responsive UI** | Clean, modern interface that works on desktop and mobile |
| 🐳 **Docker Ready** | Production-ready Docker image included |

---

## Architecture Overview

```
User (Browser)
     │
     │  POST /chat  {message, sessionId}
     ▼
┌─────────────────────────────┐
│      Express Server         │  server.js  — Port 1000
│   (Node.js + Express 5)     │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│       Chatbot Engine        │  chatbot.js
│                             │
│  1. Load session history    │◄──── NodeCache (24h TTL)
│  2. Call Groq LLM           │──────────────────────────► Groq API
│  3. If tool call requested  │                            (Llama 3.1 8B)
│     → Run web search        │──────────────────────────► Tavily API
│  4. Return final response   │
└─────────────────────────────┘
             │
             ▼
     Browser displays
     formatted response
```

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20 (ES Modules)
- **Framework:** Express.js 5
- **LLM:** [Groq SDK](https://console.groq.com) — model `llama-3.1-8b-instant`
- **Web Search:** [Tavily Core API](https://app.tavily.com)
- **Session Cache:** node-cache (in-memory, 24-hour TTL)
- **Config:** dotenv

### Frontend
- **Language:** Vanilla HTML5 / CSS3 / JavaScript
- **Session ID:** UUID v4 (loaded from CDN)
- **HTTP:** Native `fetch()` API

### Infrastructure
- **Containerization:** Docker (node:20-alpine)

---

## Project Structure

```
Thinkr-genai-chatbot/
├── server.js              # Express server — defines /chat endpoint
├── chatbot.js             # AI engine — LLM calls, web search, memory
├── Dockerfile             # Production Docker image
├── package.json           # Dependencies & project metadata
├── package-lock.json      # Locked dependency versions
├── .gitignore
└── frontend/
    ├── index.html         # Application HTML shell
    ├── script.js          # Frontend logic, message rendering, API calls
    ├── styles.css         # Full UI styles (289 lines)
    └── public/
        └── Logo.png       # Application logo
```

---

## Prerequisites

- **Node.js** v20 or higher
- **npm** v9 or higher
- A **Groq API key** — sign up at [console.groq.com](https://console.groq.com)
- A **Tavily API key** — sign up at [app.tavily.com](https://app.tavily.com)

---

## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/ironhulk5226/Thinkr-genai-chatbot.git
cd Thinkr-genai-chatbot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create your environment file

Create a `.env` file in the project root:

```bash
touch .env
```

Add the following content:

```env
GROQ_API_KEY=your_groq_api_key_here
TAVILY_API_KEY=your_tavily_api_key_here
```

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ Yes | API key for the Groq LLM service |
| `TAVILY_API_KEY` | ✅ Yes | API key for Tavily web search |

**Hardcoded defaults** (changeable in source):

| Setting | Value | Location |
|---|---|---|
| Server port | `1000` | `server.js` |
| LLM model | `llama-3.1-8b-instant` | `chatbot.js` |
| LLM temperature | `0` (deterministic) | `chatbot.js` |
| Session TTL | `86400` seconds (24 h) | `chatbot.js` |
| Max tool retries | `5` | `chatbot.js` |
| Backend URL (frontend) | `http://localhost:1000` | `frontend/script.js` |

---

## Running the Application

### Start the backend server

```bash
node server.js
```

The server starts on **http://localhost:1000**.

### Open the frontend

Open `frontend/index.html` directly in your browser, or serve it with a lightweight HTTP server:

```bash
# Using Node.js http-server (install once: npm i -g http-server)
cd frontend
http-server -p 3000
# Then open http://localhost:3000
```

> **Note:** The frontend calls the backend at `http://localhost:1000`. CORS is enabled on the server, so the frontend may be served from any origin.

---

## API Reference

### `GET /`

Health check endpoint.

**Response:**
```
hello world
```

---

### `POST /chat`

Send a message to the chatbot.

**Request body:**

```json
{
  "message": "What is the current price of Bitcoin?",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | string | ✅ | The user's question or message |
| `sessionId` | string | ✅ | Unique identifier for this conversation session |

**Response (success):**

```json
{
  "message": "Bitcoin is currently trading at approximately $...",
  "success": true
}
```

**Response (error):**

```json
{
  "message": "Invalid request",
  "success": false
}
```

---

## How the Chatbot Works

### Step-by-step flow

1. **User types a message** in the frontend and clicks **Ask** (or presses Enter).
2. **Frontend sends a `POST /chat`** request with the message and the session's UUID.
3. **Backend loads conversation history** from the in-memory cache for that session ID (or starts a fresh history with a system prompt).
4. **Groq LLM is called** with the full conversation history and a `webSearch` tool definition.
5. **LLM decides** whether to answer directly or invoke the web search tool:
   - **Direct answer** — uses its own knowledge and/or session context.
   - **Tool call** — returns a `webSearch` function call with a query string.
6. **If a tool call is returned**, the backend:
   - Runs the query through the Tavily API.
   - Appends the search result to the conversation.
   - Calls the LLM again with the new context (up to 5 retries).
7. **Final response** is saved to the session cache and returned to the frontend.
8. **Frontend formats and renders** the response with Markdown support.

### Tool definition

```json
{
  "type": "function",
  "function": {
    "name": "webSearch",
    "description": "Search the web for current or unknown information",
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string" }
      },
      "required": ["query"]
    }
  }
}
```

### System prompt behaviour

The system prompt instructs the model to:
- Answer clearly and directly without unnecessary preamble
- Use conversation history for follow-up questions to avoid redundant searches
- Only call web search for real-time or unknown data
- Include the current date and time in every request so the model knows "today's" date

### Example scenarios

**Knowledge-based question (no web search):**
```
User:      "What is the capital of France?"
Assistant: "Paris."          ← answered from LLM knowledge
```

**Real-time question (web search triggered):**
```
User:      "What is the weather in New York right now?"
→ webSearch("current weather New York")
→ Tavily returns live data
Assistant: "It is currently 72°F and partly cloudy in New York."
```

**Context-aware follow-up:**
```
User:      "What is the latest iPhone model?"
→ webSearch("latest iPhone model 2025")
Assistant: "The latest model is the iPhone 17."

User:      "How much does it cost?"
→ No new search — context reused from previous turn
Assistant: "The iPhone 17 starts at $799."
```

---

## Docker Deployment

### Build the image

```bash
docker build -t Thinkr-chatbot:latest .
```

### Run the container

```bash
docker run -d \
  -p 1000:1000 \
  -e GROQ_API_KEY=your_groq_api_key \
  -e TAVILY_API_KEY=your_tavily_api_key \
  --name Thinkr \
  Thinkr-chatbot:latest
```

The API is now available at **http://localhost:1000**.

> The frontend (`frontend/`) must be served separately (e.g., via nginx or a static hosting service) and configured to point at the running container's address.

### Dockerfile summary

```dockerfile
FROM node:20-alpine          # Minimal base image
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev        # Install production dependencies only
COPY . .
EXPOSE 1000
CMD ["node", "server.js"]
```

---

## UI Overview

The frontend is a single-page application with three sections:

| Section | Description |
|---|---|
| **Header** | Application logo and brand name |
| **Chat Area** | Scrollable message thread; user messages on the right, assistant on the left |
| **Input Composer** | Sticky textarea at the bottom with an **Ask** button |

**Styling highlights:**
- Aurora gradient background with radial teal accents
- Glassmorphism input bar
- Pulsing loading indicator while the backend processes the request
- Dark terminal-style code blocks for code snippets
- Responsive layout — collapses gracefully on mobile screens (breakpoint: 768 px)
- Fonts: **Sora** (body) and **IBM Plex Mono** (code)
