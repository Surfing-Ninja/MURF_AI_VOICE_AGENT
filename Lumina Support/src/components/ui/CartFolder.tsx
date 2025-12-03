import React, { useState } from 'react';
import './CartFolder.css';
import { Product } from './ProductCard';

export interface CartItem extends Product {
  cartQuantity: number;
}

interface CartFolderProps {
  items: CartItem[];
  isOpen: boolean;
  onToggle: () => void;
  onRemoveItem: (productId: number) => void;
  onUpdateQuantity: (productId: number, quantity: number) => void;
  disabled?: boolean;
  size?: number;
  color?: string;
}

const darkenColor = (hex: string, percent: number): string => {
  let color = hex.startsWith('#') ? hex.slice(1) : hex;
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const num = parseInt(color, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.min(255, Math.floor(r * (1 - percent))));
  g = Math.max(0, Math.min(255, Math.floor(g * (1 - percent))));
  b = Math.max(0, Math.min(255, Math.floor(b * (1 - percent))));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
};

const CartFolder: React.FC<CartFolderProps> = ({
  items,
  isOpen,
  onToggle,
  onRemoveItem,
  onUpdateQuantity,
  disabled = false,
  size = 1,
  color = '#00d9ff'
}) => {
  const [paperOffsets, setPaperOffsets] = useState<{ x: number; y: number }[]>(
    Array.from({ length: 3 }, () => ({ x: 0, y: 0 }))
  );

  const folderBackColor = darkenColor(color, 0.12);
  const paper1 = darkenColor('#ffffff', 0.1);
  const paper2 = darkenColor('#ffffff', 0.05);
  const paper3 = '#ffffff';

  const totalItems = items.reduce((sum, item) => sum + item.cartQuantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.price * item.cartQuantity), 0);

  // Get up to 3 items for the papers display
  const displayItems = items.slice(0, 3);

  const handleClick = () => {
    if (!disabled) {
      onToggle();
      if (isOpen) {
        setPaperOffsets(Array.from({ length: 3 }, () => ({ x: 0, y: 0 })));
      }
    }
  };

  const handlePaperMouseMove = (e: React.MouseEvent<HTMLDivElement>, index: number) => {
    if (!isOpen) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = (e.clientX - centerX) * 0.15;
    const offsetY = (e.clientY - centerY) * 0.15;
    setPaperOffsets(prev => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: offsetX, y: offsetY };
      return newOffsets;
    });
  };

  const handlePaperMouseLeave = (index: number) => {
    setPaperOffsets(prev => {
      const newOffsets = [...prev];
      newOffsets[index] = { x: 0, y: 0 };
      return newOffsets;
    });
  };

  const folderStyle: React.CSSProperties = {
    '--folder-color': color,
    '--folder-back-color': folderBackColor,
    '--paper-1': paper1,
    '--paper-2': paper2,
    '--paper-3': paper3
  } as React.CSSProperties;

  const folderClassName = `cart-folder ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''} ${items.length === 0 ? 'empty' : ''}`.trim();
  const scaleStyle: React.CSSProperties = { transform: `scale(${size})` };

  return (
    <div className="relative flex flex-col items-center" style={scaleStyle}>
      {/* Empty message tooltip */}
      {isOpen && items.length === 0 && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-charcoal-800/90 text-cyan-300 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap z-50 animate-in fade-in duration-200">
          Your cart is empty 🛒
        </div>
      )}
      
      {/* Cart badge */}
      {totalItems > 0 && (
        <div className="cart-badge">
          {totalItems > 99 ? '99+' : totalItems}
        </div>
      )}

      <div className={folderClassName} style={folderStyle} onClick={handleClick}>
        <div className="folder__back">
          {/* Papers with cart items */}
          {[0, 1, 2].map((index) => {
            const item = displayItems[index];
            return (
              <div
                key={index}
                className={`cart-paper`}
                onMouseMove={(e) => handlePaperMouseMove(e, index)}
                onMouseLeave={() => handlePaperMouseLeave(index)}
                style={{
                  background: index === 0 ? paper1 : index === 1 ? paper2 : paper3,
                  width: index === 0 ? '70%' : index === 1 ? '80%' : '90%',
                  height: index === 0 ? '80%' : index === 1 ? '70%' : '60%',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {item ? (
                  <>
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="item-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x60?text=📦';
                        }}
                      />
                    ) : (
                      <div className="item-image bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center rounded">
                        <span className="text-xl">📦</span>
                      </div>
                    )}
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">₹{item.price.toLocaleString()}</div>
                    <div className="item-qty">×{item.cartQuantity}</div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full opacity-20">
                    <span className="text-2xl">📄</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Front flaps */}
          <div className="folder__front"></div>
          <div className="folder__front right"></div>
          
          {/* Cart emoji in center */}
          <div className="cart-emoji">🛒</div>
        </div>
      </div>

      {/* Expanded cart details panel - shows when open and has items */}
      {isOpen && items.length > 0 && (
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-72 bg-charcoal-800/95 backdrop-blur-xl rounded-2xl border border-cyan-500/20 shadow-2xl shadow-cyan-500/10 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>🛒</span> Your Cart
            </h3>
            <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
              {totalItems} items
            </span>
          </div>

          {/* Cart items list */}
          <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide mb-3">
            {items.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-charcoal-700/50 hover:bg-charcoal-700/80 transition-colors"
              >
                {/* Product image */}
                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-charcoal-600 to-charcoal-700">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                  )}
                </div>

                {/* Item details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <p className="text-[10px] text-cyan-400 font-semibold">₹{item.price.toLocaleString()}</p>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (item.cartQuantity > 1) {
                        onUpdateQuantity(item.id, item.cartQuantity - 1);
                      } else {
                        onRemoveItem(item.id);
                      }
                    }}
                    className="w-5 h-5 rounded bg-charcoal-600 hover:bg-red-500/50 text-white text-xs flex items-center justify-center transition-colors"
                  >
                    −
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-white">{item.cartQuantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.id, item.cartQuantity + 1)}
                    className="w-5 h-5 rounded bg-charcoal-600 hover:bg-cyan-500/50 text-white text-xs flex items-center justify-center transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total and checkout */}
          <div className="pt-3 border-t border-charcoal-600/50">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs text-charcoal-400">Total</span>
              <span className="text-lg font-bold text-cyan-400">₹{totalPrice.toLocaleString()}</span>
            </div>
            <button className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-semibold text-sm hover:from-cyan-400 hover:to-cyan-500 transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 flex items-center justify-center gap-2">
              <span>Checkout</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartFolder;
