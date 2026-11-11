"use client";

import { motion } from "framer-motion";
import type { EventId } from "@/types/invitation";

const EASE = [0.22, 1, 0.36, 1] as const;

interface CeremonyIllustrationProps {
  kind: EventId | "crest";
  accentColor: string;
  inkColor: string;
  className?: string;
}

export function CeremonyIllustration({
  kind,
  accentColor,
  inkColor,
  className = "w-28 h-28",
}: CeremonyIllustrationProps) {
  const pathProps = {
    initial: { pathLength: 0, opacity: 0.35 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: 0.65, ease: EASE },
  };

  if (kind === "crest") {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <motion.rect
          x="14"
          y="14"
          width="92"
          height="92"
          rx="12"
          stroke={inkColor}
          strokeOpacity="0.24"
          strokeWidth="1.25"
          {...pathProps}
        />
        <motion.path
          d="M26 92V48C26 31.4315 41.2223 22 60 22C78.7777 22 94 31.4315 94 48V92"
          stroke={accentColor}
          strokeWidth="1.35"
          strokeLinecap="round"
          {...pathProps}
        />
        <motion.path
          d="M36 92V52C36 40 46.7452 32 60 32C73.2548 32 84 40 84 52V92"
          stroke={inkColor}
          strokeOpacity="0.45"
          strokeWidth="1.15"
          strokeLinecap="round"
          {...pathProps}
        />
        <motion.line
          x1="22"
          y1="92"
          x2="98"
          y2="92"
          stroke={inkColor}
          strokeOpacity="0.3"
          strokeWidth="1.25"
          strokeLinecap="round"
          {...pathProps}
        />
        <circle cx="60" cy="22" r="2.5" fill={accentColor} />
        <text
          x="60"
          y="67"
          textAnchor="middle"
          fill={inkColor}
          fontSize="16"
          fontFamily="var(--font-serif), Georgia, serif"
          letterSpacing="0.06em"
        >
          M · A
        </text>
      </svg>
    );
  }

  if (kind === "dinner") {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <motion.line
          x1="60"
          y1="14"
          x2="60"
          y2="28"
          stroke={inkColor}
          strokeOpacity="0.4"
          strokeWidth="1.25"
          {...pathProps}
        />
        <motion.path
          d="M44 38C44 30 51 26 60 26C69 26 76 30 76 38L72 58H48L44 38Z"
          stroke={accentColor}
          strokeWidth="1.35"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.circle
          cx="60"
          cy="78"
          r="20"
          stroke={inkColor}
          strokeOpacity="0.45"
          strokeWidth="1.25"
          {...pathProps}
        />
        <motion.circle
          cx="60"
          cy="78"
          r="11"
          stroke={accentColor}
          strokeWidth="1.25"
          {...pathProps}
        />
        <motion.line
          x1="24"
          y1="104"
          x2="96"
          y2="104"
          stroke={inkColor}
          strokeOpacity="0.28"
          strokeWidth="1.25"
          strokeLinecap="round"
          {...pathProps}
        />
      </svg>
    );
  }

  if (kind === "sangeet") {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <motion.ellipse
          cx="34"
          cy="64"
          rx="10"
          ry="20"
          stroke={accentColor}
          strokeWidth="1.35"
          {...pathProps}
        />
        <motion.ellipse
          cx="86"
          cy="64"
          rx="10"
          ry="20"
          stroke={accentColor}
          strokeWidth="1.35"
          {...pathProps}
        />
        <motion.path
          d="M34 44C48 40 72 40 86 44"
          stroke={inkColor}
          strokeOpacity="0.65"
          strokeWidth="1.25"
          {...pathProps}
        />
        <motion.path
          d="M34 84C48 88 72 88 86 84"
          stroke={inkColor}
          strokeOpacity="0.65"
          strokeWidth="1.25"
          {...pathProps}
        />
        <motion.path
          d="M44 45L60 84L76 45"
          stroke={inkColor}
          strokeOpacity="0.35"
          strokeWidth="1.15"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.path
          d="M42 28C51 22 69 22 78 28"
          stroke={accentColor}
          strokeOpacity="0.7"
          strokeWidth="1.2"
          strokeLinecap="round"
          {...pathProps}
        />
        <motion.path
          d="M49 20C55 16 65 16 71 20"
          stroke={accentColor}
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeLinecap="round"
          {...pathProps}
        />
      </svg>
    );
  }

  if (kind === "grah_shanti") {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <motion.path
          d="M60 22C66 30 66 38 60 44C54 38 54 30 60 22Z"
          stroke={accentColor}
          strokeWidth="1.35"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.path
          d="M44 54C44 47 51 44 60 44C69 44 76 47 76 54"
          stroke={inkColor}
          strokeOpacity="0.55"
          strokeWidth="1.25"
          strokeLinecap="round"
          {...pathProps}
        />
        <motion.path
          d="M40 60C36 69 40 84 60 88C80 84 84 69 80 60H40Z"
          stroke={inkColor}
          strokeOpacity="0.65"
          strokeWidth="1.3"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.path
          d="M28 96H92"
          stroke={accentColor}
          strokeWidth="1.3"
          strokeLinecap="round"
          {...pathProps}
        />
        <motion.path
          d="M36 52C31 44 34 35 42 32M84 52C89 44 86 35 78 32"
          stroke={inkColor}
          strokeOpacity="0.35"
          strokeWidth="1.15"
          strokeLinecap="round"
          {...pathProps}
        />
      </svg>
    );
  }

  if (kind === "baraat") {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <motion.path
          d="M22 94V34H98V94"
          stroke={inkColor}
          strokeOpacity="0.5"
          strokeWidth="1.3"
          strokeLinecap="round"
          {...pathProps}
        />
        <motion.path
          d="M22 34C31 44 41 44 50 34C59 44 69 44 78 34C85 41 92 41 98 34"
          stroke={accentColor}
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.path
          d="M38 94V60C38 50 47.8497 44 60 44C72.1503 44 82 50 82 60V94"
          stroke={inkColor}
          strokeOpacity="0.65"
          strokeWidth="1.3"
          {...pathProps}
        />
        <motion.line
          x1="16"
          y1="94"
          x2="104"
          y2="94"
          stroke={inkColor}
          strokeOpacity="0.3"
          strokeWidth="1.25"
          strokeLinecap="round"
          {...pathProps}
        />
      </svg>
    );
  }

  if (kind === "wedding") {
    return (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        aria-hidden="true"
        className={className}
      >
        <motion.path
          d="M22 36L60 18L98 36"
          stroke={accentColor}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.line
          x1="28"
          y1="36"
          x2="28"
          y2="94"
          stroke={inkColor}
          strokeOpacity="0.55"
          strokeWidth="1.3"
          {...pathProps}
        />
        <motion.line
          x1="92"
          y1="36"
          x2="92"
          y2="94"
          stroke={inkColor}
          strokeOpacity="0.55"
          strokeWidth="1.3"
          {...pathProps}
        />
        <motion.path
          d="M28 40C42 52 78 52 92 40"
          stroke={accentColor}
          strokeOpacity="0.7"
          strokeWidth="1.2"
          {...pathProps}
        />
        <motion.path
          d="M48 94L52 80H68L72 94"
          stroke={inkColor}
          strokeOpacity="0.65"
          strokeWidth="1.25"
          strokeLinejoin="round"
          {...pathProps}
        />
        <motion.path
          d="M60 60C64 66 64 73 60 77C56 73 56 66 60 60Z"
          stroke={accentColor}
          strokeWidth="1.3"
          {...pathProps}
        />
        <motion.line
          x1="18"
          y1="94"
          x2="102"
          y2="94"
          stroke={inkColor}
          strokeOpacity="0.3"
          strokeWidth="1.25"
          strokeLinecap="round"
          {...pathProps}
        />
      </svg>
    );
  }

  // reception_jariwala
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <motion.path
        d="M22 94V54C22 36 39 24 60 24C81 24 98 36 98 54V94"
        stroke={inkColor}
        strokeOpacity="0.45"
        strokeWidth="1.25"
        {...pathProps}
      />
      <motion.path
        d="M36 94V58C36 45 46.7452 36 60 36C73.2548 36 84 45 84 58V94"
        stroke={accentColor}
        strokeWidth="1.35"
        {...pathProps}
      />
      <motion.path
        d="M50 94V68C50 61 54.4772 56 60 56C65.5228 56 70 61 70 68V94"
        stroke={inkColor}
        strokeOpacity="0.55"
        strokeWidth="1.2"
        {...pathProps}
      />
      <motion.line
        x1="18"
        y1="94"
        x2="102"
        y2="94"
        stroke={inkColor}
        strokeOpacity="0.3"
        strokeWidth="1.25"
        strokeLinecap="round"
        {...pathProps}
      />
    </svg>
  );
}
