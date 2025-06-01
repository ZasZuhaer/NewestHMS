import { useEffect, useState } from 'react';

export function useIsSmallScreen(breakpoint = 1280) {
  const [isSmallScreen, setIsSmallScreen] = useState(() => window.innerWidth <= breakpoint);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth <= breakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [breakpoint]);

  return isSmallScreen;
}
