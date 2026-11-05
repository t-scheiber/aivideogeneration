# AI Video Generation Tool

A comprehensive Next.js application for generating high-quality AI videos for web project hero sections and other creative needs. Built because I needed a reliable tool to create AI videos for different web projects, so I created my own multi-provider solution.

## 🎯 Why I Built This

I was working on multiple web projects and needed AI-generated videos for hero sections, but existing tools were too expensive, too limited or unreliable. So I built my own. It talks to three provider APIs and covers ten current video models, and the interface only shows the options the chosen model supports.

- **Flexibility**: Pick the provider and model that fit the project and budget
- **Cost control**: See an estimate in dollars or credits before you generate
- **No guesswork**: Durations, aspect ratios, resolutions and audio follow each model's real limits
- **Easy to extend**: Models live in one catalog file (`lib/video-providers.ts`)

## ✨ Features

### 🎬 **Providers and models**

| Provider | Models | Key variable |
|----------|--------|--------------|
| **Google Veo 3.1 via [veo3gen.app](https://www.imaginary.app/docs)** (default) | Veo 3.1 Fast, Veo 3.1 Quality, Veo 3.1 Lite | `VEO3_API_KEY` |
| **[Runway API](https://docs.dev.runwayml.com/guides/models/)** | Gen-4.5, Veo 3.1, Veo 3.1 Fast, Kling 4, Seedance 2.5, Wan 3 | `RUNWAYML_API_SECRET` |
| **[Luma Agents API](https://docs.agents.lumalabs.ai/guides/videos/generation)** | Ray 3.2 | `LUMA_AGENTS_API_KEY` |

> **OpenAI Sora was removed.** OpenAI shut down the Sora 2 models and the Videos API on September 24, 2026. Veo 3.1 (through veo3gen or Runway) covers the same text-to-video and image-to-video jobs.

### 🧠 **Adaptive interface**

- **Model picker**: Choose a provider, then one of its models
- **Valid options only**: Switching models resets any duration, aspect ratio or resolution the new model does not accept
- **Server-side checks**: The API route validates every request against the same catalog before calling a provider
- **Cost estimate**: Runway models show dollars per second; veo3gen and Luma show credits per clip
- **Key status**: Providers with neither your own key nor a server key are marked and cannot be submitted
- **Bring your own key**: Guests paste their own provider keys, which stay in their browser (see [Guest mode](#guest-mode-bring-your-own-key))

### 🎯 **Generation options**

- **Aspect ratios**: 16:9 and 9:16 everywhere; 1:1 on Kling 4, Seedance 2.5 and Wan 3; 4:3, 3:4 and 21:9 on Ray 3.2
- **Durations**: 8s on veo3gen, 4/6/8s for Veo on Runway, 2–10s on Gen-4.5, up to 30s on Kling 4, Seedance 2.5 and Wan 3, 5s or 10s on Ray 3.2
- **Resolution**: 360p to 1080p, plus 4K on Veo 3.1 Fast and Quality through veo3gen
- **Native audio**: Veo 3.1, Seedance 2.5 and Wan 3
- **Image-to-video**: Upload a start frame (JPEG, PNG or WebP, up to 5 MB)
- **Negative prompts**: Veo 3.1 models
- **Variations**: Up to 4 per run, each one a separate billed generation

## 🚀 Quick Start

1. **Prerequisites:**
   - **Bun 1.4+** installed ([get Bun](https://bun.sh))
   - Google OAuth credentials (for authentication)

2. **Install dependencies:**

   ```bash
   bun install
   ```

3. **Set up environment variables:**

   ```bash
   cp env.example .env.local
   ```

   Add your configuration:

   ```bash
   # Authentication (Better Auth)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   AUTH_SECRET=your-random-secret-key
   BETTER_AUTH_SECRET=your-random-secret-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # Video generation API keys (set the ones you use)
   VEO3_API_KEY=veo_your-key            # veo3gen.app: Veo 3.1 Fast, Quality, Lite
   RUNWAYML_API_SECRET=your-key         # Runway API: Gen-4.5, Veo 3.1, Kling 4, Seedance 2.5, Wan 3
   LUMA_AGENTS_API_KEY=your-key         # Luma Agents API: Ray 3.2
   ```

4. **Run the development server:**

   ```bash
   bun run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) and sign in with Google

## 💰 Models, limits and pricing

Prices as listed by each provider in November 2026. Runway lists "from" prices; higher resolutions and audio can cost more.

| Model | Provider | Durations | Max resolution | Audio | Price |
|-------|----------|-----------|----------------|-------|-------|
| Veo 3.1 Lite | veo3gen | 8s | 1080p | ✅ | 2–5 credits/clip |
| Veo 3.1 Fast | veo3gen | 8s | 4K | ✅ | 6–22 credits/clip |
| Veo 3.1 Quality | veo3gen | 8s | 4K | ✅ | 13–38 credits/clip |
| Gen-4.5 | Runway | 2–10s | 720p | ❌ | $0.12/s |
| Veo 3.1 | Runway | 4, 6, 8s | 1080p | ✅ | from $0.20/s |
| Veo 3.1 Fast | Runway | 4, 6, 8s | 1080p | ✅ | from $0.10/s |
| Kling 4 | Runway | 3–30s | 1080p | ❌ | from $0.157/s |
| Seedance 2.5 | Runway | 5–30s | 1080p | ✅ | from $0.20/s |
| Wan 3 | Runway | 2–30s | 1080p | ✅ | from $0.05/s |
| Ray 3.2 | Luma | 5s, 10s | 1080p | ❌ | 20–1200 credits/clip |

Ray 3.2 cannot start a 10s clip from an image. Runway and Luma video links expire after about an hour, so download the clips you want to keep.

## 🎬 Perfect for Web Projects

This tool is specifically designed for web developers and designers who need:

- **Hero section videos** for landing pages
- **Background videos** for websites
- **Product demos** and showcases
- **Social media content** for marketing
- **Prototype videos** for client presentations

### 🧠 **Why the Smart UI Matters**

Unlike other tools that show all options regardless of what actually works, this app:

- **Prevents Frustration**: No more trying features that don't work with your chosen provider
- **Saves Time**: No need to research each provider's limitations
- **Reduces Errors**: Invalid combinations are automatically prevented
- **Improves Results**: You only see options that will actually work
- **Saves Money**: Accurate cost estimation prevents unexpected charges

## 🏗️ Project Structure

```text
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts   # Better Auth API handler
│   │   ├── generate-video/route.ts   # Validates and runs a generation
│   │   └── providers/route.ts        # Reports which server keys the caller may use
│   ├── auth/
│   │   ├── signin/page.tsx          # Sign-in page
│   │   └── error/page.tsx           # Auth error page
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page
├── components/
│   ├── ApiKeysPanel.tsx             # Saves and removes your own provider keys
│   └── VideoGenerator.tsx           # Main video generation component
├── lib/
│   ├── auth.ts                      # Better Auth configuration
│   ├── auth-client.ts               # Client-side auth utilities
│   ├── auth-server.ts              # Server-side auth utilities
│   ├── browser-keys.ts              # Your provider keys in localStorage
│   ├── byok.ts                      # Key header name and format check
│   ├── video-providers.ts           # Provider and model catalog
│   └── video-provider-service.ts    # Provider API calls and polling
├── proxy.ts                         # Next.js middleware for route protection
├── next.config.mjs                  # Next.js configuration
├── tailwind.config.cjs              # Tailwind CSS configuration
└── tsconfig.json                    # TypeScript configuration
```

## 🎯 How to Use

### **Smart Provider Selection**

1. **Choose your provider** - The UI automatically adapts to show only supported features
2. **See real-time cost estimation** - Get accurate pricing based on your selections
3. **Understand limitations** - UI clearly shows what each provider can and cannot do

### **Intelligent Video Generation**

1. **Enter a descriptive prompt** for your video
2. **Add negative prompts** (if supported by your provider)
3. **Select aspect ratio and duration** - Only supported options are shown
4. **Upload reference images** (if supported by your provider)
5. **Choose resolution and audio** (if the model supports them)
6. **Pick how many variations** to generate
7. **Download and use** in your web projects

### **🎨 Smart UI Features**

- **Dynamic Controls**: Options appear/disappear based on provider capabilities
- **Auto-Validation**: Invalid selections are automatically corrected
- **Capability Indicators**: Clear visual cues about what each provider supports
- **Cost Transparency**: Real-time cost updates as you change settings

## 🛠️ Technologies Used

- **Next.js 16** - React framework with App Router and Turbopack
- **React 19** - Modern UI components with hooks
- **TypeScript** - Full type safety across all providers
- **Tailwind CSS 4** - Responsive, modern styling
- **Bun 1.4** - Package manager and runtime
- **Better Auth** - Modern authentication with Google OAuth
- **SQLite** - Lightweight database for Better Auth sessions
- **Model catalog** - One file describes every provider and model; UI and API both read it
- **Capability-Based UI** - Dynamic controls that adapt to provider limitations
- **Real-time Cost Estimation** - Accurate pricing based on actual API costs
- **Smart Validation** - Automatic value adjustment when switching providers

## 📈 Use Cases

- **Landing Page Heroes**: Create stunning background videos
- **Product Showcases**: Demonstrate features with AI-generated content
- **Marketing Campaigns**: Generate social media content at scale
- **Client Presentations**: Create professional demo videos
- **Prototype Development**: Visualize concepts before production

## 🔐 Authentication

This app uses **Better Auth** with Google OAuth for secure authentication:

- **Sign in**: Click "Sign in with Google" on the home page
- **Session management**: Automatic session handling with secure cookies
- **Route protection**: Signed-in generations need an allowlisted account (`ALLOWED_EMAILS`); everyone else needs their own key
- **Database**: SQLite database (`.better-auth.db`) stores user sessions
- **Code quality**: ESLint enforces code quality and formatting

### Guest mode (bring your own key)

Visitors who are not signed in can still use the studio with their own veo3gen, Runway or Luma key. I added this so people can try the app without me paying for their clips.

- Keys are saved in the browser's localStorage under `aivideo.providerKeys.v1`. The **Your API keys** panel saves, replaces and forgets them.
- When you click Generate, the browser sends only the selected provider's key, in the `x-provider-api-key` header. The server uses it for that one generation and does not store or log it.
- The providers block calls from browsers, so the request has to go through this server. Only serve the app over HTTPS.
- Guests never get the server's keys. Signed-in members fall back to a server key when they have not saved their own, and their own key wins when they have.
- Anyone with access to the browser profile, or script running on the page, can read saved keys. Set a spending limit with each provider.
- Set `GUEST_MODE=off` to turn guest mode off and require sign-in again.

## 🤝 Contributing

This project was built to solve a real need for AI video generation in web development. We welcome contributions!

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment variables (copy `env.example` to `.env.local` and fill in your keys)
4. Run development server: `bun run dev`
5. Sign in with Google OAuth to start generating videos

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means

- ✅ **Free to use** for personal and commercial projects
- ✅ **Free to modify** and distribute
- ✅ **Free to sell** products based on this code
- ✅ **Attribution appreciated** but not required
- ✅ **No warranty** - use at your own risk

> **Note**: Users are responsible for complying with their chosen AI providers' terms of service when using the APIs.

## 🌟 Star this Repository

If you find this project helpful, please give it a star! It helps others discover the project and shows your support for open-source AI video generation tools.
