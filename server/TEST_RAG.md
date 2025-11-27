# RAG Testing Guide

## Start the Server

```bash
cd server
npm start
```

The server will start on `http://localhost:3000` with WebSocket support.

## Test Queries

### Product Queries (Test Product Catalog)
1. **"Do you have iPhone 15 Pro in stock?"**
   - Expected: Should mention it's in stock, price ₹1,34,900, colors available
   
2. **"What's the price of MacBook Air M3?"**
   - Expected: ₹1,14,900, mentions M3 chip, 13.6" display

3. **"Tell me about PlayStation 5"**
   - Expected: Price ₹54,990, mentions limited stock, 4K 120Hz gaming

### Policy Queries (Test Policies)
4. **"What is your refund policy?"**
   - Expected: 30-day money-back guarantee, free pickup

5. **"Do you offer free shipping?"**
   - Expected: Yes, on orders above ₹499

6. **"How long does delivery take?"**
   - Expected: Metro cities 1-3 days, Tier 2 cities 3-5 days

### Offer Queries (Test Festival Offers)
7. **"What are the Diwali offers?"**
   - Expected: Up to 70% off, mentions specific discounts, bank offers

8. **"Do you have bank discounts?"**
   - Expected: HDFC 10%, ICICI 5%, SBI ₹1,500 off

9. **"Can I exchange my old phone?"**
   - Expected: Up to ₹30,000 off, mentions working condition requirement

### Support Queries (Test Procedures & FAQs)
10. **"How do I track my order?"**
    - Expected: 3 methods - website, email link, SMS

11. **"How do I cancel an order?"**
    - Expected: Before shipment - go to My Orders, after shipment - refuse delivery

12. **"What payment methods do you accept?"**
    - Expected: Cards, UPI, Net Banking, COD, EMI

## What to Observe

### In Server Logs:
```
🔍 Querying knowledge base: "What is your refund policy..."
📚 RAG Context: 247 chars
✓ Found 3 relevant context chunks
🧠 GEMINI: "Namaste! We offer a hassle-free 30-day return policy..."
```

### In Client/Voice:
- Agent should provide accurate, context-aware answers
- Should use Hinglish phrases naturally
- Should be concise (under 2-3 sentences)
- Should sound natural and customer-friendly

## Success Criteria

✅ **RAG Working**: Server logs show context retrieval with scores > 0.7  
✅ **Accurate Answers**: Agent provides info from knowledge base  
✅ **Natural Language**: Responses sound conversational in Hinglish  
✅ **Low Latency**: Total response time < 3 seconds  
✅ **Error Handling**: Graceful handling when no context found  

## Troubleshooting

### No Context Retrieved
- Check Pinecone index has vectors (should show in logs)
- Verify PINECONE_API_KEY is set correctly
- Ensure query is relevant to knowledge base content

### Wrong Answers
- Check similarity threshold (default 0.7)
- May need to adjust chunking strategy
- Consider adding more specific content

### Slow Responses
- Embedding generation: ~1-2s per query
- Vector search: ~200-300ms
- Gemini response: ~1-2s
- Total: Should be under 3s

## Test via Voice

Use the client interface:
1. Start client: `cd ../client && npm run dev`
2. Open `http://localhost:5173`
3. Click microphone button
4. Speak test queries naturally
5. Hear agent's voice responses (via Murf TTS)

## Test via Text (Alternative)

If voice testing has issues, test RAG directly:
```bash
# Test RAG service directly
node -e "import('./services/ragService.js').then(m => m.queryContext('What is your refund policy?').then(console.log))"
```

This will show retrieved context without going through full voice pipeline.
