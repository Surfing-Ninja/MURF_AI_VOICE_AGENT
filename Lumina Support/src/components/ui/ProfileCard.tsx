import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import './ProfileCard.css';

interface ProfileCardProps {
  avatarUrl: string;
  name?: string;
  title?: string;
  handle?: string;
  status?: string;
  contactText?: string;
  showUserInfo?: boolean;
  enableTilt?: boolean;
  className?: string;
  onContactClick?: () => void;
}

const ProfileCardComponent: React.FC<ProfileCardProps> = ({
  avatarUrl,
  name = 'Developer',
  title = 'Software Engineer',
  handle = 'dev',
  status = 'Available',
  contactText = 'Contact',
  showUserInfo = true,
  enableTilt = true,
  className = '',
  onContactClick
}) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<number | null>(null);
  const leaveRafRef = useRef<number | null>(null);

  const getOffsets = useCallback((evt: PointerEvent | MouseEvent, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;
    const percentX = (x / rect.width) * 100;
    const percentY = (y / rect.height) * 100;
    const centerX = percentX - 50;
    const centerY = percentY - 50;
    const distance = Math.sqrt(centerX ** 2 + centerY ** 2) / 50;
    return { percentX, percentY, centerX, centerY, distance };
  }, []);

  const handlePointerMove = useCallback(
    (evt: PointerEvent) => {
      if (!enableTilt || !wrapRef.current) return;
      const { percentX, percentY, centerX, centerY, distance } = getOffsets(evt, wrapRef.current);
      
      wrapRef.current.style.setProperty('--pointer-x', `${percentX}%`);
      wrapRef.current.style.setProperty('--pointer-y', `${percentY}%`);
      wrapRef.current.style.setProperty('--pointer-from-center', `${distance}`);
      wrapRef.current.style.setProperty('--pointer-from-top', `${percentY / 100}`);
      wrapRef.current.style.setProperty('--pointer-from-left', `${percentX / 100}`);
      wrapRef.current.style.setProperty('--rotate-x', `${centerX / 5}deg`);
      wrapRef.current.style.setProperty('--rotate-y', `${-centerY / 5}deg`);
      wrapRef.current.style.setProperty('--background-x', `${50 + centerX / 4}%`);
      wrapRef.current.style.setProperty('--background-y', `${50 + centerY / 4}%`);
    },
    [enableTilt, getOffsets]
  );

  const handlePointerEnter = useCallback(() => {
    if (!wrapRef.current || !shellRef.current) return;
    
    if (leaveRafRef.current) {
      cancelAnimationFrame(leaveRafRef.current);
      leaveRafRef.current = null;
    }
    
    wrapRef.current.style.setProperty('--card-opacity', '1');
    shellRef.current.classList.add('entering');
    
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enterTimerRef.current = window.setTimeout(() => {
      shellRef.current?.classList.remove('entering');
    }, 180);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!wrapRef.current || !shellRef.current) return;
    
    wrapRef.current.style.setProperty('--card-opacity', '0');
    wrapRef.current.style.setProperty('--rotate-x', '0deg');
    wrapRef.current.style.setProperty('--rotate-y', '0deg');
    wrapRef.current.style.setProperty('--pointer-x', '50%');
    wrapRef.current.style.setProperty('--pointer-y', '50%');
    wrapRef.current.style.setProperty('--pointer-from-center', '0');
    wrapRef.current.style.setProperty('--pointer-from-top', '0.5');
    wrapRef.current.style.setProperty('--pointer-from-left', '0.5');
    wrapRef.current.style.setProperty('--background-x', '50%');
    wrapRef.current.style.setProperty('--background-y', '50%');
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    wrap.addEventListener('pointermove', handlePointerMove);
    wrap.addEventListener('pointerenter', handlePointerEnter);
    wrap.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      wrap.removeEventListener('pointermove', handlePointerMove);
      wrap.removeEventListener('pointerenter', handlePointerEnter);
      wrap.removeEventListener('pointerleave', handlePointerLeave);
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
      if (leaveRafRef.current) cancelAnimationFrame(leaveRafRef.current);
    };
  }, [handlePointerMove, handlePointerEnter, handlePointerLeave]);

  const handleContactClick = useCallback(() => {
    onContactClick?.();
  }, [onContactClick]);

  return (
    <div ref={wrapRef} className={`pc-card-wrapper ${className}`}>
      <div className="pc-behind"></div>
      <div ref={shellRef} className="pc-card-shell">
        <div className="pc-card">
          <div className="pc-inside"></div>
          <div className="pc-shine"></div>
          <div className="pc-glare"></div>
          <div className="pc-avatar-content">
            <img src={avatarUrl} alt={name} className="avatar" />
          </div>
          <div className="pc-content pc-details">
            <h3>{name}</h3>
            <p>{title}</p>
          </div>
          {showUserInfo && (
            <div className="pc-user-info">
              <div className="pc-user-details">
                <div className="pc-mini-avatar">
                  <img src={avatarUrl} alt={name} />
                </div>
                <div className="pc-user-text">
                  <span className="pc-handle">@{handle}</span>
                  <span className="pc-status">{status}</span>
                </div>
              </div>
              <button className="pc-contact-btn" onClick={handleContactClick}>
                {contactText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProfileCard = React.memo(ProfileCardComponent);
export default ProfileCard;
