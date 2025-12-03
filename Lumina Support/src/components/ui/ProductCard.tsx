import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  category_id?: number;
  subcategory_id?: number;
  brand?: string;
  image_url?: string;
  category_name?: string;
  subcategory_name?: string;
}

interface ProductCardProps {
  product: Product;
  onClose?: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
}

// Inline ClickSpark for Add to Cart button
interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

const useClickSpark = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const sparksRef = useRef<Spark[]>([]);
  
  const easeOut = (t: number) => t * (2 - t);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const sparkColor = '#00d9ff';
    const sparkSize = 12;
    const sparkRadius = 40;
    const duration = 500;

    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) return false;

        const progress = elapsed / duration;
        const eased = easeOut(progress);

        const distance = eased * sparkRadius;
        const lineLength = sparkSize * (1 - eased);
        const opacity = 1 - eased;

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = sparkColor;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });

      ctx.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [canvasRef]);

  const triggerSpark = useCallback((x: number, y: number) => {
    const now = performance.now();
    const sparkCount = 10;
    const newSparks: Spark[] = Array.from({ length: sparkCount }, (_, i) => ({
      x,
      y,
      angle: (2 * Math.PI * i) / sparkCount,
      startTime: now
    }));
    sparksRef.current.push(...newSparks);
  }, []);

  return { triggerSpark };
};

