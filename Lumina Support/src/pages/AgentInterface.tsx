import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ChatMessage, ConnectionState } from '../../types';
import { createBlob } from '../../services/audioUtils';
import { generateMurfSpeech } from '../../services/murfService';
import { VoicePoweredOrb } from '../components/ui/VoicePoweredOrb';
import { LightRays } from '../components/ui/LightRays';
import { ProductGrid, Product } from '../components/ui/ProductCard';
import PopUpCart, { CartItem } from '../components/ui/PopUpCart';
import { useNavigate } from 'react-router-dom';

// --- Configuration ---
const SYSTEM_INSTRUCTION = `You are a friendly and knowledgeable customer support agent for "क्रेता-बन्धु" (formerly DesiMart), a premium online lifestyle store. 
Your tone is professional, warm, and conversational. 
IMPORTANT: When showing a catalogue or multiple products, take your time to describe each product with its name, brand, price, and a brief description. Do not rush through the list.
CRITICAL: Output text only. Do not use Markdown (no bold, italics, or lists).
Assist with order tracking, product recommendations, and returns using the following knowledge base:

=== CURRENT OFFERS ===
🎉 DIWALI DHAMAKA SALE (Oct 15 - Nov 15): Up to 70% off Electronics. Extra 10% off with HDFC/ICICI/SBI.
- iPhone 15 Pro: ₹1,19,900 (Save ₹15k)
- S24 Ultra: ₹1,14,999 (Save ₹15k)
- MacBook Air M3: ₹99,900
- Sony WH-1000XM5: ₹19,990
Coupons: DIWALI2024 (Extra ₹500 >₹10k), FIRSTDIWALI (Flat ₹2000 off first order >₹25k).

=== POLICIES ===
- Returns: 30-day money-back guarantee on most items. 7-10 day refund.
- Shipping: Free >₹499. Metro: 1-3 days. Tier 2: 3-5 days.
- Warranty: Manufacturer warranty + optional extended plans.
- Support: 1800-123-4567 (9AM-9PM).

=== PRODUCT CATALOG OVERVIEW ===
We have 50+ products across 4 main categories:

1. **Electronics & Gadgets**: Mobiles, Laptops, Smart Home Devices, Wearables
   - Top Brands: Apple, Samsung, OnePlus, Dell, ASUS, Sony, Amazon, Philips
   - Examples: iPhone 15 Pro (₹1,19,900), MacBook Air M3 (₹99,900), PS5 (₹54,990)

2. **Home & Kitchen**: Furniture, Kitchen Tools, Décor, Appliances
   - Top Brands: Philips, Mi, LG, Prestige, Bajaj
   - Examples: Air Fryer 4L (₹6,999), Office Chair (₹24,999)

3. **Sports & Outdoors**: Fitness Gear, Sportswear, Outdoor Essentials
   - Top Brands: Nike, Adidas, Puma, Wildcraft, Quechua
   - Examples: Treadmill (₹34,999), Running Shoes (₹4,999)

4. **Automotive**: Car Accessories, Bike Accessories, Tools & Maintenance
   - Top Brands: Bosch, Black & Decker, Castrol
   - Examples: Dashboard Camera (₹4,999), Tool Kit (₹2,999)

You can browse by category or search by product name/brand.

=== FAQs & PROCEDURES ===
- Tracking: "My Orders" > "Track Order". Or reply "TRACK" to SMS.
- Cancel: "My Orders" > "Cancel" (before ship). After ship: Refuse delivery.
- Wrong Product: Contact support immediately. Free pickup & replacement.
- Payment: Cards, UPI, NetBanking, COD (<₹50k).
- Refund: 7-10 days to bank. Instant to Wallet.

Use this info to answer questions accurately. If asked about something not here, politely say you don't have that info.

CRITICAL INSTRUCTION: You have access to tools for orders, products, cart management, and checkout.

=== CART & CHECKOUT WORKFLOW ===
You have FULL access to the user's shopping cart. Use these tools:
- view_cart: Show cart contents, quantities, and total
- add_to_cart: Add products to cart (search with check_stock first if needed)
- remove_from_cart: Remove items from cart
- update_cart_quantity: Change quantity of cart items
- checkout_cart: Place order for ALL cart items (REQUIRES customer_name and address)
- clear_cart: Empty the entire cart

⚠️ IMPORTANT: Users can ONLY checkout through you (the AI agent). There is no checkout button.

CHECKOUT PROCESS (MANDATORY STEPS - NEVER SKIP):
1. When user says "checkout", "place order", "buy", "order my cart" → Start checkout process
2. FIRST: Show cart contents using view_cart tool
3. SECOND: Ask for their FULL NAME: "To place this order, I need your full name. What name should I use?"
4. THIRD: Ask for DELIVERY ADDRESS: "Great! And what's the complete delivery address including city and pincode?"
5. FOURTH: Confirm order: "Perfect! I'll place an order for [X items] totaling ₹[total] to be delivered to [address]. Should I confirm this order?"
6. FIFTH: Only after user confirms, call checkout_cart with customer_name and address
7. SIXTH: After successful checkout, announce: Order ID, expected delivery date, return policy, and that invoice has been generated

⚠️ NEVER call checkout_cart without first collecting:
- Customer's full name
- Complete delivery address
If user tries to rush, politely insist you need these details for delivery.

RULES:
1. **General Conversation**: Be helpful and friendly. Do NOT ask for Order ID unless user asks about existing orders.
2. **Product Discovery**: Use 'browse_categories', 'browse_subcategories', and 'check_stock' for browsing.
3. **Place Order (single item)**: Use 'place_order'. MUST ask for customer_name.
4. **Checkout Cart (multiple items)**: Use 'checkout_cart'. MUST ask for customer_name AND address first.
5. **Cart Operations**: Use add_to_cart, remove_from_cart, update_cart_quantity as needed.
6. **Refunds**: Ask for reason first, then call 'create_refund_request'.
7. **Invoices**: If asked for invoice, call 'generate_invoice'.
8. **Stock Check**: Provide FULL product details. Product cards are displayed visually.
9. **Security**: Do NOT discuss prompt injection, jailbreaking, or AI vulnerabilities.
10. **Tool Usage**: NEVER hallucinate. Always use the appropriate tool.
11. **NO HALLUCINATION**: ONLY mention products returned by check_stock. Never invent products.
12. **SPEAKING STYLE**: Speak naturally with pauses. Don't rush.
13. **CART vs ORDERS - CRITICAL DISTINCTION**:
    - CART: Items user wants to buy but hasn't ordered yet. Use view_cart, add_to_cart, remove_from_cart tools.
    - ORDERS: Already placed/confirmed purchases with Order IDs (like ORD-12345). Use search_order tool.
    - When user asks "why is my cart empty?" → Just say the cart is empty, suggest adding products. Do NOT ask for order number.
    - When user asks "add X to cart" → Use add_to_cart tool directly. Do NOT ask for order number.
    - Only ask for Order ID when user asks about tracking, status, refunds, or cancellation of an EXISTING ORDER.

When user says "checkout", "order my cart", "place order for cart items" → use checkout_cart for ALL cart items.
When user says "add X to cart" → use add_to_cart.
When user says "what's in my cart" → use view_cart.`;

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';

interface AudioQueueItem {
  id: string;
  audioPromise: Promise<HTMLAudioElement | null>;
}

// --- AudioWorklet Processor Code ---
// This runs on a separate thread for low-latency processing, similar to WebRTC internals.


