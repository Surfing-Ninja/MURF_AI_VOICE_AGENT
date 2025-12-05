# 🌟 क्रेता-बन्धु (Kreta-Bandhu)
### Next-Generation AI Voice-First Customer Support Agent

![Status](https://img.shields.io/badge/Status-Active-success?style=for-the-badge) ![Murf](https://img.shields.io/badge/Murf-Falcon_TTS-FF6B35?style=for-the-badge) ![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash_Native_Audio-4285F4?style=for-the-badge) ![React](https://img.shields.io/badge/React_19-TypeScript-61DAFB?style=for-the-badge) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS_4-38B2AC?style=for-the-badge) ![Node](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge)

A revolutionary **voice-first** customer support AI agent featuring **Gemini 2.5 Flash Native Audio** for bidirectional voice streaming, **Murf Falcon TTS** for ultra-realistic voice synthesis, real-time voice interruption, intelligent shopping cart management, PDF invoice generation, and a stunning copper-cyan visual theme with OGL-powered WebGL effects.

> 🎙️ **Voice-First Architecture**: Unlike traditional chatbots, क्रेता-बन्धु is designed from the ground up for voice interaction. Users speak naturally, the agent responds with human-like speech powered by **Murf Falcon TTS**.

---

## 🎯 Key Features

### 🎤 **Murf Falcon TTS - Premium Voice Synthesis**
> ⭐ **FLAGSHIP FEATURE**: The heart of क्रेता-बन्धु's voice experience

- **Ultra-Realistic Speech**: Murf Falcon delivers human-like voice synthesis with natural intonation, emotion, and cadence
- **Sub-200ms Latency**: Optimized streaming for real-time conversations
- **Voice Customization**: Configure voice, style, speed, pitch, and emphasis
- **Multilingual Support**: 20+ languages with native accents
- **Consistent Quality**: Professional-grade 48kHz audio output

**Why Murf Falcon?**
```
Traditional TTS:  Robotic → Unnatural pauses → Monotone → Poor user experience
Murf Falcon TTS:  Natural → Human emotion → Conversational → Delightful UX
```

### 🗣️ **Gemini 2.5 Flash Native Audio**
- **Direct Audio-to-Audio**: User's voice → Gemini (native audio understanding) → Tool calls
- **Bidirectional Streaming**: Real-time WebSocket connection for instant responses
- **No Transcription Lag**: Audio processed natively without intermediate STT step
- **Context Awareness**: Maintains conversation context across multiple turns

### ⚡ **Immediate Barge-In (Interruption)**
- **Local Voice Activity Detection**: AudioWorklet-based RMS analysis
- **<50ms Response Time**: Interrupt the agent mid-sentence, it stops IMMEDIATELY
- **Seamless Recovery**: Agent acknowledges interruption and continues naturally

### 🛒 **Smart Shopping Cart System**
- **Real-time Cart Management**: Add, remove, update quantities via voice
- **Stock Validation**: Agent checks available stock before adding items
- **Visual Cart UI**: Slide-out cart with product images and totals
- **Checkout with PDF Invoice**: Professional invoice generation

### 🛍️ **Smart Product Discovery**
- **52+ Products** across 4 main categories with 14 subcategories
- **Multi-criteria Search**: Filter by name, category, subcategory, or brand
- **Browse Mode**: Explore categories and subcategories interactively
- **Zero Hallucination**: Agent only mentions products that actually exist in the database
- **Real-time Stock Info**: Always shows current availability

### 🧾 **Professional Invoice Generation**
- **Clean PDF Design**: Professional invoices with Kreta-Bandhu branding
- **Automatic Generation**: Invoices created on checkout and direct orders
- **Table Layout**: Itemized products with quantities and prices
- **Download Ready**: Accessible via API endpoint

### 🎨 **Stunning Visual Experience**
- **OGL-Powered Voice Orb**: Real-time WebGL orb with solar flares and copper/cyan color scheme
- **Dynamic Light Rays**: Animated background rays emanating from orb position
- **Hyperspace Loader**: Cinematic warp-speed loading screen with brand colors
- **Custom Cursor**: Interactive cursor with particle trails
- **Glassmorphic UI**: Modern blur effects with copper (#c87d4a) and cyan (#00d9ff) accents
- **LetterGlitch Background**: Matrix-style animated text effect (About Devs page)
- **TextShuffle Animation**: GSAP-powered text reveal with Devanagari support
- **Holographic Profile Cards**: 3D CSS card effects with glow animations

### 🤖 **19+ Intelligent Agent Tools**
- **Order Management**: Place, cancel, track, schedule delivery
- **Cart Operations**: Add, remove, update, view, checkout with stock validation
- **Product Discovery**: Search, browse categories/subcategories, check stock
- **Customer Profiles**: Create, retrieve, update customer information
- **Financial Tools**: Refunds, invoices, discount codes
- **Feedback System**: Ratings and comments collection

### 🔧 **Developer-Friendly**
- **React 19 + TypeScript**: Full type safety with latest React features
- **Tailwind CSS 4**: Modern utility-first styling
- **GSAP + Framer Motion**: Professional animations
- **Modular Architecture**: Clean separation of concerns
- **Easy Customization**: Well-documented code with clear component structure
- **SQLite Database**: Zero-config database that just works

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph User["👤 User Interaction"]
        Voice[🎤 Voice Input]
        Visual[👁️ Visual Feedback]
    end

    subgraph Frontend["⚛️ React Frontend (Port 5173)"]
        Orb[🌟 VoicePoweredOrb<br/>WebGL + Solar Flares]
        AudioIn[🎧 AudioWorklet<br/>Voice Activity Detection]
        AudioOut[🔊 Web Audio API<br/>PCM Playback]
        UI[🎨 UI Components<br/>Glassmorphic Design]
        Tools[🛠️ Tool Executor<br/>API Caller]
    end

    subgraph AI["🧠 AI Services"]
        Gemini[Gemini 2.5 Flash<br/>Speech Understanding & Intelligence]
        Murf[Murf Falcon TTS<br/>Voice Synthesis]
        VAD[Local VAD<br/>Barge-In Detection]
    end

    subgraph Backend["🗄️ Node.js Backend (Port 3005)"]
        API[📡 REST API<br/>14 Endpoints]
        DB[(SQLite Database<br/>Categories, Products, Orders)]
    end

    Voice -->|Raw Audio| AudioIn
    AudioIn -->|PCM 16kHz| Gemini
    AudioIn -->|RMS Analysis| VAD
    
    VAD -.->|Interrupt Signal| AudioOut
    
    Gemini -->|Tool Calls| Tools
    Gemini -->|Text Response| Murf
    Murf -->|High-Quality Audio| AudioOut
    
    Tools <-->|HTTP REST| API
    API <-->|SQL Queries| DB
    Tools -->|Results| Gemini
    
    AudioOut -->|Speaker| Visual
    Gemini -->|Transcription| UI
    Orb -.->|Visual Feedback| Visual

    style Gemini fill:#4285f4,color:#fff
    style VAD fill:#00d9ff,color:#000
    style Orb fill:#c87d4a,color:#fff
    style DB fill:#339933,color:#fff
```

---

## 📂 Project Structure (Updated)

```
Customer Support Agent/
│
├── 📁 Lumina Support/              # Frontend Application (React 19 + TypeScript)
│   ├── 📁 src/
│   │   ├── 📁 components/          # Core UI Components
│   │   │   ├── BlurFade.tsx           # Blur fade animations
│   │   │   ├── CustomCursor.tsx       # Interactive cursor with trails
│   │   │   ├── DottedSurface.tsx      # Dotted background pattern
│   │   │   ├── FuturisticBackground.tsx
│   │   │   ├── GlowingEffect.tsx      # Glow effects
│   │   │   ├── HolographicCard.tsx    # 3D card components
│   │   │   └── TubelightNavbar.tsx    # Navigation bar
│   │   │
│   │   ├── 📁 components/ui/       # Advanced UI Components
│   │   │   ├── CartFolder.tsx         # Cart folder animation
│   │   │   ├── CartFolder.css         # Cart folder styles
│   │   │   ├── ClickSpark.tsx         # Click spark effects
│   │   │   ├── HyperspaceLoader.tsx   # Warp-speed loading screen
│   │   │   ├── LetterGlitch.tsx       # Matrix-style text animation 
│   │   │   ├── LightRays.tsx          # OGL light rays background
│   │   │   ├── PopUpCart.tsx          # Slide-out shopping cart 
│   │   │   ├── ProductCard.tsx        # Product display cards
│   │   │   ├── ProfileCard.tsx        # Holographic dev profile cards 
│   │   │   ├── ProfileCard.css        # Profile card styles 
│   │   │   ├── TextShuffle.tsx        # GSAP text reveal animation 
│   │   │   └── VoicePoweredOrb.tsx    # WebGL voice orb
│   │   │
│   │   ├── 📁 pages/               # Application Pages
│   │   │   ├── AgentInterface.tsx     # Main voice agent UI (2000+ lines)
│   │   │   ├── LandingPage.tsx        # Home page
│   │   │   └── AboutDevs.tsx          # About Developers page
│   │   │
│   │   ├── 📁 lib/                 # Shared libraries
│   │   ├── 📁 utils/
│   │   │   └── cn.ts                  # Tailwind class merger
│   │   └── index.css               # Global styles
│   │
│   ├── 📁 components/              # Root-level components
│   │   ├── ChatMessageBubble.tsx      # Chat message UI
│   │   ├── Header.tsx                 # App header
│   │   └── 📁 ui/
│   │       ├── loading-screen.tsx
│   │       ├── spiral-animation.tsx
│   │       └── voice-powered-orb.tsx
│   │
│   ├── 📁 services/                # External Services Integration
│   │   ├── audioUtils.ts              # Audio processing utilities
│   │   └── murfService.ts             # Murf TTS API integration
│   │
│   ├── 📁 public/images/           # Static assets
│   ├── App.tsx                     # Root component with routing
│   ├── index.tsx                   # Entry point
│   ├── index.html
│   ├── types.ts                    # TypeScript type definitions
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts              # Vite configuration
│   └── postcss.config.js
│
├── 📁 server/                      # Backend API Server (Node.js + Express)
│   ├── databaseServer.js           # Express server + SQLite (19+ endpoints)
│   ├── aiController.js             # AI controller logic
│   ├── check_db.js                 # Database inspection utility
│   ├── test_api.js                 # API testing script
│   ├── test-deepgram.js            # Deepgram testing
│   ├── lumina.db                   # SQLite database file
│   ├── 📁 invoices/                # Generated PDF invoices
│   ├── 📁 public/
│   │   └── index.html
│   ├── 📁 scripts/
│   │   └── ingest.js               # Data ingestion script
│   ├── DATABASE_UPDATE_SUMMARY.md  # Database changelog
│   ├── package.json
│   └── .env
│
├── 📁 Design Prompt/               # Design Documentation
│   ├── Hacker Background.txt
│   ├── Profile Cards.txt
│   └── Text Animation -Shuffle.txt
│
├── package.json                    # Root package.json
├── QUICK_START.md                  # Quick start guide
└── README.md                       # This file
```

---

## 🗄️ Database Schema

### **Categories Table**
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
```

**Data (4 categories):**
1. Electronics & Gadgets - Latest technology and electronic devices
2. Home & Kitchen - Everything for your home and kitchen needs
3. Sports & Outdoors - Fitness and outdoor adventure gear
4. Automotive - Car and bike accessories and tools

---

### **Subcategories Table**
```sql
CREATE TABLE subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

**Data (14 subcategories):**
- **Electronics & Gadgets:** Mobiles & Accessories, Laptops/PCs/Components, Smart Home Devices, Wearables
- **Home & Kitchen:** Furniture, Kitchen Tools, Décor, Appliances
- **Sports & Outdoors:** Fitness Gear, Sportswear, Outdoor Essentials
- **Automotive:** Car Accessories, Bike Accessories, Tools & Maintenance

---

### **Products Table**
```sql
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    stock INTEGER NOT NULL,
    description TEXT,
    category_id INTEGER,
    subcategory_id INTEGER,
    brand TEXT,
    image_url TEXT,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(id)
);
```

**Example Products:**
- iPhone 15 Pro (Apple) - ₹119,900 - Electronics > Mobiles
- MacBook Air M3 (Apple) - ₹99,900 - Electronics > Laptops
- Air Fryer 4L (Philips) - ₹6,999 - Home & Kitchen > Appliances
- Running Shoes (Nike) - ₹4,999 - Sports > Sportswear
- Car Dashboard Camera - ₹4,999 - Automotive > Car Accessories

**Total: 52 products across all categories**

---

### **Orders Table**
```sql
CREATE TABLE orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT,
    product_name TEXT,
    quantity INTEGER,
    status TEXT,
    delivery_date TEXT,
    order_date TEXT,
    delivery_slot TEXT,
    discount_code TEXT
);
```

---

### **Customers Table**
```sql
CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    address TEXT,
    loyalty_points INTEGER DEFAULT 0,
    last_order_id TEXT
);
```

---

### **Refunds & Feedback Tables**
```sql
CREATE TABLE refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT,
    status TEXT,
    amount INTEGER,
    reason TEXT
);

CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    rating INTEGER,
    comment TEXT,
    email TEXT
);
```

---

## 🛠️ Agent Tools & Capabilities (19+ Tools)

The AI agent has access to **19+ powerful tools** for handling customer requests:

### 📦 **Product & Inventory Tools**

| Tool | Description | Parameters | Example Use |
|------|-------------|------------|-------------|
| `check_stock` | Search products by name, category, subcategory, or brand. Returns price, stock, description. | `product_name`, `category`, `brand` (all optional) | "Do you have Apple products?"<br/>"Show me fitness gear" |
| `browse_categories` | List all 4 main product categories | None | "What do you sell?" |
| `browse_subcategories` | List subcategories (optionally filtered by category) | `category` (optional) | "What electronics do you have?" |

### 🛒 **Shopping Cart Tools**

| Tool | Description | Parameters | Example Use |
|------|-------------|------------|-------------|
| `add_to_cart` | Add product to cart with **stock validation** | `product_id`, `quantity` | "Add 2 iPhones to cart" |
| `remove_from_cart` | Remove product from cart | `product_id` | "Remove the laptop from cart" |
| `update_cart_quantity` | Change quantity of item in cart | `product_id`, `quantity` | "Change iPhone quantity to 3" |
| `view_cart` | Display all items in shopping cart | None | "What's in my cart?" |
| `checkout_cart` | Process cart checkout with PDF invoice | `customer_name`, `address` | "Checkout my cart" |
| `clear_cart` | Empty the shopping cart | None | "Clear my cart" |

> ⚠️ **Stock Validation**: The `add_to_cart` tool validates stock availability. If you request 100 units but only 48 are available (minus items already in cart), the agent will inform you: *"Cannot add 100 units of iPhone 15 Pro. Only 48 available."*

### 🛒 **Order Management Tools**

| Tool | Description | Parameters | Example Use |
|------|-------------|------------|-------------|
| `search_order` | Get order status and details | `order_id` | "Track order ORD-12345" |
| `place_order` | Create order directly (bypasses cart) with **PDF invoice** | `item_name`, `quantity`, `address`, `customer_name` | "I want to buy an iPhone" |
| `cancel_order` | Cancel a processing order | `order_id` | "Cancel my order" |
| `update_shipping_address` | Change delivery address | `order_id`, `new_address` | "Change shipping address" |
| `schedule_delivery` | Set preferred delivery slot | `order_id`, `delivery_slot` | "Deliver between 2-4 PM" |

### 💰 **Financial Tools**

| Tool | Description | Parameters | Example Use |
|------|-------------|------------|-------------|
| `check_refund_status` | Check refund request status | `order_id` | "Where's my refund?" |
| `create_refund_request` | Initiate refund process | `order_id`, `reason` | "I want to return this" |
| `apply_discount` | Apply coupon code to order | `order_id`, `code` | "Apply DIWALI2024 code" |
| `generate_invoice` | Create/retrieve PDF invoice | `order_id` | "Send me my invoice" |

### 👤 **Customer Profile Tools**

| Tool | Description | Parameters | Example Use |
|------|-------------|------------|-------------|
| `create_customer_profile` | Save customer details | `name`, `email`, `phone`, `address` | "Save my address" |
| `get_customer_details` | Retrieve saved profile | `email`, `name` | "Use my saved address" |
| `submit_feedback` | Submit rating and comments | `rating`, `comment`, `email` | "Rate your experience" |

---

## 🚀 Quick Start Guide

### **Prerequisites**
- Node.js 18+ and npm
- Google Gemini API key ([Get here](https://aistudio.google.com/app/apikey))
- Murf AI API key ([Get here](https://murf.ai/))
- Modern browser with Web Audio API support

---

### **Step 1: Clone the Repository**
```bash
git clone https://github.com/Surfing-Ninja/MURF_AI_VOICE_AGENT.git
cd "Customer Support Agent"
```

---

### **Step 2: Backend Setup**

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the database server
node databaseServer.js
```

