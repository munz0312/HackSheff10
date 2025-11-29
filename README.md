# Voyage AI Outfitter

An AI-powered retail application that generates custom shop inventories for fictional voyages using Google Gemini AI.

## 🚀 Features

- **Voyage Selection**: Choose from multiple voyage archetypes (Space, Pirate, Jungle, Cyberpunk, Steampunk, Post-Apocalyptic)
- **Mission Description**: Describe your specific mission or adventure
- **AI-Generated Inventory**: Get 3-5 unique survival items tailored to your voyage and mission
- **Image Generation**: Each item includes AI-generated visualizations
- **Arm64 Optimized**: Built specifically for AWS Graviton/Arm64 architecture

## 🏗️ Tech Stack

### Frontend
- **Next.js 14+** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Python 3.11+** with FastAPI
- **Google Generative AI** (Gemini) for content generation
- **UVicorn** for ASGI server

### Infrastructure
- **Docker** with Arm64 optimization
- **Docker Compose** for orchestration

## 🛠️ Prerequisites

- Docker and Docker Compose
- Google Gemini API Key (optional for full AI functionality)
- Arm64/AWS Graviton architecture (for optimal performance)

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd HackSheff10
```

### 2. Configure Environment

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env

# Edit the files and add your Gemini API Key
# Get your key from: https://makersuite.google.com/app/apikey
```

### 3. Build and Run (Arm64 Optimized)

```bash
# For Arm64 architecture (recommended for AWS Graviton)
docker buildx build --platform linux/arm64 -t voyage-ai-backend ./backend

# Start the application
docker-compose up --build
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🏴‍☠️ Voyage Types

1. **Space Exploration** - Journey through the cosmos
2. **Pirate Adventure** - Sail the high seas
3. **Jungle Expedition** - Navigate dense jungles
4. **Cyberpunk Mission** - Hack the system
5. **Steampunk Quest** - Victorian mechanical marvels
6. **Wasteland Survival** - Post-apocalyptic adventures

## 📡 API Endpoints

### Health Check
```http
GET /
```
Returns server status and architecture information.

### Architecture Info
```http
GET /architecture
```
Returns detailed system architecture information.

### Generate Inventory
```http
POST /generate-inventory
Content-Type: application/json

{
  "voyage_type": "space",
  "mission_description": "We are going to Mars to rescue a lost rover..."
}
```

## 🔧 Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## 🐳 Docker Architecture

### Backend Dockerfile Features:
- **Base Image**: `python:3.11-slim` for minimal footprint
- **Arm64 Optimization**: Built specifically for Arm64/AWS Graviton
- **Security**: Non-root user execution
- **Health Checks**: Automated health monitoring
- **Architecture Display**: Prints system info on startup for demo purposes

### Frontend Dockerfile Features:
- **Base Image**: `node:18-slim` for optimal performance
- **Multi-stage Build**: Optimized production builds
- **Arm64 Ready**: Compatible with Arm64 architecture
- **Health Monitoring**: Built-in health checks

## 📊 Architecture Display

The application prominently displays the server architecture to demonstrate Arm64 compatibility:

- **Header Badge**: Shows current architecture (e.g., "aarch64")
- **Footer Info**: Detailed system information
- **Backend Prints**: Console output showing architecture on startup

## 🤖 AI Integration

### Google Gemini Integration:
- **Text Generation**: Creates contextual survival items
- **Image Generation**: Generates item visualizations (placeholder for demo)
- **Fallback System**: Works even without API keys using predefined items

### Item Categories:
- **Tools**: Essential equipment for the voyage
- **Safety**: Protective and survival gear
- **Navigation**: Location and guidance devices
- **Communication**: Information transmission tools
- **Medical**: Health and treatment supplies

## 🛡️ Security Features

- **CORS Configuration**: Proper cross-origin resource sharing
- **Input Validation**: Pydantic models for data validation
- **Non-root Execution**: Containers run as non-privileged users
- **Health Checks**: Automated monitoring and recovery

## 📱 Responsive Design

- **Mobile First**: Optimized for all device sizes
- **Progressive Enhancement**: Works on all browsers
- **Loading States**: Smooth user experience during AI generation
- **Error Handling**: Graceful fallbacks and user feedback

## 🎯 Hackathon Demo Tips

1. **Architecture Demo**: Show the Arm64 optimization in the header/footer
2. **Multiple Voyage Types**: Demonstrate different AI-generated inventories
3. **Mission Variety**: Test with creative mission descriptions
4. **Fallback Mode**: Works even without Gemini API key

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is part of the HackSheff10 hackathon.

## 🙏 Acknowledgments

- **Google Gemini**: For AI content generation
- **Next.js Team**: For the excellent React framework
- **FastAPI Team**: For the modern Python web framework
- **Tailwind CSS**: For the utility-first CSS framework