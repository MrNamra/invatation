"use client";

import { useId, type CSSProperties } from "react";
import { motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

export type CrestTone = "rose" | "silver" | "gold" | "vermilion" | "ink";

const CREST_COLORS: Record<CrestTone, string> = {
  rose: "#b92854",
  silver: "#e8eef7",
  gold: "#b97e33",
  vermilion: "#a63429",
  ink: "#1f1b16",
};

interface AmCrestProps {
  groom: string;
  bride: string;
  hashtag: string;
  tone?: CrestTone;
  className?: string;
  style?: CSSProperties;
}

export function AmCrest({
  groom,
  bride,
  hashtag,
  tone = "rose",
  className = "w-20 h-20",
  style,
}: AmCrestProps) {
  const uid = useId().replace(/:/g, "");
  const arcId = `crest-arc-${uid}`;
  const color = CREST_COLORS[tone] ?? CREST_COLORS.rose;

  const groomInitial = (groom.trim()[0] || "A").toUpperCase();
  const brideInitial = (bride.trim()[0] || "M").toUpperCase();

  return (
    <motion.svg
      viewBox="0 0 140 140"
      fill="none"
      aria-label={`${groomInitial}${brideInitial} ${hashtag}`}
      className={className}
      style={style}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <defs>
        {/* Bottom arc inside the outer ring for the hashtag */}
        <path id={arcId} d="M 23,78 A 47,47 0 0,0 117,78" />
      </defs>

      {/* Outer and inner fine rings */}
      <motion.circle
        cx="70"
        cy="66"
        r="43"
        stroke={color}
        strokeOpacity="0.82"
        strokeWidth="1.2"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
      />
      <motion.circle
        cx="70"
        cy="66"
        r="38.5"
        stroke={color}
        strokeOpacity="0.45"
        strokeWidth="0.9"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.75, ease: EASE }}
      />

      {/* Left laurel botanical branch */}
      <g stroke={color} strokeWidth="1.1" strokeLinecap="round" fill={color} fillOpacity="0.85">
        <path d="M 27 56 Q 28 33 50 24" fill="none" strokeOpacity="0.8" />
        <ellipse cx="30" cy="48" rx="3.4" ry="1.6" transform="rotate(-48 30 48)" />
        <ellipse cx="24" cy="46" rx="3.4" ry="1.5" transform="rotate(20 24 46)" />
        <ellipse cx="34" cy="39" rx="3.3" ry="1.5" transform="rotate(-25 34 39)" />
        <ellipse cx="29" cy="36" rx="3.3" ry="1.5" transform="rotate(35 29 36)" />
        <ellipse cx="42" cy="31" rx="3.1" ry="1.4" transform="rotate(-12 42 31)" />
        <ellipse cx="38" cy="27" rx="3.1" ry="1.4" transform="rotate(42 38 27)" />
      </g>

      {/* Right laurel botanical branch */}
      <g stroke={color} strokeWidth="1.1" strokeLinecap="round" fill={color} fillOpacity="0.85">
        <path d="M 113 56 Q 112 33 90 24" fill="none" strokeOpacity="0.8" />
        <ellipse cx="110" cy="48" rx="3.4" ry="1.6" transform="rotate(48 110 48)" />
        <ellipse cx="116" cy="46" rx="3.4" ry="1.5" transform="rotate(-20 116 46)" />
        <ellipse cx="106" cy="39" rx="3.3" ry="1.5" transform="rotate(25 106 39)" />
        <ellipse cx="111" cy="36" rx="3.3" ry="1.5" transform="rotate(-35 111 36)" />
        <ellipse cx="98" cy="31" rx="3.1" ry="1.4" transform="rotate(12 98 31)" />
        <ellipse cx="102" cy="27" rx="3.1" ry="1.4" transform="rotate(-42 102 27)" />
      </g>

      {/* Interlocked serif monogram */}
      <text
        x="70"
        y="78"
        textAnchor="middle"
        fill={color}
        fontFamily="var(--font-cormorant), var(--font-serif), Georgia, serif"
        fontSize="40"
        fontWeight="500"
        letterSpacing="-0.06em"
      >
        {groomInitial}
        {brideInitial}
      </text>

      {/* Curved hashtag below monogram */}
      <text
        fill={color}
        fillOpacity="0.92"
        fontFamily="var(--font-sans), var(--font-devanagari), sans-serif"
        fontSize="10"
        fontWeight="500"
        letterSpacing="0.02em"
      >
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">
          {hashtag}
        </textPath>
      </text>
    </motion.svg>
  );
}
