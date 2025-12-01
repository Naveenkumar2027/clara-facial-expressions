import React, { useState, useEffect } from 'react';

interface RoboFaceProps {
  amplitude: number; // 0.0 to 1.0
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
  // Mouth opens slightly based on amplitude
  const mouthHeight = Math.max(4, amplitude * 40); 
  const mouthWidth = 100 + (amplitude * 20);

  // -- Eye Logic --
  const isSpeaking = amplitude > 0.05;

  let scaleY = 1;
  let scaleX = 1;

  if (isBlinking) {
    scaleY = 0.1; // Close eyes
    scaleX = 1.1; // Squash
  } else if (isSpeaking) {
    // Emotive shape when speaking
    scaleY = 1 + (amplitude * 0.3); 
    scaleX = 0.95;
  }

  const eyeStyle: React.CSSProperties = {
    transform: `scale(${scaleX}, ${scaleY})`,
  };
  
  // Rounded square eyes (Green)
  const eyeClasses = `w-20 h-20 bg-green-500 shadow-[0_0_20px_#22c55e] rounded-2xl transition-transform duration-100 ease-in-out`;

  const opacityClass = isListening ? 'opacity-100' : 'opacity-50';

  return (
    // Added responsive scaling: md:scale-150 (Tablets) and lg:scale-[2.5] (Laptops/Desktops)
    <div className={`relative flex flex-col items-center justify-center transition-all duration-500 transform scale-100 md:scale-150 lg:scale-[2.5] ${opacityClass}`}>
      
      {/* Eyes Container */}
      <div className="flex justify-center gap-12 mb-12">
        <div className={eyeClasses} style={eyeStyle}></div>
        <div className={eyeClasses} style={eyeStyle}></div>
      </div>

      {/* Mouth Container */}
      <div className="h-20 flex items-center justify-center">
        <div 
          className="bg-green-500 shadow-[0_0_20px_#22c55e] transition-all duration-75 ease-out rounded-full"
          style={{
            height: `${mouthHeight}px`,
            width: `${mouthWidth}px`
          }}
        ></div>
      </div>
    </div>
  );
};

export default RoboFace;