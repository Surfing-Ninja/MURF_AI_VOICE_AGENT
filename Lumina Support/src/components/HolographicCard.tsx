import React from 'react';
import { cn } from '../utils/cn';
import { GlowingEffect } from './GlowingEffect';

interface HolographicCardProps {
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
    title?: string;
}

const HolographicCard: React.FC<HolographicCardProps> = ({ children, className = '', icon, title }) => {
    return (
        <div className={cn("relative h-full rounded-[1.25rem] border-[0.75px] border-white/10 p-2 md:rounded-[1.5rem] md:p-3", className)}>
            <GlowingEffect
                spread={40}
                glow={true}
                disabled={false}
                proximity={64}
                inactiveZone={0.01}
                borderWidth={3}
            />
            <div className="relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border-[0.75px] border-white/5 bg-charcoal-800/50 backdrop-blur-xl p-6 shadow-sm">
                <div className="relative flex flex-1 flex-col justify-between gap-3">
                    {icon && (
                        <div className="w-fit rounded-lg border-[0.75px] border-white/10 bg-white/5 p-2 text-copper-400">
                            {icon}
                        </div>
                    )}
                    <div className="space-y-3">
                        {title && (
                            <h3 className="pt-0.5 text-xl leading-[1.375rem] font-semibold font-heading tracking-[-0.04em] md:text-2xl md:leading-[1.875rem] text-white">
                                {title}
                            </h3>
                        )}
                        <div className="font-sans text-sm leading-[1.125rem] md:text-base md:leading-[1.375rem] text-slate-400">
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HolographicCard;