export const ProductCard: React.FC<ProductCardProps> = ({ product, onClose, onAddToCart }) => {
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { triggerSpark } = useClickSpark(canvasRef);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!onAddToCart || product.stock === 0) return;
    
    // Trigger spark animation
    const rect = buttonRef.current?.getBoundingClientRect();
    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (rect && canvasRect) {
      const x = rect.left + rect.width / 2 - canvasRect.left;
      const y = rect.top + rect.height / 2 - canvasRect.top;
      triggerSpark(x, y);
    }

    setIsAdding(true);
    onAddToCart(product, quantity);
    
    setTimeout(() => {
      setIsAdding(false);
      setQuantity(1);
    }, 600);
  };

  const incrementQuantity = () => {
    if (quantity < product.stock) {
      setQuantity(q => q + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(q => q - 1);
    }
  };

  return (
    <div className="min-h-fit flex items-center justify-center relative overflow-hidden font-sans">
      {/* Background Decorative Spheres */}
      <div className="absolute top-[-5%] right-[10%] w-64 h-64 rounded-full bg-gradient-to-b from-[#00d9ff20] to-[#00d9ff10] blur-sm opacity-80" />
      <div className="absolute top-[25%] left-[15%] w-24 h-24 rounded-full bg-gradient-to-b from-[#00d9ff30] to-[#00d9ff20] shadow-lg" />
      <div className="absolute bottom-[10%] left-[20%] w-32 h-32 rounded-full bg-gradient-to-b from-[#00d9ff15] to-[#00d9ff10] blur-md opacity-90" />
      <div className="absolute top-[45%] right-[25%] w-12 h-12 rounded-full bg-gradient-to-b from-[#00d9ff30] to-[#00d9ff20] shadow-sm" />
      <div className="absolute bottom-[-5%] right-[20%] w-48 h-48 rounded-full bg-[#00d9ff15] opacity-50 blur-xl" />

      {/* Main Card Component */}
      <div className="relative z-10 w-[340px] bg-gradient-to-b from-charcoal-800/95 to-charcoal-900/95 backdrop-blur-xl rounded-[40px] shadow-[0_30px_60px_-15px_rgba(0,217,255,0.3)] overflow-hidden transition-transform hover:scale-[1.02] duration-300 ease-out border border-cyan-500/20">
        
        {/* Close Button */}
        {onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-charcoal-900/80 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Card Header / Image Area */}
        <div className="h-72 bg-gradient-to-br from-[#00d9ff] to-[#00b8d9] relative flex items-center justify-center overflow-visible">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#00d9ff] to-[#4de8ff]" />
          
          {/* Decorative circles */}
          <div className="absolute top-4 left-4 w-16 h-16 rounded-full bg-white/10 blur-sm" />
          <div className="absolute bottom-8 right-8 w-24 h-24 rounded-full bg-white/5 blur-md" />
          
          {/* Product Image */}
          <div className="relative w-full h-full flex items-end justify-center pb-4">
            <img 
              src={product.image_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'} 
              alt={product.name}
              className="w-48 h-48 object-cover rounded-2xl drop-shadow-2xl hover:rotate-2 transition-transform duration-500 z-20"
              style={{
                filter: "contrast(1.1) saturate(1.1)",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop';
              }}
            />
          </div>
          
          {/* Stock Badge */}
          <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-bold ${
            product.stock > 20 
              ? 'bg-green-500/90 text-white' 
              : product.stock > 0 
                ? 'bg-yellow-500/90 text-charcoal-900' 
                : 'bg-red-500/90 text-white'
          }`}>
            {product.stock > 20 ? 'In Stock' : product.stock > 0 ? `Only ${product.stock} left` : 'Out of Stock'}
          </div>
        </div>

        {/* Card Body */}
        <div className="px-8 pt-6 pb-8">
          
          {/* Brand */}
          {product.brand && (
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1 block">
              {product.brand}
            </span>
          )}

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2 leading-tight">
            {product.name}
          </h2>

          {/* Category Tags */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-cyan-300/80 font-medium mb-4">
            {product.category_name && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                </svg>
                {product.category_name}
              </span>
            )}
            {product.subcategory_name && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                {product.subcategory_name}
              </span>
            )}
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
            {product.description || 'Premium quality product with excellent features and great value.'}
          </p>

          {/* Price Section */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-cyan-400 tracking-tight">
              {formatPrice(product.price)}
            </span>
            <div className="flex items-center gap-1 text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <span className="text-[10px] font-medium">Free Delivery</span>
            </div>
          </div>

          {/* Quantity Selector & Add to Cart */}
          {onAddToCart && (
            <div className="relative pt-4 border-t border-charcoal-700/50">
              {/* Spark Animation Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-50"
                width={340}
                height={120}
              />
              
              <div className="flex items-center gap-3">
                {/* Quantity Selector */}
                <div className="flex items-center bg-charcoal-700/50 rounded-xl border border-charcoal-600/50 overflow-hidden">
                  <button
                    onClick={decrementQuantity}
                    disabled={quantity <= 1}
                    className="w-9 h-9 flex items-center justify-center text-cyan-400 hover:bg-charcoal-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                    </svg>
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-white">{quantity}</span>
                  <button
                    onClick={incrementQuantity}
                    disabled={quantity >= product.stock}
                    className="w-9 h-9 flex items-center justify-center text-cyan-400 hover:bg-charcoal-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  ref={buttonRef}
                  onClick={handleAddToCart}
                  disabled={product.stock === 0 || isAdding}
                  className={`
                    flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm
                    flex items-center justify-center gap-2
                    transition-all duration-300 transform
                    ${product.stock === 0 
                      ? 'bg-charcoal-700/50 text-charcoal-500 cursor-not-allowed' 
                      : isAdding
                        ? 'bg-green-500 text-white scale-95'
                        : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-400 hover:to-cyan-500 hover:shadow-lg hover:shadow-cyan-500/30 active:scale-95'
                    }
                  `}
                >
                  {isAdding ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Added!
                    </>
                  ) : product.stock === 0 ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                      </svg>
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
              
              {/* Stock indicator */}
              <p className="text-[10px] text-charcoal-500 mt-2 text-center">
                {product.stock} units available
              </p>
            </div>
          )}

          {/* Footer: Price only (when no cart functionality) */}
          {!onAddToCart && (
            <div className="flex flex-col items-start pt-4 border-t border-charcoal-700/50">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-green-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                <span className="text-xs text-green-400 font-medium">Free Shipping on orders above ₹499</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Component to display multiple products in a grid
interface ProductGridProps {
  products: Product[];
  onClose?: () => void;
  onAddToCart?: (product: Product, quantity: number) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ products, onClose, onAddToCart }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="relative w-full">
      {/* Close All Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute -top-2 -right-2 z-30 w-8 h-8 rounded-full bg-charcoal-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 hover:bg-cyan-500/20 hover:text-white transition-all shadow-lg"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {products.map((product) => (
          <div key={product.id} className="flex-shrink-0">
            <ProductCard product={product} onAddToCart={onAddToCart} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductCard;
