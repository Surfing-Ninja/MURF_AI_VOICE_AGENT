// Test Deepgram Connection
import 'dotenv/config';
import { createClient } from '@deepgram/sdk';

console.log('🧪 Testing Deepgram Connection...\n');

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

console.log('✓ Deepgram client created');
console.log(`✓ API Key: ${process.env.DEEPGRAM_API_KEY.substring(0, 10)}...`);

// Test live connection
console.log('\n📡 Creating live connection...');

const connection = deepgram.listen.live({
  model: 'nova-2',
  smart_format: true,
  interim_results: true,
  language: 'en-US',
  channels: 1
});

connection.on('open', () => {
  console.log('✅ Connection opened successfully!');
  console.log('   Ready state:', connection.getReadyState());
  
  // Close after successful connection
  setTimeout(() => {
    connection.finish();
    console.log('\n✓ Test completed successfully!');
    process.exit(0);
  }, 2000);
});

connection.on('error', (error) => {
  console.error('❌ Connection error:', error);
  console.error('   Error type:', error.type);
  console.error('   Error message:', error.message || 'No message');
  process.exit(1);
});

connection.on('close', (event) => {
  console.log('🔌 Connection closed');
  console.log('   Code:', event?.code);
  console.log('   Reason:', event?.reason || 'No reason provided');
});

connection.on('Warning', (warning) => {
  console.warn('⚠️  Warning:', warning);
});

connection.on('Metadata', (metadata) => {
  console.log('📊 Metadata received:', metadata);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('\n❌ Connection timeout - no response from Deepgram');
  process.exit(1);
}, 10000);
