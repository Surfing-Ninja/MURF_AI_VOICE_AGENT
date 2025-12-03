import fetch from 'node-fetch';

async function testAPI() {
    try {
        // Test categories
        const catRes = await fetch('http://localhost:3005/api/categories');
        const categories = await catRes.json();
        console.log('\n=== CATEGORIES ===');
        console.log(JSON.stringify(categories, null, 2));

        // Test subcategories
        const subRes = await fetch('http://localhost:3005/api/subcategories');
        const subcategories = await subRes.json();
        console.log('\n=== SUBCATEGORIES ===');
        console.log(`Total: ${subcategories.subcategories.length}`);
        subcategories.subcategories.slice(0, 5).forEach(s => {
            console.log(`  - ${s.name} (Category: ${s.category_name})`);
        });

        // Test products
        const prodRes = await fetch('http://localhost:3005/api/products');
        const products = await prodRes.json();
        console.log('\n=== PRODUCTS ===');
        console.log(`Total products: ${products.products.length}`);
        
        // Group by category
        const byCategory = {};
        products.products.forEach(p => {
            const cat = p.category_name || 'Unknown';
            byCategory[cat] = (byCategory[cat] || 0) + 1;
        });
        console.log('\nProducts per category:');
        Object.entries(byCategory).forEach(([cat, count]) => {
            console.log(`  ${cat}: ${count} products`);
        });

        // Test search
        const searchRes = await fetch('http://localhost:3005/api/products?category=Electronics');
        const electronics = await searchRes.json();
        console.log(`\nElectronics & Gadgets: ${electronics.products.length} products`);
        electronics.products.slice(0, 3).forEach(p => {
            console.log(`  - ${p.name} (${p.brand}) - ₹${p.price}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testAPI();
