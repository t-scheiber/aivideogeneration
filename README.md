# AI Video Generation Tool

A comprehensive Next.js application for generating high-quality AI videos for web project hero sections and other creative needs. Built because I needed a reliable tool to create AI videos for different web projects, so I created my own multi-provider solution.

## 🎯 Why I Built This

I was working on multiple web projects and needed high-quality AI-generated videos for hero sections, but existing solutions were either too expensive, limited, or unreliable. So I built my own tool that supports **4 different AI video generation providers** with a **smart, adaptive interface** that gives me:

- **Flexibility**: Choose the best provider for each project's needs and budget
- **Cost Control**: Compare real-time pricing and use the most cost-effective option
- **No Confusion**: UI automatically shows only the features each provider actually supports
- **Future-Proof**: Easy to add new providers as they become available
- **Professional Results**: Access to the latest models from Google, OpenAI, RunwayML, and more

## ✨ Features

### 🎬 **4 AI Video Providers**
Choose from the best video generation services with **smart capability-based UI**:

- **VEO3 API** - Advanced features with audio generation ($0.08/sec) - **Primary Provider**
- **RunwayML Gen-4** - Professional quality with camera controls ($0.05/sec)
- **Luma Dream Machine** - Character consistency & realistic physics ($0.02/sec)
- **OpenAI Sora** - Exceptional quality for complex scenes ($0.10/sec)

> **Note**: Pika Labs 2.2 is temporarily disabled while awaiting API access approval.

### 🧠 **Smart Adaptive Interface**
- **Dynamic Controls**: UI automatically shows/hides options based on provider capabilities
- **Auto-Validation**: Values adjust automatically when switching providers
- **Capability-Aware**: Only shows supported features (aspect ratios, durations, etc.)
- **Real-time Cost Estimation**: Accurate pricing based on actual provider limits

### 🎯 **Advanced Video Generation**
- **Multiple Aspect Ratios**: 16:9, 9:16, 1:1, 4:3, 21:9 support (provider-dependent)
- **Image-to-Video**: Upload reference images for better results
- **Negative Prompts**: Specify what you don't want in your videos
- **Batch Generation**: Create multiple video variations (where supported)
- **Resolution Control**: 720p, 1080p, 4K options (provider-dependent)
- **Frame Rate Control**: 24, 30, 60 FPS options (provider-dependent)
- **Smart Duration Selection**: Dropdown for fixed durations, input for flexible ones

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp env.example .env.local
   ```
   
   Add your API keys for the providers you want to use:
   ```bash
   # Choose your providers (you don't need all of them)
   VEO3_API_KEY=veo_your-veo3-api-key-here      # For VEO3 (Primary Provider)
   RUNWAYML_API_KEY=your-runwayml-api-key-here  # For RunwayML Gen-4
   LUMA_API_KEY=your-luma-api-key-here           # For Luma Dream Machine
   OPENAI_API_KEY=your-openai-api-key-here      # For OpenAI Sora
   
   # Pika Labs 2.2 is temporarily disabled (awaiting API access)
   # PIKA_API_KEY=your-pika-api-key-here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 💰 Cost Comparison & Capabilities

| Provider | Cost/Second | Best For | Free Tier | Key Features |
|----------|-------------|----------|-----------|--------------|
| **Luma Dream Machine** | $0.02 | Fast generation | 30s/month | Character consistency, realistic physics |
| **RunwayML Gen-4** | $0.05 | Professional quality | 125s/month | Camera controls, keyframe controls, style consistency |
| **VEO3 API** | $0.08 | Advanced features | 20s/month | Audio generation, enhanced prompts, 720p/1080p |
| **OpenAI Sora** | $0.10 | Complex scenes | 10s/month | Exceptional quality, realistic physics, long-form content |

> **Note**: Pika Labs 2.2 ($0.03/sec) is temporarily disabled while awaiting API access approval.

### 🎯 **Provider Capabilities Matrix**

| Feature | VEO3 | RunwayML | Luma | Sora |
|---------|------|----------|------|------|
| **Multiple Videos** | ❌ | ✅ (4) | ❌ | ✅ (4) |
| **Image-to-Video** | ✅ | ✅ | ✅ | ✅ |
| **Negative Prompts** | ✅ | ✅ | ✅ | ✅ |
| **Resolution Options** | ✅ | ✅ | ✅ | ✅ |
| **FPS Control** | ❌ | ✅ | ❌ | ✅ |
| **Audio Generation** | ✅ | ❌ | ❌ | ❌ |
| **Max Duration** | 8s | 18s | 5s | 60s |
| **Aspect Ratios** | 16:9 only | 16:9, 9:16, 1:1 | 16:9, 9:16, 1:1 | All ratios |

> **Note**: Pika Labs 2.2 is temporarily disabled while awaiting API access approval.

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

```
├── app/
│   ├── api/generate-video/route.ts  # Multi-provider API endpoint
│   ├── globals.css                  # Global styles
│   ├── layout.tsx                   # Root layout
│   └── page.tsx                     # Home page
├── components/
│   └── VideoGenerator.tsx           # Main video generation component
├── lib/
│   ├── video-providers.ts           # Provider configurations
│   └── video-provider-service.ts    # Provider service logic
├── next.config.js                   # Next.js configuration
├── tailwind.config.js               # Tailwind CSS configuration
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
5. **Choose resolution and FPS** (if supported by your provider)
6. **Generate multiple variations** (if supported by your provider)
7. **Download and use** in your web projects

### **🎨 Smart UI Features**
- **Dynamic Controls**: Options appear/disappear based on provider capabilities
- **Auto-Validation**: Invalid selections are automatically corrected
- **Capability Indicators**: Clear visual cues about what each provider supports
- **Cost Transparency**: Real-time cost updates as you change settings

## 🛠️ Technologies Used

- **Next.js 15.5.4** - React framework with App Router
- **React 19** - Modern UI components with hooks
- **TypeScript** - Full type safety across all providers
- **Tailwind CSS** - Responsive, modern styling
- **Multi-Provider Architecture** - Unified interface for 4 different AI video APIs
- **Capability-Based UI** - Dynamic controls that adapt to provider limitations
- **Real-time Cost Estimation** - Accurate pricing based on actual API costs
- **Smart Validation** - Automatic value adjustment when switching providers
- **Modern Authentication** - NextAuth.js with Google OAuth

## 📈 Use Cases

- **Landing Page Heroes**: Create stunning background videos
- **Product Showcases**: Demonstrate features with AI-generated content
- **Marketing Campaigns**: Generate social media content at scale
- **Client Presentations**: Create professional demo videos
- **Prototype Development**: Visualize concepts before production

## 🤝 Contributing

This project was built to solve a real need for AI video generation in web development. We welcome contributions!

### How to Contribute:
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Setup:
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see SETUP.md)
4. Run development server: `npm run dev`

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:
- ✅ **Free to use** for personal and commercial projects
- ✅ **Free to modify** and distribute
- ✅ **Free to sell** products based on this code
- ✅ **Attribution appreciated** but not required
- ✅ **No warranty** - use at your own risk

> **Note**: Users are responsible for complying with their chosen AI providers' terms of service when using the APIs.

## 🌟 Star this Repository

If you find this project helpful, please give it a star! It helps others discover the project and shows your support for open-source AI video generation tools.