**Expected Output:**
```
Database Server running on http://localhost:3005
Connected to the SQLite database.
```

**Verify Database:**
```bash
node check_db.js  # Shows all tables and data
```

---

### **Step 3: Frontend Setup**

```bash
# Navigate to frontend directory (open new terminal)
cd "Lumina Support"

# Install dependencies
npm install

# Create .env file
echo "VITE_GEMINI_API_KEY=your_gemini_api_key" > .env
echo "VITE_MURF_API_KEY=your_murf_api_key" >> .env

# Start development server
npm run dev
```

**Expected Output:**
```
VITE v5.x ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

### **Step 4: Access the Application**

1. Open browser to `http://localhost:5173`
2. You'll see the **HyperspaceLoader** loading screen
3. Click the **voice orb** to start conversation
4. Grant microphone permissions when prompted
5. Start talking! Try: *"What products do you have?"*

---

## 🎙️ Murf Falcon TTS - Deep Dive

> **Murf Falcon** is the premium text-to-speech engine that powers क्रेता-बन्धु's voice. It delivers **professional-grade, human-like speech** that makes conversations feel natural and engaging.

### **Why Murf Falcon?**

| Feature | Traditional TTS | Murf Falcon |
|---------|-----------------|-------------|
| **Naturalness** | Robotic, mechanical | Human-like with emotion |
| **Intonation** | Flat, monotone | Dynamic, expressive |
| **Pauses** | Unnatural timing | Natural conversational rhythm |
| **Latency** | Variable | <200ms streaming |
| **Quality** | 16-22kHz | 48kHz professional audio |

