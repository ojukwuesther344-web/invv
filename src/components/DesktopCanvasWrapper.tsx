import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';

interface DesktopCanvasWrapperProps {
  children: React.ReactNode;
  desktopWidth?: number;
}

export default function DesktopCanvasWrapper({ 
  children, 
  desktopWidth = 1200 
}: DesktopCanvasWrapperProps) {
  const [scale, setScale] = useState<number>(() => {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth || document.documentElement.clientWidth || desktopWidth;
    return w < desktopWidth ? w / desktopWidth : 1;
  });

  const [contentHeight, setContentHeight] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Synchronously calculate scale and height on mount and resize
  useLayoutEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || desktopWidth;
      const currentScale = windowWidth < desktopWidth ? windowWidth / desktopWidth : 1;
      setScale(currentScale);

      if (contentRef.current) {
        const height = contentRef.current.scrollHeight || contentRef.current.offsetHeight || 0;
        if (height > 0) {
          setContentHeight(height);
        }
      }
    };

    handleResize();

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && contentRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect?.height || contentRef.current?.scrollHeight || 0;
          if (height > 0) {
            setContentHeight(height);
          }
        }
      });
      resizeObserver.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [desktopWidth]);

  // Periodic safety check for asynchronous data loads (such as Firestore plans/users)
  useEffect(() => {
    const timer = setInterval(() => {
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight || contentRef.current.offsetHeight || 0;
        if (height > 0 && Math.abs(height - contentHeight) > 10) {
          setContentHeight(height);
        }
      }
    }, 500);

    return () => clearInterval(timer);
  }, [contentHeight]);

  // If on desktop screen (width >= desktopWidth), render standard 100% desktop view
  if (scale >= 1) {
    return (
      <div id="desktop-canvas-container" ref={contentRef} className="w-full">
        {children}
      </div>
    );
  }

  // On phone / narrow viewports (e.g. 375x812, 390x844, 414x896), scale desktop canvas proportionally
  const effectiveHeight = contentHeight > 0 ? contentHeight : 2000;
  const scaledHeight = Math.ceil(effectiveHeight * scale);
  const bottomMarginCompensation = -(effectiveHeight * (1 - scale));
  const rightMarginCompensation = -(desktopWidth * (1 - scale));

  return (
    <div
      id="desktop-viewport-scaler-wrapper"
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        position: 'relative',
        minHeight: `${scaledHeight}px`,
        height: `${scaledHeight}px`,
      }}
    >
      <div
        id="desktop-canvas-inner"
        ref={contentRef}
        style={{
          width: `${desktopWidth}px`,
          minWidth: `${desktopWidth}px`,
          maxWidth: `${desktopWidth}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          marginBottom: `${bottomMarginCompensation}px`,
          marginRight: `${rightMarginCompensation}px`,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
