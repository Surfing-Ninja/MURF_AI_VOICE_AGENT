import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion';
import { ShoppingCart, X, CreditCard, Trash2, Plus, Minus } from 'lucide-react';
import { Product } from './ProductCard';

export interface CartItem extends Product {
  cartQuantity: number;
}

interface PopUpCartProps {
  items: CartItem[];
  isOpen: boolean;
  onToggle: () => void;
  onRemoveItem: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  disabled?: boolean;
}

const CARD_HEIGHT = 85;
const VISIBLE_HEIGHT = 340;
const SCROLL_BAR_HEIGHT = 128;

const PopUpCart: React.FC<PopUpCartProps> = ({
  items,
  isOpen,
  onToggle,
  onRemoveItem,
  onUpdateQuantity,
  disabled = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const scrollY = useMotionValue(0);
  const smoothScrollY = useSpring(scrollY, { stiffness: 300, damping: 30 });
  
  const totalContentHeight = items.length * CARD_HEIGHT;
  const maxScroll = Math.max(0, totalContentHeight - VISIBLE_HEIGHT);
  const progressBarPercentage = Math.min(1, VISIBLE_HEIGHT / totalContentHeight);
  const scrollThumbMaxTravel = SCROLL_BAR_HEIGHT - (SCROLL_BAR_HEIGHT * progressBarPercentage);

  const scrollIndicatorY = useTransform(
    smoothScrollY, 
    [0, maxScroll], 
    [0, scrollThumbMaxTravel]
  );

  const totalItems = items.reduce((sum, item) => sum + item.cartQuantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  const handleToggle = () => {
    if (!disabled) {
      onToggle();
      if (!isOpen) scrollY.set(0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!isOpen || !container) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      
      const current = scrollY.get();
      const newY = current + e.deltaY;
      
      const limit = maxScroll + 40;
      scrollY.set(Math.max(0, Math.min(newY, limit)));
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    
    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [isOpen, maxScroll, scrollY]);

  return (
    <div className="relative flex flex-col items-end justify-start">
      
      {/* Trigger Button */}
      <div className={`z-50 relative group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Item Count Badge */}
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: isOpen ? 0 : (totalItems > 0 ? 1 : 0) }}
          className="absolute -top-2 -right-2 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-charcoal-900 z-50 shadow-lg"
          style={{ 
            background: 'linear-gradient(135deg, #c87d4a, #a65f32)',
            boxShadow: '0 4px 12px rgba(200, 125, 74, 0.4)'
          }}
        >
          {totalItems > 99 ? '99+' : totalItems}
        </motion.div>

        <motion.button
          onClick={handleToggle}
          layout
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.9 }}
          className={`
            relative w-16 h-16 rounded-2xl flex items-center justify-center shadow-2xl transition-colors duration-300
            ${isOpen 
              ? 'text-white' 
              : 'bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700/50'
            }
          `}
          style={isOpen ? {
            background: 'linear-gradient(135deg, #c87d4a, #a65f32)',
            boxShadow: '0 8px 24px rgba(200, 125, 74, 0.4)'
          } : {
            color: '#c87d4a'
          }}
        >
          <motion.div
            animate={{ 
              rotate: isOpen ? 180 : 0,
              scale: isOpen ? 1.1 : 1
            }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {isOpen ? <X size={28} /> : <ShoppingCart size={28} />}
          </motion.div>
        </motion.button>
        
        {/* Hover Label */}
        <motion.p 
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-center text-charcoal-500 text-[10px] font-medium whitespace-nowrap"
          animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : -5 }}
        >
          {isOpen ? "Close" : "Cart"}
        </motion.p>
      </div>

      {/* Scrollable Container Area - Opens to the LEFT of the button */}
      <div 
        ref={containerRef}
        className="absolute top-20 right-0 w-72 flex flex-col items-center"
      >
        {/* Viewport Mask */}
        <motion.div 
          className="relative w-full overflow-hidden px-2 pb-8"
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: isOpen ? VISIBLE_HEIGHT : 0,
            opacity: isOpen ? 1 : 0
          }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          style={{ 
            maskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 85%, transparent 100%)'
          }}
        >
          <AnimatePresence>
            {isOpen && items.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-40 text-charcoal-500"
              >
                <ShoppingCart size={48} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">Your cart is empty</p>
                <p className="text-xs mt-1 opacity-60">Add some products!</p>
              </motion.div>
            )}
            
            {isOpen && items.map((item, index) => (
              <ScrollableProductCard 
                key={item.id} 
                item={item} 
                index={index} 
                total={items.length}
                scrollY={smoothScrollY}
                onRemove={() => onRemoveItem(item.id)}
                onUpdateQuantity={(qty) => onUpdateQuantity(item.id, qty)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
        
        {/* Scroll Progress Bar - on LEFT side */}
        <AnimatePresence>
          {isOpen && items.length > 4 && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute left-[-10px] top-4 w-1 h-32 rounded-full bg-charcoal-800 overflow-hidden"
            >
              <motion.div 
                className="w-full bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full"
                style={{ 
                  height: `${progressBarPercentage * 100}%`,
                  y: scrollIndicatorY
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Total & Checkout Section */}
        <AnimatePresence>
          {isOpen && items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ delay: 0.1 }}
              className="w-full mt-2 px-2"
            >
              <div className="bg-charcoal-800/90 backdrop-blur-xl rounded-2xl border border-charcoal-700/50 p-4 shadow-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-charcoal-400 uppercase tracking-wider">Total</span>
                  <span className="text-xl font-bold text-cyan-400">₹{totalPrice.toLocaleString()}</span>
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 flex items-center justify-center gap-2"
                >
                  <CreditCard size={16} />
                  <span>Checkout</span>
                </motion.button>
                <p className="text-[10px] text-charcoal-500 text-center mt-2">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Individual Card with Position-Based Scaling
interface ScrollableProductCardProps {
  item: CartItem;
  index: number;
  total: number;
  scrollY: any;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

const ScrollableProductCard: React.FC<ScrollableProductCardProps> = ({ 
  item, 
  index, 
  total, 
  scrollY,
  onRemove,
  onUpdateQuantity
}) => {
  const basePosition = index * CARD_HEIGHT;
  
  const y = useTransform(scrollY, (value: number) => basePosition - value);
  const scale = useTransform(y, [-100, 0, 300], [0.8, 1, 0.9]);
  const opacity = useTransform(y, [-80, 0, 280, 350], [0, 1, 1, 0]);

  const getCategoryColor = (category?: string) => {
    const colors: Record<string, string> = {
      'Electronics': 'from-cyan-500/20 to-cyan-600/20 border-cyan-500/30',
      'Accessories': 'from-violet-500/20 to-violet-600/20 border-violet-500/30',
      'Wearables': 'from-amber-500/20 to-amber-600/20 border-amber-500/30',
      'Audio': 'from-rose-500/20 to-rose-600/20 border-rose-500/30',
      'Gaming': 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30',
      'default': 'from-charcoal-600/50 to-charcoal-700/50 border-charcoal-600/30'
    };
    return colors[category || 'default'] || colors['default'];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, x: -20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      transition={{ 
        type: "spring",
        stiffness: 250,
        damping: 20,
        delay: index * 0.05 
      }}
      style={{
        y,
        scale,
        opacity,
        zIndex: total - index,
        transformOrigin: "top center",
        position: 'absolute',
        top: 0, 
        left: 0, 
        right: 0
      }}
      className="h-20 w-full bg-charcoal-800/95 backdrop-blur-sm rounded-xl border border-charcoal-700/50 shadow-xl overflow-hidden flex items-center p-3 group"
    >
      {/* Product Image */}
      <div className={`w-14 h-14 rounded-lg bg-gradient-to-br ${getCategoryColor(item.category_name)} border flex items-center justify-center mr-3 shrink-0 overflow-hidden`}>
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : (
          <span className="text-2xl">📦</span>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium text-sm truncate">{item.name}</h3>
        <p className="text-cyan-400 text-xs font-semibold mt-0.5">₹{item.price.toLocaleString()}</p>
        
        {/* Quantity Controls - Always visible */}
        <div className="flex items-center gap-1 mt-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (item.cartQuantity > 1) {
                onUpdateQuantity(item.cartQuantity - 1);
              } else {
                onRemove();
              }
            }}
            className="w-5 h-5 rounded bg-charcoal-700 hover:bg-red-500/30 text-charcoal-400 hover:text-red-400 flex items-center justify-center transition-colors"
          >
            <Minus size={10} />
          </button>
          <span className="w-6 text-center text-xs font-bold text-white">{item.cartQuantity}</span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onUpdateQuantity(item.cartQuantity + 1);
            }}
            className="w-5 h-5 rounded bg-charcoal-700 hover:bg-cyan-500/30 text-charcoal-400 hover:text-cyan-400 flex items-center justify-center transition-colors"
          >
            <Plus size={10} />
          </button>
        </div>
      </div>

      {/* Remove Button */}
      <div className="flex gap-1 pl-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="p-1.5 rounded-full hover:bg-red-500/20 text-charcoal-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-charcoal-800/30 pointer-events-none" />
    </motion.div>
  );
};

export default PopUpCart;
