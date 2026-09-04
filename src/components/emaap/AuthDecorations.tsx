import React from "react";

/**
 * High-quality, restrained vector graphics representing Indian legal metrology heritage:
 * - Subtle flowing saffron ribbon curve (top-left)
 * - Subtle flowing green ribbon curve (bottom-right)
 * - 24-spoke Ashoka Chakra wheel in subtle Ashoka navy
 * - Architectural heritage and institutional skyline silhouette (Taj Mahal, India Gate, Qutub Minar, modern institutions)
 */

export function SaffronFlowGraphic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 700 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="saffron-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff671f" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#ff8533" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ffc099" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="saffron-grad-2" x1="0%" y1="0%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#ff5500" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#ff7722" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M-50 -50 C 180 30, 240 220, 160 380 C 110 480, 20 460, -50 490 Z"
        fill="url(#saffron-grad-1)"
      />
      <path
        d="M-40 -40 C 260 10, 360 140, 290 320 C 230 460, 100 420, -40 440 Z"
        fill="url(#saffron-grad-2)"
      />
      <path
        d="M-20 -20 Q 220 80 280 260 T 120 450"
        stroke="#ff671f"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        fill="none"
      />
      <path
        d="M-20 40 Q 280 120 320 300 T 180 480"
        stroke="#ff8533"
        strokeWidth="1"
        strokeOpacity="0.2"
        fill="none"
      />
    </svg>
  );
}

export function GreenFlowGraphic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 700 500"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="green-grad-1" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#138808" stopOpacity="0.45" />
          <stop offset="50%" stopColor="#2e9e24" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#a3e39d" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="green-grad-2" x1="100%" y1="100%" x2="20%" y2="10%">
          <stop offset="0%" stopColor="#087443" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#138808" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M750 550 C 520 470, 460 280, 540 120 C 590 20, 680 40, 750 10 Z"
        fill="url(#green-grad-1)"
      />
      <path
        d="M740 540 C 440 490, 340 360, 410 180 C 470 40, 600 80, 740 60 Z"
        fill="url(#green-grad-2)"
      />
      <path
        d="M720 520 Q 480 420 420 240 T 580 50"
        stroke="#138808"
        strokeWidth="1.5"
        strokeOpacity="0.35"
        fill="none"
      />
      <path
        d="M720 460 Q 420 380 380 200 T 520 20"
        stroke="#2e9e24"
        strokeWidth="1"
        strokeOpacity="0.2"
        fill="none"
      />
    </svg>
  );
}

