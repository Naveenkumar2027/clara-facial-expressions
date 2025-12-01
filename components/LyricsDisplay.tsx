import React, { useEffect, useRef } from 'react';

interface LyricsDisplayProps {
  currentInput: string;
  history: { text: string; isUser: boolean }[];
}

const LyricsDisplay: React.FC<LyricsDisplayProps> = ({ currentInput, history }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [currentInput, history]);

  // We only want to show the last few lines to keep it "small"
  // Filter history to only show user input if we strictly only want user text history too? 
  // The prompt said "remove the output text functionality". Usually implies hiding bot text entirely.
  const visibleHistory = history
    .filter(item => item.isUser) // Only show user history
    .slice(-2); 

  return (
    <div 
      ref={containerRef}
      className="w-full max-w-md h-32 flex flex-col items-center justify-end overflow-hidden text-center space-y-2 pointer-events-none"
    >
      {/* Faded History */}
      {visibleHistory.map((item, index) => (
        <p key={index} className="text-white/30 text-xs md:text-sm font-light transition-opacity duration-500">
          {item.text}
        </p>
      ))}

      {/* Active Input Line - Highlighted (Blue) */}
      {currentInput && (
        <div className="animate-fade-in-up">
           <p className="text-sm md:text-base font-medium tracking-wide text-blue-300 drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
             {currentInput}
           </p>
        </div>
      )}
      
      {/* Fallback/Standby text if nothing is happening */}
      {!currentInput && visibleHistory.length === 0 && (
         <p className="text-white/20 text-xs italic">...</p>
      )}
    </div>
  );
};

export default LyricsDisplay;