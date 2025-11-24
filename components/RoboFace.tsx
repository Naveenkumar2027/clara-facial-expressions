import React, { useState, useEffect } from 'react';

interface RoboFaceProps {
  amplitude: number; // 0.0 to 1.0 (Robot speaking volume)
  isListening: boolean;
}

const RoboFace: React.FC<RoboFaceProps> = ({ amplitude, isListening }) => {
  const [isBlinking, setIsBlinking] = useState(false);

  // Blinking Logic
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      // Random blink interval between 2s and 6s
      const nextBlink = Math.random() * 4000 + 2000; 
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 150); // Blink duration
      }, nextBlink);
    };
    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, []);

  // -- Mouth Logic --
  // Keep mouth opening subtle and small as requested
  // Reduced multiplier significantly
  const mouthHeight = Math.max(4, amplitude * 20); // Was 40, reduced to 20 for "little small"
  const mouthWidth = 150 + (amplitude * 10);

  // -- Eye Logic --
  const isSpeaking = amplitude > 0.05;

  let scaleY = 1;
  let scaleX = 1;

  if (isBlinking) {
    scaleY = 0.1; // Close eyes (blink)
    scaleX = 1.1; // Slight squash width
  } else if (isSpeaking) {
    // "Emotive" shape when speaking:
    // Stretch Y slightly to look "engaged" or "wide-eyed"
    // Squash X slightly to maintain mass
    scaleY = 1 + (amplitude * 0.4); 
    scaleX = 1 - (amplitude * 0.1);
  }

  // Smooth transitions for organic feel
  const eyeStyle: React.CSSProperties = {
    transform: `scale(${scaleX}, ${scaleY})`,
  };
  
  // rounded-3xl softens the square vertices
  const eyeClasses = `w-24 h-24 bg-green-500 shadow-[0_0_25px_#22c55e] rounded-3xl transition-transform duration-100 ease-in-out`;

  // Fade out slightly when not connected/listening
  const containerOpacity = isListening ? 'opacity-100' : 'opacity-60';

  return (
    <div className="relative w-full h-[500px] flex flex-col items-center justify-center bg-black overflow-hidden">
      
      {/* Eyes Container */}
      <div className={`flex justify-center gap-16 w-full mb-16 relative z-10 transition-opacity duration-500 ${containerOpacity}`}>
        {/* Left Eye */}
        <div className={eyeClasses} style={eyeStyle}></div>
        {/* Right Eye */}
        <div className={eyeClasses} style={eyeStyle}></div>
      </div>

      {/* Mouth Container */}
      <div className={`h-32 flex items-center justify-center w-full relative z-10 transition-opacity duration-500 ${containerOpacity}`}>
        {/* Rounded mouth edges to match smoother eyes */}
        <div 
          className="bg-green-500 shadow-[0_0_25px_#22c55e] transition-all duration-75 ease-out rounded-lg"
          style={{
            height: `${mouthHeight}px`,
            width: `${mouthWidth}px`
          }}
        ></div>
      </div>

      {/* Status Text */}
      <div className="absolute bottom-10 text-green-800 text-xs font-mono tracking-[0.5em]">
        {isListening ? "LISTENING..." : "STANDBY"}
      </div>
    </div>
  );
};

export default RoboFace;