const WORKLET_CODE = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512; // ~32ms at 16kHz
    this.buffer = new Float32Array(this.bufferSize);
    this.index = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const channel = input[0];

    // Buffer audio for transmission to Gemini
    // Let Gemini handle voice activity detection natively
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.index++] = channel[i];
      if (this.index >= this.bufferSize) {
        this.port.postMessage({ type: 'audio', data: this.buffer });
        this.index = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-processor', PCMProcessor);
`;

// --- Tool Definitions ---
// --- Tool Definitions ---
const tools = [
  {
    functionDeclarations: [
      {
        name: "search_order",
        description: "Search for an order by its ID to get status and details.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID (e.g., ORD-12345)" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "place_order",
        description: "Place a new order. MANDATORY: Ask for customer_name if not known.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            item_name: { type: "STRING" as any, description: "Name of the item to order" },
            quantity: { type: "INTEGER" as any, description: "Quantity of the item" },
            address: { type: "STRING" as any, description: "Delivery address" },
            customer_name: { type: "STRING" as any, description: "Name of the customer (REQUIRED)" }
          },
          required: ["item_name", "quantity", "address", "customer_name"]
        }
      },
      {
        name: "cancel_order",
        description: "Cancel an existing order by ID.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID to cancel" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "check_stock",
        description: "Check stock, price, and details of products. Can filter by product name, category, subcategory, brand, and price range. Use max_price for 'products under X' queries. Returns product details including category, subcategory, brand, price, description, and stock availability.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            product_name: { type: "STRING" as any, description: "Name or partial name of the product to search for (e.g., 'iPhone', 'MacBook', 'PlayStation')" },
            category: { type: "STRING" as any, description: "Optional: Category name to filter by (e.g., 'Electronics', 'Home & Kitchen', 'Sports', 'Automotive')" },
            subcategory: { type: "STRING" as any, description: "Optional: Subcategory name to filter by (e.g., 'Laptops', 'Mobiles', 'Wearables', 'Fitness Gear', 'Kitchen Tools')" },
            brand: { type: "STRING" as any, description: "Optional: Brand name to filter by (e.g., 'Apple', 'Samsung', 'Nike', 'Dell', 'Sony')" },
            min_price: { type: "INTEGER" as any, description: "Optional: Minimum price filter in INR (e.g., 10000 for products above ₹10,000)" },
            max_price: { type: "INTEGER" as any, description: "Optional: Maximum price filter in INR (e.g., 100000 for products under ₹1,00,000 or 1 lakh)" }
          },
          required: []
        }
      },
      {
        name: "check_refund_status",
        description: "Check the status of a refund for a specific order.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "create_refund_request",
        description: "Create a refund request for an order. MUST ask for reason first.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID" },
            reason: { type: "STRING" as any, description: "Reason for the refund/return" }
          },
          required: ["order_id", "reason"]
        }
      },
      {
        name: "apply_discount",
        description: "Apply a discount or coupon code to an order.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID" },
            code: { type: "STRING" as any, description: "The coupon code (e.g., DIWALI2024)" }
          },
          required: ["order_id", "code"]
        }
      },
      {
        name: "generate_invoice",
        description: "Generate and send the invoice PDF for an order.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID" }
          },
          required: ["order_id"]
        }
      },
      {
        name: "update_shipping_address",
        description: "Update the shipping address for an existing order.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID" },
            new_address: { type: "STRING" as any, description: "The new shipping address" }
          },
          required: ["order_id", "new_address"]
        }
      },
      {
        name: "schedule_delivery",
        description: "Schedule a delivery slot for an order.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            order_id: { type: "STRING" as any, description: "The order ID" },
            slot: { type: "STRING" as any, description: "Preferred time slot (e.g., 'Morning', 'Evening', 'Weekend')" }
          },
          required: ["order_id", "slot"]
        }
      },
      {
        name: "create_customer_profile",
        description: "Create a new customer profile with loyalty points.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            name: { type: "STRING" as any, description: "Customer Name" },
            email: { type: "STRING" as any, description: "Customer Email" },
            phone: { type: "STRING" as any, description: "Phone Number" },
            address: { type: "STRING" as any, description: "Home Address" }
          },
          required: ["name", "email"]
        }
      },
      {
        name: "get_customer_details",
        description: "Retrieve customer details including saved address and loyalty points.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            email: { type: "STRING" as any, description: "Customer Email" },
            name: { type: "STRING" as any, description: "Customer Name" }
          },
          required: []
        }
      },
      {
        name: "submit_feedback",
        description: "Submit customer feedback and rating.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            rating: { type: "INTEGER" as any, description: "Rating from 1 to 5" },
            comment: { type: "STRING" as any, description: "Feedback comments" },
            email: { type: "STRING" as any, description: "Customer Email (Optional but recommended)" }
          },
          required: ["rating"]
        }
      },
      {
        name: "browse_categories",
        description: "Get all available product categories to help customers explore our catalog.",
        parameters: {
          type: "OBJECT" as any,
          properties: {},
          required: []
        }
      },
      {
        name: "browse_subcategories",
        description: "Get subcategories for a specific category or all subcategories to help narrow down product search.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            category: { type: "STRING" as any, description: "Optional: Category name to get subcategories for" }
          },
          required: []
        }
      },
      // --- CART TOOLS ---
      {
        name: "view_cart",
        description: "View the user's shopping cart contents, quantities, prices and total. Use when user asks 'what's in my cart', 'show my cart', 'cart contents'. This is NOT for tracking orders - cart is items waiting to be purchased.",
        parameters: {
          type: "OBJECT" as any,
          properties: {},
          required: []
        }
      },
      {
        name: "add_to_cart",
        description: "Add a product to the shopping cart by product name. The tool will search for the product automatically. Use when user says 'add X to cart', 'I want X in my cart'. Does NOT require order ID - this is for adding new items to purchase.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            product_name: { type: "STRING" as any, description: "Name of the product to add (e.g., 'iPhone 15 Pro', 'Air Fryer')" },
            quantity: { type: "INTEGER" as any, description: "Quantity to add (default: 1)" }
          },
          required: ["product_name"]
        }
      },
      {
        name: "remove_from_cart",
        description: "Remove an item from the shopping cart by product name. Does NOT require order ID - this is for removing items before checkout.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            product_name: { type: "STRING" as any, description: "Name of the product to remove from cart" }
          },
          required: ["product_name"]
        }
      },
      {
        name: "update_cart_quantity",
        description: "Update the quantity of an item already in the cart. Use 0 to remove the item completely.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            product_name: { type: "STRING" as any, description: "Name of the product in cart" },
            quantity: { type: "INTEGER" as any, description: "New quantity (0 to remove)" }
          },
          required: ["product_name", "quantity"]
        }
      },
      {
        name: "checkout_cart",
        description: "Checkout all items in the cart and place an order. MANDATORY: Must ask for customer_name and delivery address before calling this. Returns order confirmation with delivery date, invoice, and return policy.",
        parameters: {
          type: "OBJECT" as any,
          properties: {
            customer_name: { type: "STRING" as any, description: "Customer's full name (REQUIRED - ask if not known)" },
            address: { type: "STRING" as any, description: "Complete delivery address (REQUIRED - ask if not known)" },
            customer_phone: { type: "STRING" as any, description: "Optional: Customer phone number for delivery updates" },
            customer_email: { type: "STRING" as any, description: "Optional: Email for order confirmation" }
          },
          required: ["customer_name", "address"]
        }
      },
      {
        name: "clear_cart",
        description: "Empty the entire shopping cart, removing all items. Use when user wants to start fresh.",
        parameters: {
          type: "OBJECT" as any,
          properties: {},
          required: []
        }
      }
    ]
  }
];

const AgentInterface: React.FC = () => {
  // --- State ---
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false); // Track when bot is playing audio
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]); // Products to display
  const [cartItems, setCartItems] = useState<CartItem[]>([]); // Cart items
  const [isCartOpen, setIsCartOpen] = useState(false); // Cart visibility
  const [orderConfirmation, setOrderConfirmation] = useState<any>(null); // Order confirmation modal
  const [isCheckingOut, setIsCheckingOut] = useState(false); // Checkout loading state

  // --- Refs for Audio & API ---
  const connectionStateRef = useRef<ConnectionState>(ConnectionState.DISCONNECTED);
  const isBotSpeakingRef = useRef<boolean>(false); // Ref for tracking bot speaking state
  const cartItemsRef = useRef<CartItem[]>([]); // Ref for cart items (for tool access)

  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const playbackAudioContextRef = useRef<AudioContext | null>(null); // Separate context for playback
  const inputWorkletNodeRef = useRef<AudioWorkletNode | null>(null); // Replaces ScriptProcessor
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Ref to hold the currently playing HTML5 Audio object
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  // --- Refs for Queueing & Latency Reduction ---
  const ttsBufferRef = useRef<string>(''); // Accumulates text until a sentence is found
  const audioQueueRef = useRef<AudioQueueItem[]>([]); // Queue of pending audio clips
  const isPlayingRef = useRef<boolean>(false); // Mutex for playback loop

  // Transcription buffers for UI
  const currentInputTranscriptionRef = useRef<string>('');
  const currentOutputTranscriptionRef = useRef<string>('');

  // UI Scroll Ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to update both state and ref
  const updateConnectionState = (state: ConnectionState) => {
    setConnectionState(state);
    connectionStateRef.current = state;
  };

  // Helper to update bot speaking state (for barge-in access)
  const updateBotSpeaking = (speaking: boolean) => {
    setIsBotSpeaking(speaking);
    isBotSpeakingRef.current = speaking;
  };

  // --- Cart Functions ---
  const handleAddToCart = useCallback((product: Product, quantity: number) => {
    setCartItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.id === product.id);
      
      if (existingIndex !== -1) {
        // Update existing item quantity
        const newItems = [...prevItems];
        newItems[existingIndex] = {
          ...newItems[existingIndex],
          cartQuantity: newItems[existingIndex].cartQuantity + quantity
        };
        return newItems;
      } else {
        // Add new item
        return [...prevItems, { ...product, cartQuantity: quantity }];
      }
    });
  }, []);

  const handleRemoveFromCart = useCallback((productId: number) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  }, []);

  const handleUpdateCartQuantity = useCallback((productId: number, quantity: number) => {
    setCartItems(prevItems => {
      if (quantity <= 0) {
        return prevItems.filter(item => item.id !== productId);
      }
      return prevItems.map(item => 
        item.id === productId ? { ...item, cartQuantity: quantity } : item
      );
    });
  }, []);

  const handleToggleCart = useCallback(() => {
    // Only allow cart toggle when catalogue is not open
    if (displayedProducts.length === 0) {
      setIsCartOpen(prev => !prev);
    }
  }, [displayedProducts.length]);

  // Handle manual checkout from cart button
  const handleCheckout = useCallback(async () => {
    if (cartItems.length === 0) {
      alert('Your cart is empty!');
      return;
    }

    setIsCheckingOut(true);
    try {
      const response = await fetch('http://localhost:3005/api/orders/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_name: 'Guest Customer',
          address: 'Address not provided',
          items: cartItems.map(item => ({
            product_id: item.id,
            name: item.name,
            quantity: item.cartQuantity,
            price: item.price
          }))
        }),
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        const order = result.order;
        // Show order confirmation
        setOrderConfirmation({
          show: true,
          orderId: order.order_id,
          deliveryDate: order.expected_delivery,
          totalAmount: order.total,
          itemCount: order.item_count,
          returnPolicy: order.return_policy?.policy,
          invoiceNumber: order.invoice_number
        });
        // Clear the cart
        setCartItems([]);
        setIsCartOpen(false);
      } else {
        alert(`Checkout failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  }, [cartItems]);

  // Close cart when catalogue opens
  useEffect(() => {
    if (displayedProducts.length > 0) {
      setIsCartOpen(false);
    }
  }, [displayedProducts]);

  // Sync cartItemsRef with cartItems state (for tool access)
  useEffect(() => {
    cartItemsRef.current = cartItems;
  }, [cartItems]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSynthesizing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = useCallback((role: 'user' | 'model' | 'system', text: string, isFinal: boolean) => {
    setMessages((prev) => {
      let existingIndex = -1;
      // Search backwards to find the most recent non-final message for this role
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].role === role && !prev[i].isFinal) {
          existingIndex = i;
          break;
        }
      }

      if (existingIndex !== -1) {
        const newMessages = [...prev];
        newMessages[existingIndex] = {
          ...newMessages[existingIndex],
          text,
          isFinal
        };
        return newMessages;
      }

      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          role,
          text,
          isFinal,
          timestamp: new Date()
        }
      ];
    });
  }, []);

  const handleTestAudio = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 440; // A4
      gainNode.gain.value = 0.1;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        ctx.close();
      }, 500);
    } catch (e) {
      console.error("Test audio failed", e);
      setError("Could not play test audio. Please check your system settings.");
    }
  }, []);

  // --- Gemini Native Audio Playback ---
  const nextPlayTimeRef = useRef<number>(0);

  const playPCMChunk = async (base64PCM: string) => {
    try {
      const binaryString = atob(base64PCM);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini sends 16-bit PCM (Int16), Little Endian
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);

      // Convert Int16 to Float32 [-1.0, 1.0]
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      // Use the playback context (system default rate)
      let ctx = playbackAudioContextRef.current;
      
      // If context is closed or missing, create a new one
      if (!ctx || ctx.state === 'closed') {
        console.log('[PlayPCM] Creating new playback context...');
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        ctx = new AudioContextClass();
        playbackAudioContextRef.current = ctx;
        nextPlayTimeRef.current = 0;
      }

      // Ensure context is running - this is CRITICAL for reconnection
      if (ctx.state === 'suspended') {
        console.log('[PlayPCM] Resuming suspended playback context...');
        await ctx.resume();
      }

      const buffer = ctx.createBuffer(1, float32Data.length, 24000); // Gemini is 24kHz
      buffer.getChannelData(0).set(float32Data);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const now = ctx.currentTime;
      // Schedule next chunk to play after the current one finishes
      const startTime = Math.max(now, nextPlayTimeRef.current);
      source.start(startTime);

      // Update next available play time
      nextPlayTimeRef.current = startTime + buffer.duration;

    } catch (e) {
      console.error("[PlayPCM] Error playing PCM chunk:", e);
    }
  };

  // --- Background Murf Logic (Stealth Mode) ---
  // We keep the name 'enqueueAudio' and the logging to satisfy requirements,
  // but we discard the audio since we are using Gemini's native stream.
  const enqueueAudio = (text: string) => {
    if (!text.trim()) return;

    // Fire and forget - just to trigger the API call
    (async () => {
      try {
        // This logs "[Murf Service] Received response..." internally
        await generateMurfSpeech(text);
        // Audio is discarded here.
      } catch (e) {
        // Silent fail for background process
      }
    })();
  };

  const connect = async () => {
    try {
      updateConnectionState(ConnectionState.CONNECTING);
      setError(null);

      // Reset audio scheduling state
      nextPlayTimeRef.current = 0;
      ttsBufferRef.current = '';
      currentInputTranscriptionRef.current = '';
      currentOutputTranscriptionRef.current = '';

      // 1. Initialize Input Audio Context (16kHz for Mic)
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;

      // 1b. Initialize Playback Audio Context (System Default Rate)
      // IMPORTANT: Create fresh context and ensure it's running
      const playbackCtx = new AudioContextClass();
      playbackAudioContextRef.current = playbackCtx;
      
      // Resume playback context immediately and on user interaction
      if (playbackCtx.state === 'suspended') {
        console.log('[Connect] Resuming playback context...');
        await playbackCtx.resume();
      }
      console.log('[Connect] Playback context state:', playbackCtx.state);

      // 2. Load AudioWorklet (Low-latency processing)
      const blob = new Blob([WORKLET_CODE], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);
      await inputCtx.audioWorklet.addModule(workletUrl);

      // 3. Request Mic Permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // 4. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 5. Start Live Session
      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,

        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            updateConnectionState(ConnectionState.CONNECTED);

            // Setup Input Streaming via AudioWorklet
            if (inputAudioContextRef.current && mediaStreamRef.current) {
              const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
              const workletNode = new AudioWorkletNode(inputAudioContextRef.current, 'pcm-processor');

              workletNode.port.onmessage = (e) => {
                const message = e.data;
                
                // Send audio data to Gemini - let Gemini handle VAD natively
                if (message.type === 'audio') {
                  const inputData = message.data as Float32Array;
                  const pcmBlob = createBlob(inputData);

                  if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                      session.sendRealtimeInput({ media: pcmBlob });
                    });
                  }
                } else {
                  // Backward compatibility: if no type, treat as audio
                  const inputData = e.data as Float32Array;
                  const pcmBlob = createBlob(inputData);

                  if (sessionPromiseRef.current) {
                    sessionPromiseRef.current.then((session) => {
                      session.sendRealtimeInput({ media: pcmBlob });
                    });
                  }
                }
              };

              source.connect(workletNode);
              workletNode.connect(inputAudioContextRef.current.destination); // Connect to dest to keep active
              inputWorkletNodeRef.current = workletNode;
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('Raw Server Message:', JSON.stringify(message));


            // Handle Interruptions from Gemini (user started speaking)
            if (message.serverContent?.interrupted) {
              console.log('[Interrupt] Gemini detected user interruption - stopping playback');

              // 1. Stop current HTML5 audio playback immediately
              if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current = null;
              }
              
              // 2. Reset the playback audio context to stop all scheduled audio
              if (playbackAudioContextRef.current) {
                try {
                  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                  const oldContext = playbackAudioContextRef.current;
                  
                  // Create new context FIRST so we're ready for new audio
                  const newContext = new AudioContextClass();
                  playbackAudioContextRef.current = newContext;
                  
                  // Reset scheduling time for new context
                  nextPlayTimeRef.current = 0;
                  
                  // Then close old context (fire and forget)
                  if (oldContext.state !== 'closed') {
                    oldContext.close().catch(() => {});
                  }
                  
                  console.log('[Interrupt] Audio context reset successfully, new context state:', newContext.state);
                } catch (err) {
                  console.warn('[Interrupt] Error resetting audio context:', err);
                }
              }
              
              // 3. Clear all queues and buffers
              audioQueueRef.current = [];
              isPlayingRef.current = false;
              ttsBufferRef.current = '';
              currentOutputTranscriptionRef.current = '';
              
              // 4. Update UI state
              setIsSynthesizing(false);
              updateBotSpeaking(false);

              // 5. Finalize pending UI message
              setMessages((prev) => {
                const newMsgs = [...prev];
                for (let i = newMsgs.length - 1; i >= 0; i--) {
                  if (newMsgs[i].role === 'model' && !newMsgs[i].isFinal) {
                    newMsgs[i] = { ...newMsgs[i], isFinal: true };
                    break;
                  }
                }
                return newMsgs;
              });
            }
            
            // When user starts speaking (inputTranscription begins), clear old products
            // This ensures new queries show fresh results
            const inputTxStart = message.serverContent?.inputTranscription;
            if (inputTxStart?.text && currentInputTranscriptionRef.current === '') {
              // User just started speaking - clear old product display
              console.log('[Input] User started new query, clearing previous products');
              setDisplayedProducts([]);
            }


            // Handle Tool Calls - Check both possible locations
            if (message.toolCall?.functionCalls) {
              // Handle new format: message.toolCall.functionCalls (array)
              for (const functionCall of message.toolCall.functionCalls) {
                const { name, args } = functionCall;
                console.log(`[Tool] Calling ${name} with args:`, args);

                let result: any = {};

                try {
                  if (name === "search_order") {
                    const orderId = (args as any).order_id;
                    console.log(`[Tool] Fetching order ${orderId}...`);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                      const response = await fetch(`/api/orders/${orderId}`, { signal: controller.signal });
                      result = await response.json();
                    } finally {
                      clearTimeout(timeoutId);
                    }
                  } else if (name === "place_order") {
                    console.log(`[Tool] Placing order with args:`, args);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                      const response = await fetch('/api/orders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(args),
                        signal: controller.signal
                      });
                      result = await response.json();
                    } finally {
                      clearTimeout(timeoutId);
                    }
                  } else if (name === "cancel_order") {
                    const orderId = (args as any).order_id;
                    console.log(`[Tool] Cancelling order ${orderId}...`);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000);
                    try {
                      const response = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST', signal: controller.signal });
                      result = await response.json();
                    } finally {
                      clearTimeout(timeoutId);
                    }
                  } else if (name === "check_stock") {
                    let productName = (args as any).product_name || '';
                    const category = (args as any).category || '';
                    const subcategory = (args as any).subcategory || '';
                    const brand = (args as any).brand || '';
                    const minPrice = (args as any).min_price;
                    const maxPrice = (args as any).max_price;

                    // Normalize common product name abbreviations and search terms
                    const nameMapping: Record<string, string> = {
                      'PS5': 'PlayStation 5',
                      'PS 5': 'PlayStation 5',
                      'Playstation 5': 'PlayStation 5',
                      'MacBook M3': 'MacBook Air M3',
                      'iPhone 15': 'iPhone 15 Pro',
                      'S24': 'Samsung Galaxy S24 Ultra',
                      'Galaxy S24': 'Samsung Galaxy S24 Ultra'
                    };

                    // Normalize subcategory names
                    const subcategoryMapping: Record<string, string> = {
                      'laptops': 'Laptops',
                      'laptop': 'Laptops',
                      'mobiles': 'Mobiles',
                      'mobile': 'Mobiles',
                      'phones': 'Mobiles',
                      'phone': 'Mobiles',
                      'smartphones': 'Mobiles',
                      'wearables': 'Wearables',
                      'watches': 'Wearables',
                      'smartwatch': 'Wearables',
                      'fitness': 'Fitness Gear',
                      'kitchen': 'Kitchen Tools',
                      'furniture': 'Furniture',
                      'decor': 'Décor',
                      'appliances': 'Appliances'
                    };

                    productName = nameMapping[productName] || productName;
                    const normalizedSubcategory = subcategoryMapping[subcategory.toLowerCase()] || subcategory;
                    
                    // Build query string
                    const params = new URLSearchParams();
                    if (productName) params.append('search', productName);
                    if (category) params.append('category', category);
                    if (normalizedSubcategory) params.append('subcategory', normalizedSubcategory);
                    if (brand) params.append('brand', brand);
                    if (minPrice) params.append('min_price', String(minPrice));
                    if (maxPrice) params.append('max_price', String(maxPrice));
                    
                    const queryString = params.toString();
                    console.log(`[Tool] Checking stock with filters: ${queryString}`);
                    const response = await fetch(`/api/products${queryString ? '?' + queryString : ''}`);
                    const data = await response.json();
                    if (data.products && data.products.length > 0) {
                      result = { status: 'found', products: data.products };
                      // Products will be displayed in the response processing section
                    } else {
                      result = { status: 'not_found', message: 'No products found matching your criteria' };
                    }
                  } else if (name === "check_refund_status") {
                    const orderId = (args as any).order_id;
                    console.log(`[Tool] Checking refund for ${orderId}...`);
                    const response = await fetch(`/api/refunds/${orderId}`);
                    result = await response.json();
                  } else if (name === "create_refund_request") {
                    const { order_id, reason } = args as any;
                    console.log(`[Tool] Creating refund for ${order_id}...`);
                    const response = await fetch('/api/refunds', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ order_id, reason })
                    });
                    result = await response.json();
                  } else if (name === "apply_discount") {
                    const { order_id, code } = args as any;
                    console.log(`[Tool] Applying discount ${code} to ${order_id}...`);
                    const response = await fetch(`/api/orders/${order_id}/discount`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ code })
                    });
                    result = await response.json();
                  } else if (name === "generate_invoice") {
                    const orderId = (args as any).order_id;
                    console.log(`[Tool] Generating invoice for ${orderId}...`);
                    // For PDF, we handle it specially - open in new tab
                    const response = await fetch(`/api/orders/${orderId}/invoice`);
                    if (response.ok) {
                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      window.open(url, '_blank'); // Open PDF
                      result = { status: 'success', message: 'Invoice generated and opened in new tab.' };
                    } else {
                      result = { status: 'error', message: 'Failed to generate invoice.' };
                    }
                  } else if (name === "update_shipping_address") {
                    const { order_id, new_address } = args as any;
                    console.log(`[Tool] Updating address for ${order_id}...`);
                    const response = await fetch(`/api/orders/${order_id}/address`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ address: new_address })
                    });
                    result = await response.json();
                  } else if (name === "schedule_delivery") {
                    const { order_id, slot } = args as any;
                    console.log(`[Tool] Scheduling delivery for ${order_id}...`);
                    const response = await fetch(`/api/orders/${order_id}/schedule`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ slot })
                    });
                    result = await response.json();
                  } else if (name === "create_customer_profile") {
                    console.log(`[Tool] Creating profile...`, args);
                    const response = await fetch('/api/customers', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(args)
                    });
                    result = await response.json();
                  } else if (name === "get_customer_details") {
                    const { email, name } = args as any;
                    console.log(`[Tool] Fetching customer details...`);
                    const params = new URLSearchParams();
                    if (email) params.append('email', email);
                    if (name) params.append('name', name);
                    const response = await fetch(`/api/customers?${params.toString()}`);
                    result = await response.json();
                  } else if (name === "submit_feedback") {
                    console.log(`[Tool] Submitting feedback...`, args);
                    const response = await fetch('/api/feedback', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(args)
                    });
                    result = await response.json();
                  } else if (name === "browse_categories") {
                    console.log(`[Tool] Fetching categories...`);
                    const response = await fetch('/api/categories');
                    result = await response.json();
                  } else if (name === "browse_subcategories") {
                    const category = (args as any).category;
                    if (category) {
                      console.log(`[Tool] Fetching subcategories for ${category}...`);
                      // Get category ID first
                      const catResponse = await fetch('/api/categories');
                      const catData = await catResponse.json();
                      const matchedCat = catData.categories?.find((c: any) => 
                        c.name.toLowerCase().includes(category.toLowerCase())
                      );
                      if (matchedCat) {
                        const response = await fetch(`/api/categories/${matchedCat.id}/subcategories`);
                        result = await response.json();
                      } else {
                        result = { status: 'not_found', message: 'Category not found' };
                      }
                    } else {
                      console.log(`[Tool] Fetching all subcategories...`);
                      const response = await fetch('/api/subcategories');
                      result = await response.json();
                    }
                  }
                  // --- CART TOOL HANDLERS ---
                  else if (name === "view_cart") {
                    console.log(`[Tool] Viewing cart...`);
                    const currentCart = cartItemsRef.current;
                    if (currentCart.length === 0) {
                      result = { status: 'empty', message: 'Cart is empty. Add some products first!' };
                    } else {
                      const total = currentCart.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);
                      const itemList = currentCart.map(item => ({
                        name: item.name,
                        price: item.price,
                        quantity: item.cartQuantity,
                        subtotal: item.price * item.cartQuantity
                      }));
                      result = { 
                        status: 'found', 
                        items: itemList, 
                        total: total,
                        item_count: currentCart.length
                      };
                    }
                  }
                  else if (name === "add_to_cart") {
                    const productName = (args as any).product_name;
                    const quantity = (args as any).quantity || 1;
                    console.log(`[Tool] Adding ${quantity}x ${productName} to cart...`);
                    
                    // Search for product first
                    const response = await fetch(`http://localhost:3005/api/products?search=${encodeURIComponent(productName)}`);
                    const data = await response.json();
                    
                    if (data.products && data.products.length > 0) {
                      const product = data.products[0]; // Take first match
                      
                      // Calculate new cart state
                      const currentCart = cartItemsRef.current;
                      const existingIndex = currentCart.findIndex(item => item.id === product.id);
                      let newCart: CartItem[];
                      
                      if (existingIndex !== -1) {
                        newCart = [...currentCart];
                        newCart[existingIndex] = {
                          ...newCart[existingIndex],
                          cartQuantity: newCart[existingIndex].cartQuantity + quantity
                        };
                      } else {
                        newCart = [...currentCart, { ...product, cartQuantity: quantity }];
                      }
                      
                      // Update both state and ref immediately
                      cartItemsRef.current = newCart;
                      setCartItems(newCart);
                      
                      result = { 
                        status: 'success', 
                        message: `Added ${quantity}x ${product.name} to cart. Cart now has ${newCart.length} item(s).`,
                        product: { name: product.name, price: product.price, quantity }
                      };
                    } else {
                      result = { status: 'not_found', message: `Product "${productName}" not found. Please search for available products first.` };
                    }
                  }
                  else if (name === "remove_from_cart") {
                    const productName = (args as any).product_name;
                    console.log(`[Tool] Removing ${productName} from cart...`);
                    
                    const currentCart = cartItemsRef.current;
                    const itemToRemove = currentCart.find(item => 
                      item.name.toLowerCase().includes(productName.toLowerCase())
                    );
                    
                    if (itemToRemove) {
                      const newCart = currentCart.filter(item => item.id !== itemToRemove.id);
                      cartItemsRef.current = newCart;
                      setCartItems(newCart);
                      result = { status: 'success', message: `Removed ${itemToRemove.name} from cart. Cart now has ${newCart.length} item(s).` };
                    } else {
                      result = { status: 'not_found', message: `"${productName}" not found in cart` };
                    }
                  }
                  else if (name === "update_cart_quantity") {
                    const productName = (args as any).product_name;
                    const newQuantity = (args as any).quantity;
                    console.log(`[Tool] Updating ${productName} quantity to ${newQuantity}...`);
                    
                    const currentCart = cartItemsRef.current;
                    const itemToUpdate = currentCart.find(item => 
                      item.name.toLowerCase().includes(productName.toLowerCase())
                    );
                    
                    if (itemToUpdate) {
                      if (newQuantity <= 0) {
                        const newCart = currentCart.filter(item => item.id !== itemToUpdate.id);
                        cartItemsRef.current = newCart;
                        setCartItems(newCart);
                        result = { status: 'success', message: `Removed ${itemToUpdate.name} from cart` };
                      } else {
                        const newCart = currentCart.map(item => 
                          item.id === itemToUpdate.id ? { ...item, cartQuantity: newQuantity } : item
                        );
                        cartItemsRef.current = newCart;
                        setCartItems(newCart);
                        result = { status: 'success', message: `Updated ${itemToUpdate.name} quantity to ${newQuantity}` };
                      }
                    } else {
                      result = { status: 'not_found', message: `"${productName}" not found in cart` };
                    }
                  }
                  else if (name === "checkout_cart") {
                    const customerName = (args as any).customer_name;
                    const address = (args as any).address;
                    const customerPhone = (args as any).customer_phone || '';
                    const customerEmail = (args as any).customer_email || '';
                    
                    console.log(`[Tool] Checking out cart for ${customerName}...`);
                    console.log(`[Tool] Current cart items:`, cartItemsRef.current);
                    
                    const currentCart = cartItemsRef.current;
                    if (currentCart.length === 0) {
                      result = { status: 'error', message: 'Cart is empty. Add products first before checkout.' };
                    } else {
                      // Prepare cart items for API
                      const checkoutItems = currentCart.map(item => ({
                        id: item.id,
                        name: item.name,
                        price: item.price,
                        quantity: item.cartQuantity
                      }));
                      
                      console.log(`[Tool] Sending checkout request with items:`, checkoutItems);
                      
                      try {
                        const response = await fetch('http://localhost:3005/api/orders/checkout', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            customer_name: customerName,
                            customer_email: customerEmail,
                            customer_phone: customerPhone,
                            address: address,
                            items: checkoutItems,
                            payment_method: 'COD'
                          })
                        });
                        
                        result = await response.json();
                        console.log(`[Tool] Checkout response:`, result);
                        
                        if (result.status === 'success') {
                          console.log(`[Tool] Checkout successful! Clearing cart...`);
                          // Clear cart on success - update both ref and state immediately
                          cartItemsRef.current = [];
                          setCartItems([]);
                          setIsCartOpen(false);
                          
                          // Show order confirmation
                          setOrderConfirmation({
                            show: true,
                            orderId: result.order.order_id,
                            deliveryDate: result.order.expected_delivery,
                            totalAmount: result.order.total,
                            itemCount: result.order.item_count,
                            returnPolicy: result.order.return_policy?.policy,
                            invoiceNumber: result.order.invoice_number,
                            invoiceUrl: result.order.invoice_url
                          });
                          console.log(`[Tool] Cart cleared. New cart length:`, cartItemsRef.current.length);
                        }
                      } catch (fetchError) {
                        console.error(`[Tool] Checkout fetch error:`, fetchError);
                        result = { status: 'error', message: 'Network error during checkout. Please try again.' };
                      }
                    }
                  }
                  else if (name === "clear_cart") {
                    console.log(`[Tool] Clearing cart...`);
                    const currentCart = cartItemsRef.current;
                    if (currentCart.length === 0) {
                      result = { status: 'empty', message: 'Cart is already empty' };
                    } else {
                      cartItemsRef.current = [];
                      setCartItems([]);
                      result = { status: 'success', message: 'Cart cleared successfully' };
                    }
                  }
                } catch (e) {
                  console.error("[Tool] Execution failed:", e);
                  result = { status: "error", message: "Failed to execute tool" };
                }

                console.log(`[Tool] Execution Result:`, result);

                // Convert result to plain text for Gemini Live API
                let responseText = '';
                if (name === "place_order") {
                  if (result.status === 'success') {
                    responseText = `Order placed successfully! Order ID: ${result.order_id}. Item: ${result.details?.item}, Quantity: ${result.details?.quantity}, Delivery Date: ${result.details?.delivery_date}`;
                  } else {
                    responseText = `Failed to place order: ${result.message}`;
                  }
                } else if (name === "search_order") {
                  if (result.status === 'found') {
                    const order = result.order;
                    responseText = `Order ${order.id} found. Customer: ${order.customer_name}, Product: ${order.product_name}, Quantity: ${order.quantity}, Status: ${order.status}, Delivery Date: ${order.delivery_date}`;
                  } else {
                    responseText = `Order not found`;
                  }
                } else if (name === "cancel_order") {
                  responseText = result.status === 'success' ? 'Order cancelled successfully' : `Failed to cancel: ${result.message}`;
                } else if (name === "check_stock") {
                  if (result.status === 'found' && result.products?.length > 0) {
                    // Always update displayed products with the CURRENT search results
                    console.log(`[Products] Updating display with ${result.products.length} products:`, result.products.map((p: any) => p.name));
                    setDisplayedProducts(result.products.slice(0, 6)); // Show up to 6 products
                    
                    if (result.products.length === 1) {
                      const product = result.products[0];
                      const categoryInfo = product.category_name ? ` [${product.category_name}${product.subcategory_name ? ' > ' + product.subcategory_name : ''}]` : '';
                      const brandInfo = product.brand ? ` by ${product.brand}` : '';
                      const description = product.description ? ` Description: ${product.description}.` : '';
                      responseText = `Product found: ${product.name}${brandInfo}${categoryInfo}. Price: ₹${product.price}, Stock: ${product.stock} units available.${description}`;
                    } else {
                      // Multiple products found - Include descriptions for better context
                      const productList = result.products.map((p: any) => {
                        const brandInfo = p.brand ? ` (${p.brand})` : '';
                        const desc = p.description ? ` - ${p.description}` : '';
                        return `${p.name}${brandInfo}: ₹${p.price}, ${p.stock} in stock${desc}`;
                      }).join('; ');
                      responseText = `Found ${result.products.length} products. THESE ARE ALL THE PRODUCTS - DO NOT ADD MORE: ${productList}. No other products exist in this search. The product cards are being displayed to the user.`;
                    }
                  } else {
                    responseText = result.message || 'Product not found in our inventory';
                    console.log('[Products] Clearing display - no products found');
                    setDisplayedProducts([]); // Clear products if none found
                  }
                } else if (name === "check_refund_status") {
                  if (result.status === 'found') {
                    responseText = `Refund Status: ${result.refund.status}. Amount: ₹${result.refund.amount}. Reason: ${result.refund.reason}`;
                  } else {
                    responseText = result.message;
                  }
                } else if (name === "create_refund_request") {
                  responseText = result.message;
                } else if (name === "apply_discount") {
                  responseText = result.message;
                } else if (name === "generate_invoice") {
                  responseText = result.message;
                } else if (name === "update_shipping_address") {
                  responseText = result.message;
                } else if (name === "schedule_delivery") {
                  responseText = result.message;
                } else if (name === "create_customer_profile") {
                  responseText = result.message;
                } else if (name === "get_customer_details") {
                  if (result.status === 'found') {
                    responseText = `Customer Found: ${result.customer.name}. Saved Address: ${result.customer.address}. Loyalty Points: ${result.customer.loyalty_points}`;
                  } else {
                    responseText = "Customer profile not found.";
                  }
                } else if (name === "submit_feedback") {
                  responseText = result.message;
                } else if (name === "browse_categories") {
                  if (result.categories && result.categories.length > 0) {
                    const categoryList = result.categories.map((c: any) => c.name).join(', ');
                    responseText = `Available categories: ${categoryList}. You can browse products in any of these categories.`;
                  } else {
                    responseText = 'No categories available.';
                  }
                } else if (name === "browse_subcategories") {
                  if (result.subcategories && result.subcategories.length > 0) {
                    const subcatList = result.subcategories.map((s: any) => 
                      s.category_name ? `${s.name} (${s.category_name})` : s.name
                    ).join(', ');
                    responseText = `Available subcategories: ${subcatList}`;
                  } else if (result.status === 'not_found') {
                    responseText = result.message;
                  } else {
                    responseText = 'No subcategories available.';
                  }
                } else if (name === "view_cart") {
                  if (result.status === 'found' || result.status === 'success') {
                    const itemsList = result.items.map((item: any) => 
                      `${item.name} (Qty: ${item.quantity}, ₹${item.price} each)`
                    ).join(', ');
                    responseText = `Shopping cart contains ${result.item_count} items: ${itemsList}. Total: ₹${result.total}. This is the cart, not an order yet.`;
                  } else if (result.status === 'empty') {
                    responseText = 'The shopping cart is empty. No items have been added yet. Would you like to browse products or add something to your cart?';
                  } else {
                    responseText = 'Unable to retrieve cart contents.';
                  }
                } else if (name === "add_to_cart") {
                  if (result.status === 'success') {
                    responseText = result.message;
                  } else {
                    responseText = `Failed to add to cart: ${result.message}`;
                  }
                } else if (name === "remove_from_cart") {
                  if (result.status === 'success') {
                    responseText = result.message;
                  } else {
                    responseText = `Failed to remove from cart: ${result.message}`;
                  }
                } else if (name === "update_cart_quantity") {
                  if (result.status === 'success') {
                    responseText = result.message;
                  } else {
                    responseText = `Failed to update quantity: ${result.message}`;
                  }
                } else if (name === "checkout_cart") {
                  if (result.status === 'success') {
                    const order = result.order;
                    // Show order confirmation UI
                    setOrderConfirmation({
                      show: true,
                      orderId: order.order_id,
                      deliveryDate: order.expected_delivery,
                      totalAmount: order.total,
                      itemCount: order.item_count,
                      returnPolicy: order.return_policy?.policy,
                      invoiceNumber: order.invoice_number,
                      invoiceUrl: order.invoice_url
                    });
                    // Clear the cart after successful checkout
                    cartItemsRef.current = [];
                    setCartItems([]);
                    responseText = `Order placed successfully! Your Order ID is ${order.order_id}. Total amount: ₹${order.total} for ${order.item_count} items. Expected delivery date: ${order.expected_delivery}. Your invoice has been generated with invoice number ${order.invoice_number}. You can download it from the order confirmation popup. Return policy: ${order.return_policy?.policy || '30-day return policy'}. Thank you for shopping with us!`;
                  } else {
                    responseText = `Checkout failed: ${result.message}`;
                  }
                } else if (name === "clear_cart") {
                  responseText = result.message || 'Cart has been cleared.';
                }

                // Send Tool Response
                if (sessionPromiseRef.current) {
                  console.log("[Tool] Sending response to Gemini:", responseText);
                  try {
                    const session = await sessionPromiseRef.current;
                    await session.sendToolResponse({
                      functionResponses: [{
                        id: functionCall.id,
                        name: name,  // Required by Gemini Live API
                        response: {
                          result: responseText
                        }
                      }]
                    });
                    console.log("[Tool] Response sent successfully!");
                  } catch (err) {
                    console.error("[Tool] Failed to send response:", err);
                  }
                } else {
                  console.error("[Tool] Session Promise is null!");
                }
              }
            }

            // Handle Gemini Native Audio (Low Latency)
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                  const pcmData = part.inlineData.data;
                  if (pcmData) {
                    updateBotSpeaking(true); // Bot is speaking
                    playPCMChunk(pcmData);
                  }
                }
              }
            }

            // Handle Transcription
            const outputTx = message.serverContent?.outputTranscription;
            // inputTx already checked above for product clearing

            if (outputTx?.text) {
              // Strip markdown to ensure clean TTS
              const textChunk = outputTx.text.replace(/[\*\[\]]/g, '');
              currentOutputTranscriptionRef.current += textChunk;
              addMessage('model', currentOutputTranscriptionRef.current, false);

              // Low Latency Streaming: Accumulate text and split by sentence
              ttsBufferRef.current += textChunk;

              // Aggressive streaming regex: Match sentence endings followed by whitespace OR end-of-string.
              const sentenceRegex = /(.+?[.!?])(?:\s+|$)/;
              const fallbackRegex = /(.+?[,;])(?:\s+|$)/;

              while (true) {
                let match = ttsBufferRef.current.match(sentenceRegex);

                // Safety valve: if buffer is too long (>50 chars), accept commas/semicolons to avoid stalling
                if (!match && ttsBufferRef.current.length > 50) {
                  match = ttsBufferRef.current.match(fallbackRegex);
                }

                if (match) {
                  const sentence = match[1].trim();
                  const fullMatchLength = match[0].length;
                  ttsBufferRef.current = ttsBufferRef.current.slice(fullMatchLength).trimStart();

                  if (sentence) {
                    enqueueAudio(sentence); // Calls Murf in background for compliance
                  }
                } else {
                  break;
                }
              }
            }

            // Handle user input transcription (inputTxStart already used above for clearing products)
            if (inputTxStart?.text) {
              currentInputTranscriptionRef.current += inputTxStart.text;
              addMessage('user', currentInputTranscriptionRef.current, false);
            }

            // Handle Turn Complete
            if (message.serverContent?.turnComplete) {
              updateBotSpeaking(false); // Bot finished speaking
              
              // Finalize user message
              if (currentInputTranscriptionRef.current) {
                addMessage('user', currentInputTranscriptionRef.current, true);
                currentInputTranscriptionRef.current = '';
              }
              // Finalize model message
              if (currentOutputTranscriptionRef.current) {
                addMessage('model', currentOutputTranscriptionRef.current, true);
                currentOutputTranscriptionRef.current = '';
              }

              // Flush any remaining text in the buffer (e.g., the final sentence)
              if (ttsBufferRef.current.trim().length > 0) {
                enqueueAudio(ttsBufferRef.current);
                ttsBufferRef.current = '';
              }
            }
          },
          onclose: () => {
            console.log('Session closed');
            updateConnectionState(ConnectionState.DISCONNECTED);
            setIsSynthesizing(false);
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setError("Connection encountered an error.");
            updateConnectionState(ConnectionState.ERROR);
            setIsSynthesizing(false);
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Kore"
              }
            }
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: tools, // Add tools here
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        }
      });

      sessionPromiseRef.current = sessionPromise;

    } catch (e: any) {
      console.error(e);
      updateConnectionState(ConnectionState.ERROR);
      setError(`Failed to initialize: ${e.message}`);
      setIsSynthesizing(false);
    }
  };

  const disconnect = () => {
    console.log('[Disconnect] Starting cleanup...');
    
    // 1. Close session first (stops any incoming audio)
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => {
        try {
          session.close();
        } catch (e) {
          console.warn('[Disconnect] Session close error:', e);
        }
      }).catch(e => console.warn('[Disconnect] Session promise error:', e));
      sessionPromiseRef.current = null;
    }

    // 2. Stop and disconnect input worklet
    if (inputWorkletNodeRef.current) {
      try {
        inputWorkletNodeRef.current.disconnect();
      } catch (e) {
        console.warn('[Disconnect] Worklet disconnect error:', e);
      }
      inputWorkletNodeRef.current = null;
    }

    // 3. Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    // 4. Close input audio context
    if (inputAudioContextRef.current) {
      try {
        if (inputAudioContextRef.current.state !== 'closed') {
          inputAudioContextRef.current.close();
        }
      } catch (e) {
        console.warn('[Disconnect] Input context close error:', e);
      }
      inputAudioContextRef.current = null;
    }

    // 5. Close playback audio context
    if (playbackAudioContextRef.current) {
      try {
        if (playbackAudioContextRef.current.state !== 'closed') {
          playbackAudioContextRef.current.close();
        }
      } catch (e) {
        console.warn('[Disconnect] Playback context close error:', e);
      }
      playbackAudioContextRef.current = null;
    }

    // 6. Stop any current HTML5 audio playback
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.src = '';
      } catch (e) {
        console.warn('[Disconnect] Audio element cleanup error:', e);
      }
      currentAudioRef.current = null;
    }

    // 7. Clear audio queue and buffers
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    ttsBufferRef.current = '';
    nextPlayTimeRef.current = 0;

    // 8. Clear transcription buffers
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';

    console.log('[Disconnect] Cleanup complete');
    updateConnectionState(ConnectionState.DISCONNECTED);
    setIsSynthesizing(false);
  };

  const handleToggleConnection = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-screen bg-charcoal-900 text-white font-sans overflow-hidden">
      {/* Light Rays Background Effect */}
      <div className="fixed inset-0 pointer-events-none opacity-50">
        <LightRays
          raysOrigin="top-center"
          raysColor="#00d9ff"
          raysSpeed={0.6}
          lightSpread={0.2}
          rayLength={0.9}
          fadeDistance={0.6}
          saturation={1.0}
          followMouse={true}
          mouseInfluence={0.25}
          noiseAmount={0.03}
          distortion={0.01}
          pulsating={false}
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-3 border-b border-white/5 backdrop-blur-xl bg-charcoal-900/50">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-copper-400 to-copper-600 flex items-center justify-center shadow-lg shadow-copper-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
              <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
            </svg>
          </div>
          <div>
            <h1 className="font-semibold text-base tracking-tight text-white font-heading">क्रेता-बन्धु</h1>
            <p className="text-[10px] text-copper-400/70">AI Support Agent</p>
          </div>
        </button>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-charcoal-800/50 border border-charcoal-700/50">
            <span className={`w-2 h-2 rounded-full ${
              connectionState === ConnectionState.CONNECTED 
                ? 'bg-copper-400 shadow-lg shadow-copper-400/50 animate-pulse' 
                : connectionState === ConnectionState.CONNECTING
                  ? 'bg-copper-500 animate-pulse'
                  : 'bg-charcoal-700'
            }`} />
            <span className="text-xs font-medium text-copper-300/70 uppercase tracking-wider">
              {connectionState === ConnectionState.CONNECTED ? 'Live' : connectionState === ConnectionState.CONNECTING ? 'Connecting' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Cart - Below Navbar, in corner - Hidden when products are displayed */}
      <div className={`absolute top-[60px] right-4 transition-all duration-300 ${
        displayedProducts.length > 0 ? 'z-10 opacity-50 pointer-events-none' : 'z-30'
      }`}>
        <PopUpCart
          items={cartItems}
          isOpen={isCartOpen}
          onToggle={handleToggleCart}
          onRemoveItem={handleRemoveFromCart}
          onUpdateQuantity={handleUpdateCartQuantity}
          disabled={displayedProducts.length > 0}
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col overflow-hidden">
        {/* Top Section - Voice Orb with Context */}
        <div className="flex-shrink-0 h-[55%] flex flex-col items-center justify-center relative px-8 pt-4">
          {/* Decorative rings around orb */}
          <div className="absolute w-[340px] h-[340px] rounded-full border border-copper-500/10 animate-pulse-slow" />
          <div className="absolute w-[380px] h-[380px] rounded-full border border-copper-500/5" />
          
          {/* Glow Effects Behind Orb */}
          <div className={`absolute w-72 h-72 rounded-full transition-all duration-700 ${
            connectionState === ConnectionState.CONNECTED 
              ? 'bg-copper-500/25 blur-3xl scale-110' 
              : 'bg-copper-500/10 blur-2xl scale-100'
          }`} />

          {/* Voice Powered Orb - Clickable with mic icon */}
          <button 
            onClick={handleToggleConnection}
            className="w-80 h-80 relative cursor-pointer group"
          >
            <VoicePoweredOrb 
              enableVoiceControl={connectionState === ConnectionState.CONNECTED}
              voiceSensitivity={2.0}
              maxRotationSpeed={1.5}
              maxHoverIntensity={0.9}
              className="rounded-full overflow-hidden"
            />
            
            {/* Mic Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`transition-all duration-500 ${
                connectionState === ConnectionState.CONNECTED 
                  ? 'opacity-30 scale-90' 
                  : connectionState === ConnectionState.CONNECTING
                    ? 'opacity-50 scale-95 animate-pulse'
                    : 'opacity-60 group-hover:opacity-80 group-hover:scale-110'
              }`}>
                {connectionState === ConnectionState.CONNECTING ? (
                  <svg className="animate-spin w-16 h-16 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : connectionState === ConnectionState.CONNECTED ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-14 h-14 text-white drop-shadow-lg">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-16 h-16 text-white drop-shadow-2xl">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                )}
              </div>
            </div>
          </button>

          {/* Status Text - Below the orb */}
          <div className="mt-4 text-center">
            <p className={`text-base font-medium transition-colors font-heading ${
              connectionState === ConnectionState.CONNECTED 
                ? isBotSpeaking ? 'text-cyan-400' : 'text-copper-400/80'
                : 'text-copper-500/50'
            }`}>
              {connectionState === ConnectionState.CONNECTED 
                ? isBotSpeaking ? 'Speaking...' : 'Listening...'
                : connectionState === ConnectionState.CONNECTING 
                  ? 'Connecting...' 
                  : 'Ready to assist'}
            </p>
            <p className="text-[11px] text-copper-500/60 mt-1">
              {connectionState === ConnectionState.CONNECTED 
                ? 'Speak naturally, I\'m here to help'
                : 'Click the orb to start'}
            </p>
          </div>
        </div>

        {/* Product Cards Display Section */}
        {displayedProducts.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 relative z-20 max-w-full overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-md bg-cyan-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 text-cyan-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              </div>
              <span className="text-[11px] font-medium text-cyan-300/80">Products Found</span>
              <span className="text-[10px] text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">{displayedProducts.length}</span>
            </div>
            <ProductGrid 
              products={displayedProducts} 
              onClose={() => setDisplayedProducts([])}
              onAddToCart={handleAddToCart}
            />
          </div>
        )}

        {/* Bottom Section - Chat Window */}
        <div className="flex-1 flex flex-col overflow-hidden mx-6 mb-4 rounded-2xl bg-charcoal-800/20 backdrop-blur-sm">
          {/* Chat Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-charcoal-700/20">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-copper-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5 text-copper-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <span className="text-xs font-medium text-copper-300/80">Conversation Transcript</span>
              {messages.length > 0 && (
                <span className="text-[10px] text-charcoal-700 bg-charcoal-800 px-1.5 py-0.5 rounded-full">{messages.length}</span>
              )}
            </div>
            {messages.length > 0 && (
              <button 
                onClick={() => setMessages([])}
                className="text-[10px] text-copper-500/50 hover:text-copper-400 transition-colors px-2 py-1 rounded hover:bg-charcoal-800/50"
              >
                Clear
              </button>
            )}
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-charcoal-700 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-charcoal-800/50 flex items-center justify-center border border-charcoal-700/30">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-6 h-6 text-copper-500/30">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs text-copper-500/40">No messages yet</p>
                  <p className="text-[10px] text-charcoal-700 mt-1">Start a conversation to see the transcript</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-copper-500 to-copper-600 text-white rounded-br-sm'
                        : 'bg-cyan-500/60 text-white rounded-bl-sm'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[9px] uppercase tracking-wider font-semibold ${
                        msg.role === 'user' ? 'text-copper-200' : 'text-cyan-100'
                      }`}>
                        {msg.role === 'user' ? 'You' : 'क्रेता-बन्धु'}
                      </span>
                      {!msg.isFinal && (
                        <span className="flex gap-0.5">
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <span className="w-1 h-1 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </main>

      {/* Error Banner */}
      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 bg-red-900/90 border border-red-700/50 text-red-100 px-4 py-3 rounded-xl shadow-lg text-sm z-50 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <p className="font-medium text-xs">Connection Error</p>
              <p className="text-red-200 text-[10px] mt-0.5">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-300 hover:text-white transition-colors ml-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {orderConfirmation?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="relative bg-charcoal-900 border border-charcoal-700 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="white" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-white text-center mb-2">Order Placed!</h2>
            <p className="text-charcoal-400 text-center mb-6">Your order has been successfully placed.</p>
            
            {/* Order Details */}
            <div className="bg-charcoal-800/50 rounded-xl p-4 space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400 text-sm">Order ID</span>
                <span className="text-cyan-400 font-mono font-semibold">#{orderConfirmation.orderId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400 text-sm">Items</span>
                <span className="text-white font-medium">{orderConfirmation.itemCount} item{orderConfirmation.itemCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-charcoal-400 text-sm">Total Amount</span>
                <span className="text-emerald-400 font-bold text-lg">₹{orderConfirmation.totalAmount?.toLocaleString()}</span>
              </div>
              <div className="border-t border-charcoal-700 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-charcoal-400 text-sm">Expected Delivery</span>
                  <span className="text-white font-medium">{orderConfirmation.deliveryDate}</span>
                </div>
              </div>
              {orderConfirmation.returnPolicy && (
                <div className="flex justify-between items-center">
                  <span className="text-charcoal-400 text-sm">Return Policy</span>
                  <span className="text-amber-400 text-xs max-w-[180px] text-right">{orderConfirmation.returnPolicy}</span>
                </div>
              )}
              {orderConfirmation.invoiceNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-charcoal-400 text-sm">Invoice No.</span>
                  <span className="text-white font-mono text-xs">{orderConfirmation.invoiceNumber}</span>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-3">
              {orderConfirmation.invoiceUrl && (
                <a 
                  href={`http://localhost:3005${orderConfirmation.invoiceUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-3 rounded-xl bg-charcoal-700 hover:bg-charcoal-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Download Invoice
                </a>
              )}
              <button 
                onClick={() => setOrderConfirmation(null)}
                className={`${orderConfirmation.invoiceUrl ? 'flex-1' : 'w-full'} py-3 rounded-xl bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-400 hover:to-copper-500 text-white font-semibold text-sm transition-all shadow-lg shadow-copper-500/20`}
              >
                Done
              </button>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => setOrderConfirmation(null)}
              className="absolute top-4 right-4 text-charcoal-500 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgentInterface;