export function AshokaChakraGraphic({ className }: { className?: string }) {
  // Exactly 24 spokes radiating from the center hub
  const spokes = Array.from({ length: 24 }, (_, i) => (i * 360) / 24);

  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Rim */}
      <circle cx="100" cy="100" r="92" stroke="#000080" strokeWidth="3" strokeOpacity="0.5" />
      <circle cx="100" cy="100" r="86" stroke="#000080" strokeWidth="1" strokeOpacity="0.3" />

      {/* Inner Rim & Hub */}
      <circle cx="100" cy="100" r="22" stroke="#000080" strokeWidth="2.5" strokeOpacity="0.5" />
      <circle cx="100" cy="100" r="10" fill="#000080" fillOpacity="0.6" />

      {/* 24 Radiating Spokes */}
      {spokes.map((angle, idx) => (
        <g key={idx} transform={`rotate(${angle} 100 100)`}>
          <line
            x1="100"
            y1="78"
            x2="100"
            y2="14"
            stroke="#000080"
            strokeWidth="1.6"
            strokeOpacity="0.45"
            strokeLinecap="round"
          />
          {/* Small decorative triangle pip between spokes along outer rim */}
          <path d="M98 15 L100 11 L102 15 Z" fill="#000080" fillOpacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

export function HeritageSkylineGraphic({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      <defs>
        <linearGradient id="monument-fade" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="#000080" stopOpacity="0.35" />
          <stop offset="70%" stopColor="#000080" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#000080" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="skyline-fill" x1="0" y1="0" x2="0" y2="100%">
          <stop offset="0%" stopColor="#000080" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#000080" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Subtle background skyline silhouettes (modern institutions & highrises) */}
      <g opacity="0.45">
        <rect x="420" y="70" width="40" height="210" fill="url(#skyline-fill)" />
        <line
          x1="440"
          y1="40"
          x2="440"
          y2="70"
          stroke="#000080"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />
        <rect x="480" y="110" width="55" height="170" fill="url(#skyline-fill)" />
        <rect x="550" y="90" width="45" height="190" fill="url(#skyline-fill)" />
        <rect x="610" y="130" width="50" height="150" fill="url(#skyline-fill)" />
        <rect x="675" y="100" width="60" height="180" fill="url(#skyline-fill)" />
      </g>

      {/* Qutub Minar Silhouette (Left) */}
      <g stroke="#000080" strokeWidth="1" strokeOpacity="0.35" fill="url(#skyline-fill)">
        {/* Base and tiered tower tapering upwards */}
        <polygon points="45,280 50,80 56,80 61,280" />
        <line x1="47" y1="220" x2="59" y2="220" />
        <line x1="48" y1="170" x2="58" y2="170" />
        <line x1="49" y1="120" x2="57" y2="120" />
        {/* Balconies */}
        <rect x="44" y="218" width="18" height="4" rx="1" fill="#000080" fillOpacity="0.2" />
        <rect x="45" y="168" width="16" height="3" rx="1" fill="#000080" fillOpacity="0.2" />
        <rect x="47" y="118" width="12" height="3" rx="1" fill="#000080" fillOpacity="0.2" />
        {/* Spire */}
        <line x1="53" y1="65" x2="53" y2="80" strokeWidth="1.5" />
      </g>

      {/* Institutional Gateway / India Gate (Center-Left) */}
      <g stroke="#000080" strokeWidth="1.2" strokeOpacity="0.4" fill="url(#skyline-fill)">
        {/* Archway Columns */}
        <rect x="90" y="130" width="70" height="150" />
        <rect x="85" y="120" width="80" height="10" />
        <rect x="80" y="110" width="90" height="10" />
        {/* Central Arch curve */}
        <path d="M108 280 V190 Q125 160 142 190 V280" fill="#ffffff" />
        {/* Top Pediment */}
        <rect x="87" y="98" width="76" height="12" />
        <line x1="90" y1="104" x2="160" y2="104" strokeOpacity="0.2" />
        <rect x="98" y="90" width="54" height="8" rx="1" fill="#000080" fillOpacity="0.25" />
      </g>

      {/* Taj Mahal Silhouette (Center-Right Heritage Monument) */}
      <g stroke="#000080" strokeWidth="1" strokeOpacity="0.38" fill="url(#skyline-fill)">
        {/* Left Minaret */}
        <rect x="195" y="120" width="8" height="160" />
        <rect x="193" y="116" width="12" height="4" />
        <path d="M195 116 C195 108, 203 108, 203 116 Z" fill="#000080" fillOpacity="0.2" />
        <line x1="199" y1="102" x2="199" y2="108" strokeWidth="1" />

        {/* Right Minaret */}
        <rect x="337" y="120" width="8" height="160" />
        <rect x="335" y="116" width="12" height="4" />
        <path d="M337 116 C337 108, 345 108, 345 116 Z" fill="#000080" fillOpacity="0.2" />
        <line x1="341" y1="102" x2="341" y2="108" strokeWidth="1" />

        {/* Main Base & Plinth */}
        <rect x="215" y="200" width="110" height="80" />
        <rect x="210" y="195" width="120" height="6" />

        {/* Central Arch Portal */}
        <path d="M250 280 V225 Q270 205 290 225 V280" fill="#ffffff" strokeWidth="1.2" />

        {/* Central Grand Onion Dome */}
        <path
          d="M250 195 C240 160, 240 120, 270 100 C300 120, 300 160, 290 195 Z"
          fill="url(#skyline-fill)"
          strokeWidth="1.4"
        />
        {/* Finial / Spire */}
        <line x1="270" y1="80" x2="270" y2="100" strokeWidth="1.5" />
        <circle cx="270" cy="84" r="2.5" fill="#000080" fillOpacity="0.4" />

        {/* Side Domes (Chhatris) */}
        <path d="M230 195 C226 175, 242 175, 238 195 Z" />
        <line x1="234" y1="168" x2="234" y2="175" />
        <path d="M302 195 C298 175, 314 175, 310 195 Z" />
        <line x1="306" y1="168" x2="306" y2="175" />
      </g>

      {/* Modern Metrology Testing & Institutional Skyline (Right) */}
      <g stroke="#000080" strokeWidth="1" strokeOpacity="0.3" fill="url(#skyline-fill)">
        {/* Institutional Columns / State Office */}
        <rect x="365" y="160" width="80" height="120" />
        <polygon points="360,160 405,135 450,160" fill="url(#skyline-fill)" />
        <line x1="380" y1="160" x2="380" y2="280" strokeDasharray="3 3" />
        <line x1="405" y1="160" x2="405" y2="280" strokeDasharray="3 3" />
        <line x1="430" y1="160" x2="430" y2="280" strokeDasharray="3 3" />

        {/* High-rise tower silhouette */}
        <rect x="460" y="140" width="50" height="140" />
        <polygon points="460,140 485,110 510,140" />
        <line x1="485" y1="90" x2="485" y2="110" strokeWidth="1.5" />
      </g>

      {/* Ground baseline */}
      <line
        x1="0"
        y1="280"
        x2="800"
        y2="280"
        stroke="#000080"
        strokeWidth="1"
        strokeOpacity="0.25"
      />
    </svg>
  );
}
