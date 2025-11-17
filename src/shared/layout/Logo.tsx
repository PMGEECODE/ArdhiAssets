import React from "react";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  className = "",
  size = "md",
  showText = true,
}) => {
  const sizeClasses = {
    sm: "h-10",
    md: "h-12",
    lg: "h-16",
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className={`${sizeClasses[size]} aspect-square relative`}>
        <svg
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full logo-container"
        >
          {/* Gradient and Filter Definitions */}
          <defs>
            {/* Main 3D Gradients */}
            <radialGradient id="mainGradient" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </radialGradient>

            <radialGradient id="shadowGradient" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#1e40af" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </radialGradient>

            <radialGradient id="highlightGradient" cx="50%" cy="20%" r="80%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="30%" stopColor="#93c5fd" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </radialGradient>

            <linearGradient
              id="textGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#e0f2fe" />
              <stop offset="100%" stopColor="#bae6fd" />
            </linearGradient>

            <radialGradient id="innerGlow" cx="50%" cy="50%" r="45%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
              <stop offset="70%" stopColor="#60a5fa" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0" />
            </radialGradient>

            {/* 3D Shadow Filter */}
            <filter id="shadow3d" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow
                dx="3"
                dy="6"
                stdDeviation="4"
                floodColor="#0f172a"
                floodOpacity="0.4"
              />
              <feDropShadow
                dx="1"
                dy="3"
                stdDeviation="2"
                floodColor="#1e40af"
                floodOpacity="0.6"
              />
            </filter>

            <filter id="textGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id="innerShadow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feOffset dx="0" dy="2" />
              <feGaussianBlur stdDeviation="2" />
              <feComposite operator="over" />
            </filter>
          </defs>

          {/* Outer Ring Animation */}
          <g className="outer-ring">
            <circle
              cx="60"
              cy="60"
              r="58"
              fill="none"
              stroke="url(#mainGradient)"
              strokeWidth="0.5"
              strokeDasharray="4 4"
              opacity="0.6"
              className="rotating-ring"
            />
          </g>

          {/* Shadow Circle */}
          <circle
            cx="62"
            cy="64"
            r="50"
            fill="url(#shadowGradient)"
            opacity="0.3"
          />

          {/* Main 3D Circle */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="url(#mainGradient)"
            filter="url(#shadow3d)"
            className="main-circle"
          />

          {/* Highlight Layer for 3D Effect */}
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="url(#highlightGradient)"
            className="highlight-layer"
          />

          {/* Inner Glow Circle */}
          <circle cx="60" cy="60" r="45" fill="url(#innerGlow)" />

          {/* Inner Ring */}
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
          />

          {/* AMS Text */}
          <g className="ams-text">
            {/* Shadow layer */}
            <text
              x="60"
              y="72"
              fontSize="32"
              fontWeight="800"
              textAnchor="middle"
              fill="#1e40af"
              opacity="0.4"
              className="text-shadow"
            >
              AMS
            </text>

            {/* Main text */}
            <text
              x="60"
              y="70"
              fontSize="32"
              fontWeight="800"
              textAnchor="middle"
              fill="url(#textGradient)"
              filter="url(#textGlow)"
              className="main-text"
            >
              AMS
            </text>

            {/* Highlight sweep */}
            <text
              x="60"
              y="70"
              fontSize="32"
              fontWeight="800"
              textAnchor="middle"
              fill="rgba(255,255,255,0.6)"
              className="text-highlight"
            >
              AMS
            </text>
          </g>

          {/* Decorative Elements */}
          <g className="decorative-dots">
            <circle
              cx="60"
              cy="25"
              r="2"
              fill="rgba(255,255,255,0.8)"
              className="dot dot-1"
            />
            <circle
              cx="85"
              cy="40"
              r="1.5"
              fill="rgba(255,255,255,0.6)"
              className="dot dot-2"
            />
            <circle
              cx="95"
              cy="60"
              r="1"
              fill="rgba(255,255,255,0.7)"
              className="dot dot-3"
            />
            <circle
              cx="85"
              cy="80"
              r="1.5"
              fill="rgba(255,255,255,0.6)"
              className="dot dot-4"
            />
            <circle
              cx="60"
              cy="95"
              r="2"
              fill="rgba(255,255,255,0.8)"
              className="dot dot-5"
            />
            <circle
              cx="35"
              cy="80"
              r="1.5"
              fill="rgba(255,255,255,0.6)"
              className="dot dot-6"
            />
            <circle
              cx="25"
              cy="60"
              r="1"
              fill="rgba(255,255,255,0.7)"
              className="dot dot-7"
            />
            <circle
              cx="35"
              cy="40"
              r="1.5"
              fill="rgba(255,255,255,0.6)"
              className="dot dot-8"
            />
          </g>

          {/* Animated accent lines */}
          <g
            className="accent-lines"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1"
            fill="none"
          >
            <path d="M 30 30 Q 60 45 90 30" className="accent-curve-1" />
            <path d="M 30 90 Q 60 75 90 90" className="accent-curve-2" />
          </g>

          {/* CSS Animations */}
          <style>
            {`
              .logo-container {
                animation: logoFloat 6s ease-in-out infinite;
              }
              
              .main-circle {
                animation: circlePulse 4s ease-in-out infinite;
                transform-origin: center;
              }
              
              .highlight-layer {
                animation: highlightRotate 8s linear infinite;
                transform-origin: center;
              }
              
              .rotating-ring {
                animation: ringRotate 12s linear infinite;
                transform-origin: center;
              }
              
              .main-text {
                animation: textGlow 3s ease-in-out infinite;
              }
              
              .text-highlight {
                animation: highlightSweep 4s ease-in-out infinite;
              }
              
              .text-shadow {
                animation: shadowPulse 4s ease-in-out infinite;
              }
              
              .dot {
                animation: dotPulse 2s ease-in-out infinite;
                transform-origin: center;
              }
              
              .dot-1 { animation-delay: 0s; }
              .dot-2 { animation-delay: 0.25s; }
              .dot-3 { animation-delay: 0.5s; }
              .dot-4 { animation-delay: 0.75s; }
              .dot-5 { animation-delay: 1s; }
              .dot-6 { animation-delay: 1.25s; }
              .dot-7 { animation-delay: 1.5s; }
              .dot-8 { animation-delay: 1.75s; }
              
              .accent-curve-1 {
                animation: curveGlow 5s ease-in-out infinite;
              }
              
              .accent-curve-2 {
                animation: curveGlow 5s ease-in-out infinite 2.5s;
              }
              
              @keyframes logoFloat {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-3px); }
              }
              
              @keyframes circlePulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
              }
              
              @keyframes highlightRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              
              @keyframes ringRotate {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(-360deg); }
              }
              
              @keyframes textGlow {
                0%, 100% { filter: brightness(1) drop-shadow(0 0 8px rgba(96, 165, 250, 0.5)); }
                50% { filter: brightness(1.3) drop-shadow(0 0 12px rgba(96, 165, 250, 0.8)); }
              }
              
              @keyframes highlightSweep {
                0% { opacity: 0; }
                15% { opacity: 0.6; }
                30% { opacity: 0.3; }
                85% { opacity: 0.3; }
                100% { opacity: 0; }
              }
              
              @keyframes shadowPulse {
                0%, 100% { opacity: 0.4; }
                50% { opacity: 0.6; }
              }
              
              @keyframes dotPulse {
                0%, 100% { 
                  opacity: 0.6; 
                  transform: scale(1); 
                }
                50% { 
                  opacity: 1; 
                  transform: scale(1.3); 
                }
              }
              
              @keyframes curveGlow {
                0%, 100% { 
                  stroke-opacity: 0.3; 
                  stroke-width: 1; 
                }
                50% { 
                  stroke-opacity: 0.8; 
                  stroke-width: 1.5; 
                }
              }
            `}
          </style>
        </svg>
      </div>
      {showText && (
        <span className="ml-3 text-lg font-semibold text-gray-800">AMS</span>
      )}
    </div>
  );
};

export default Logo;