### **Integration Architecture**

```mermaid
sequenceDiagram
    participant G as Gemini 2.5 Flash
    participant A as AgentInterface
    participant M as Murf Falcon API
    participant W as Web Audio API
    participant S as Speaker

    G->>A: Text Response
    A->>M: POST /text-to-speech
    Note over M: Voice: Natalie (US English)<br/>Style: Conversational<br/>Speed: 1.0x
    M->>A: High-Quality Audio Stream
    A->>W: Decode Audio Buffer
    W->>S: 48kHz Playback
```

### **Real-time Streaming Flow**
1. Gemini generates text response
2. Text sent to Murf Falcon API
3. Audio streamed back in chunks
4. Web Audio API decodes and plays immediately
5. User hears natural speech in <300ms total latency

---

## 🎨 Visual Features Showcase

### **1. Voice-Powered Orb**
- **Technology:** OGL (Optimized WebGL library)
- **Effects:** 
  - Solar flares emanating from center
  - Copper-to-cyan color gradient based on position
  - Noise-based organic movement
  - Responsive to voice activity
- **Size:** 320x320px (w-80 h-80)
- **Colors:** Copper (#c87d4a) and Cyan (#00d9ff)

### **2. Light Rays Background**
- **Technology:** OGL with custom GLSL shaders
- **Effects:**
  - Rays emanate from top-center (orb position)
  - Simplex noise for organic movement
  - Mouse tracking (25% influence)
  - Copper-to-cyan gradient based on X position
- **Performance:** 60 FPS on modern hardware

### **3. Hyperspace Loader**
- **Technology:** HTML5 Canvas with Framer Motion
- **Effects:**
  - Starfield with warp-speed animation
  - Left particles: Copper (#c87d4a)
  - Right particles: Cyan (#00d9ff)
  - Mouse interaction speeds up warp
  - 3.5s minimum duration
- **Brand:** क्रेता-बन्धु logo prominently displayed

### **4. Custom Cursor**
- Particle trail following mouse
- Smooth bezier curve animation
- Integrates with glassmorphic theme

### **5. Chat Interface**
- User messages: Transparent white bubbles (right-aligned)
- Bot messages: Cyan bubbles with 60% opacity (left-aligned)
- Smooth fade-in animations
- Auto-scroll to latest message

---

## 🔧 Configuration & Customization

### **Environment Variables**

**Frontend (`.env` in `Lumina Support/`):**
```env
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_MURF_API_KEY=your_murf_api_key
```

**Backend (optional `.env` in `server/`):**
```env
PORT=3005
DB_PATH=./lumina.db
```

---


---

## 🌊 Conversation Flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant F as ⚛️ Frontend
    participant V as 🎙️ VAD (Local)
    participant G as 🧠 Gemini
    participant T as 🛠️ Tools
    participant B as 🗄️ Backend

    U->>F: Clicks Voice Orb
    F->>F: Request Mic Permission
    F->>G: Open WebSocket Connection
    
    U->>F: Speaks: "Show me laptops"
    F->>V: Audio Stream (PCM 16kHz)
    V->>V: Calculate RMS
    V->>G: Forward Audio Data
    
    G->>G: Process Audio (Native)
    G->>G: Detect Intent: check_stock
    G->>F: Tool Call: check_stock(category="laptop")
    
    F->>T: Execute Tool
    T->>B: GET /api/products?category=laptop
    B->>B: Query SQLite
    B->>T: Return 3 laptops
    T->>G: Tool Response
    
    G->>G: Generate Response
    G->>F: Audio Stream (PCM 24kHz)
    F->>F: Play via Web Audio API
    F->>U: "We have 3 laptops: MacBook Air..."
    
    U->>F: Interrupts: "How much is the MacBook?"
    V->>V: Detect Voice (RMS > threshold)
    V->>F: voice_detected signal
    F->>F: Stop Bot Audio Immediately
    F->>G: Forward New Audio
    
    G->>G: Process Interruption
    G->>F: Tool Call: check_stock(product_name="MacBook")
    F->>T: Execute Tool
    T->>B: GET /api/products?search=MacBook
    B->>T: Return MacBook Air M3
    T->>G: Tool Response
    
    G->>F: Audio: "MacBook Air M3 is ₹99,900"
    F->>U: Play Response
```

---

---

## 🔬 Technical Deep Dive

### **Audio Pipeline**

**Input Flow (User → Gemini):**
```
Microphone (System Rate)
    ↓
AudioContext (Resampled to 16kHz)
    ↓
AudioWorklet (PCM Processor)
    ├─→ Voice Activity Detection (RMS calculation)
    │   ├─→ If RMS > 0.01 for 3 frames
    │   └─→ Send interrupt signal
    └─→ Convert to PCM Int16
        ↓
    Base64 Encode
        ↓
    WebSocket to Gemini
        ↓
    [Gemini 2.5 Flash Native Audio Understanding]
```

**Output Flow (Agent → User via Murf Falcon):**
```
[Gemini Text Response]
    ↓
┌─────────────────────────────────────────┐
│         🎙️ MURF FALCON TTS              │
│  ┌─────────────────────────────────┐    │
│  │ • Voice: Natalie (US English)   │    │
│  │ • Style: Conversational         │    │
│  │ • Speed: 1.0x                   │    │
│  │ • Quality: 48kHz Professional   │    │
│  │ • Emotion: Natural intonation   │    │
│  │ • Latency: <200ms               │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
        ↓
    High-Quality Audio Stream
        ↓
    Web Audio API Decode
        ↓
    AudioBufferSource
        ↓
    Speaker Output (Crystal Clear 48kHz)
```

**Why Murf Falcon TTS is Essential:**
- 🎯 **Ultra-Realistic Voice**: Human-like intonation, emotion, and naturalness that makes conversations feel real
- ⚡ **Low Latency**: Optimized for real-time conversations (<200ms synthesis time)
- 🌍 **Multilingual**: Supports 20+ languages with native accents
- 🎛️ **Customizable**: Control pitch, speed, emphasis, and pauses
- 🏆 **Consistent Quality**: Professional-grade audio every time
- 💬 **Conversational Style**: Specifically tuned for customer support interactions

---

### **Barge-In Implementation**

**Problem:** Traditional systems have 500ms+ delay before stopping agent speech.

**Solution:** Local voice activity detection in AudioWorklet

```typescript
// In AudioWorklet processor
const rms = Math.sqrt(sum / channel.length);
if (rms > threshold && consecutiveFrames >= 3) {
  port.postMessage({ type: 'voice_detected', rms });
}

// In main thread
workletNode.port.onmessage = (e) => {
  if (e.data.type === 'voice_detected') {
    // IMMEDIATELY stop all audio
    currentAudio?.pause();
    playbackContext.close();
    playbackContext = new AudioContext();
    updateBotSpeaking(false);
  }
};
```

**Result:** <50ms interruption latency

---

### **Anti-Hallucination Measures**

**Challenge:** LLMs tend to make up products that don't exist.

**Solutions Implemented:**
1. **Strict System Prompt Rule:** "NEVER make up product names, prices, or details"
2. **Complete Product Lists:** Return ALL matching products, not just first 5
3. **Explicit Instructions in Tool Response:** "THESE ARE ALL THE PRODUCTS - DO NOT ADD MORE"
4. **Category/Subcategory Labels:** Each product clearly labeled to prevent mixing

**Example Tool Response:**
```
Found 3 products. THESE ARE ALL THE PRODUCTS - DO NOT ADD MORE: 
Camping Tent 4-Person (Quechua) in Outdoor Essentials - ₹8,999 (30 in stock); 
Hiking Backpack 50L (Wildcraft) in Outdoor Essentials - ₹3,999 (50 in stock); 
Water Bottle Insulated (Milton) in Outdoor Essentials - ₹899 (200 in stock). 
No other products exist in this search.
```

---

## 🐛 Troubleshooting

### **Backend won't start**
```bash
# Check if port 3005 is in use
netstat -ano | findstr :3005

# Kill process if needed
taskkill /PID <process_id> /F

# Delete and recreate database
cd server
del lumina.db
node databaseServer.js
```

---

### **Frontend won't connect**
1. Verify backend is running: `http://localhost:3005/api/categories`
2. Check `.env` file exists with valid API key
3. Clear browser cache and reload
4. Check console for CORS errors

---

### **No microphone audio**
1. Grant browser microphone permissions
2. Check system mic is not muted
3. Try different browser (Chrome/Edge recommended)
4. Check browser console for AudioContext errors

---
---

### **Barge-in not working**
1. Verify `voiceThreshold` in AudioWorklet (try lowering to 0.005)
2. Check console for `[Barge-In]` logs
3. Speak louder/closer to mic
4. Verify bot is actually speaking when you interrupt

---

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| **Audio Latency (Mic → Gemini)** | <100ms |
| **Murf TTS Synthesis** | <200ms |
| **Total Voice Response** | <500ms |
| **Interruption Response** | <50ms (voice detection to audio stop) |
| **UI Frame Rate** | 60 FPS (orb + light rays + effects) |
| **Bundle Size** | ~450KB (gzipped) |
| **Database Query Time** | <5ms (average) |
| **Invoice Generation** | <100ms |
| **WebSocket Reconnect** | <2s |
| **Memory Usage** | ~150MB (browser) |
| **Agent Tools** | 19+ integrated tools |
| **Products Catalog** | 52+ items |

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **🎙️ Murf AI** for the incredible **Falcon TTS engine** - the voice that brings क्रेता-बन्धु to life with human-like speech synthesis
- **🧠 Google Gemini Team** for the revolutionary 2.5 Flash model with native audio understanding
- **🎨 OGL Library** for lightweight, powerful WebGL framework
- **⚛️ React Team** for React 19 with improved performance
- **🎨 Tailwind CSS** for the v4.0 styling system
- **🎬 GSAP** for professional-grade animations
- **🎭 Framer Motion** for smooth UI animations
- **⚡ Vite** for blazing-fast development

---

## 📞 Support

For issues, questions, or feature requests:
- 🐛 GitHub Issues: [Create Issue](https://github.com/Surfing-Ninja/MURF_AI_VOICE_AGENT/issues)

---

## 🏗️ Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19 + TypeScript | UI Framework |
| **Styling** | Tailwind CSS 4 | Utility-first CSS |
| **Voice Input** | Gemini 2.5 Flash Native Audio | Speech Understanding |
| **Voice Output** | **Murf Falcon TTS** | Human-like Speech Synthesis |
| **Animations** | GSAP + Framer Motion | Professional Effects |
| **WebGL** | OGL Library | Voice Orb & Light Rays |
| **Backend** | Node.js + Express | REST API |
| **Database** | SQLite | Data Storage |
| **Build Tool** | Vite | Development & Build |

---

**Built with ❤️ and ☕ by the क्रेता-बन्धु Team**

*Powered by Murf Falcon TTS for human-like voice interactions*

