"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CalendarPlus,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Tag,
  Users,
  X,
} from "lucide-react";
import { AmCrest, type CrestTone } from "@/components/AmCrest";
import { CeremonyIllustration } from "@/components/CeremonyIllustration";
import { generateEventIcs } from "@/lib/ics";
import type {
  EventId,
  GuestInvitationPayload,
  RsvpStatus,
  TemplateId,
  WeddingEvent,
} from "@/types/invitation";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ThemeTokens {
  bgPage: string;
  bgCard: string;
  bgRaised: string;
  hairline: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  isDark: boolean;
}

const TEMPLATE_THEMES: Record<TemplateId, ThemeTokens> = {
  "royal-jharokha": {
    bgPage: "#f3eee4",
    bgCard: "#fdfbf7",
    bgRaised: "#eae3d5",
    hairline: "rgba(31, 27, 22, 0.1)",
    textPrimary: "#1f1b16",
    textSecondary: "#5e554a",
    textMuted: "#756c60",
    accent: "#b92854",
    accentText: "#fdfbf7",
    accentSoft: "rgba(185, 40, 84, 0.09)",
    isDark: false,
  },
  "ivory-vermilion": {
    bgPage: "#f7f4ee",
    bgCard: "#fdfbf7",
    bgRaised: "#efe9df",
    hairline: "rgba(31, 27, 22, 0.1)",
    textPrimary: "#1f1b16",
    textSecondary: "#5e554a",
    textMuted: "#7b7266",
    accent: "#a63429",
    accentText: "#fdfbf7",
    accentSoft: "rgba(166, 52, 41, 0.08)",
    isDark: false,
  },
  "salabatpura-dusk": {
    bgPage: "#161513",
    bgCard: "#1c1a18",
    bgRaised: "#262421",
    hairline: "rgba(239, 233, 222, 0.11)",
    textPrimary: "#efe9de",
    textSecondary: "#b8b0a3",
    textMuted: "#8d867a",
    accent: "#c89d54",
    accentText: "#161513",
    accentSoft: "rgba(200, 157, 84, 0.12)",
    isDark: true,
  },
  "marigold-press": {
    bgPage: "#f6f3eb",
    bgCard: "#fcfaf5",
    bgRaised: "#ece6d9",
    hairline: "rgba(29, 34, 27, 0.1)",
    textPrimary: "#1d221b",
    textSecondary: "#4c5347",
    textMuted: "#686e63",
    accent: "#a85c12",
    accentText: "#fcfaf5",
    accentSoft: "rgba(168, 92, 18, 0.09)",
    isDark: false,
  },
};

interface HeritageSceneStyle {
  imageSrc: string;
  isNightSky: boolean;
  crestTone: CrestTone;
  titleKind: "script" | "serif";
  titleColor: string;
  subtitleColor: string;
  dateColor: string;
  metaColor: string;
  dividerColor: string;
  scrimGradient: string;
}

const HERITAGE_EVENT_SCENES: Record<EventId, HeritageSceneStyle> = {
  dinner: {
    imageSrc: "/cards/dinner-courtyard.jpg",
    isNightSky: true,
    crestTone: "silver",
    titleKind: "script",
    titleColor: "#fdfbf7",
    subtitleColor: "#e6edf7",
    dateColor: "#fdfbf7",
    metaColor: "#dce6f5",
    dividerColor: "rgba(253, 251, 247, 0.35)",
    scrimGradient:
      "linear-gradient(180deg, rgba(10, 29, 52, 0.45) 0%, rgba(10, 29, 52, 0.25) 48%, rgba(10, 29, 52, 0) 64%)",
  },
  sangeet: {
    imageSrc: "/cards/sangeet-starlight.jpg",
    isNightSky: true,
    crestTone: "silver",
    titleKind: "script",
    titleColor: "#fdfbf7",
    subtitleColor: "#e5ecf7",
    dateColor: "#fdfbf7",
    metaColor: "#dce6f5",
    dividerColor: "rgba(253, 251, 247, 0.35)",
    scrimGradient:
      "linear-gradient(180deg, rgba(8, 25, 56, 0.42) 0%, rgba(8, 25, 56, 0.22) 48%, rgba(8, 25, 56, 0) 64%)",
  },
  grah_shanti: {
    imageSrc: "/cards/grah-shanti-mandap.jpg",
    isNightSky: false,
    crestTone: "gold",
    titleKind: "script",
    titleColor: "#b81f24",
    subtitleColor: "#6d4512",
    dateColor: "#b81f24",
    metaColor: "#5e3c10",
    dividerColor: "rgba(184, 31, 36, 0.35)",
    scrimGradient:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.14) 52%, rgba(255, 255, 255, 0) 68%)",
  },
  baraat: {
    imageSrc: "/cards/baraat-wedding-courtyard.jpg",
    isNightSky: false,
    crestTone: "gold",
    titleKind: "script",
    titleColor: "#b81f24",
    subtitleColor: "#754b14",
    dateColor: "#b81f24",
    metaColor: "#654012",
    dividerColor: "rgba(184, 31, 36, 0.35)",
    scrimGradient:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.18) 54%, rgba(255, 255, 255, 0) 70%)",
  },
  wedding: {
    imageSrc: "/cards/baraat-wedding-courtyard.jpg",
    isNightSky: false,
    crestTone: "gold",
    titleKind: "script",
    titleColor: "#b81f24",
    subtitleColor: "#754b14",
    dateColor: "#b81f24",
    metaColor: "#654012",
    dividerColor: "rgba(184, 31, 36, 0.35)",
    scrimGradient:
      "linear-gradient(180deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.18) 54%, rgba(255, 255, 255, 0) 70%)",
  },
  reception_jariwala: {
    imageSrc: "/cards/reception-colonnade.jpg",
    isNightSky: true,
    crestTone: "silver",
    titleKind: "serif",
    titleColor: "#fdfbf7",
    subtitleColor: "#e6edf7",
    dateColor: "#fdfbf7",
    metaColor: "#dce6f5",
    dividerColor: "rgba(253, 251, 247, 0.35)",
    scrimGradient:
      "linear-gradient(180deg, rgba(7, 25, 51, 0.42) 0%, rgba(7, 25, 51, 0.22) 48%, rgba(7, 25, 51, 0) 64%)",
  },
};

type Chapter =
  | { kind: "overview"; id: "overview"; label: string }
  | { kind: "event"; id: EventId; label: string; event: WeddingEvent }
  | { kind: "rsvp"; id: "rsvp"; label: string };

function getCountdownLabel(isoStart: string): string {
  const target = new Date(isoStart).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  if (diffDays > 1) return `In ${diffDays} days`;
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === 0) return "Today";
  return "Completed";
}

function getEventMapHref(event: WeddingEvent): string {
  if (event.mapUrl && event.mapUrl.trim()) {
    return event.mapUrl.trim();
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.venue
  )}`;
}

function downloadIcsFile(
  event: WeddingEvent,
  couple: GuestInvitationPayload["couple"]
) {
  const ics = generateEventIcs(event, couple);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.id}-${couple.bride.toLowerCase()}-${couple.groom.toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function extractClosingFamily(groomParents: string, brideParents: string): {
  heading: string;
  subheading: string;
} {
  const groomMatch = groomParents.trim().match(/([A-Za-z]+)$/);
  if (groomMatch) {
    return { heading: groomMatch[1], subheading: "Family" };
  }
  const brideMatch = brideParents.trim().match(/([A-Za-z]+)$/);
  if (brideMatch) {
    return { heading: brideMatch[1], subheading: "Family" };
  }
  return { heading: "Jariwala", subheading: "Family" };
}

interface GuestInvitationViewerProps {
  payload: GuestInvitationPayload;
  isPreview?: boolean;
}

export function GuestInvitationViewer({
  payload,
  isPreview = false,
}: GuestInvitationViewerProps) {
  const theme =
    TEMPLATE_THEMES[payload.template_id] ?? TEMPLATE_THEMES["royal-jharokha"];
  const isHeritage = payload.template_id === "royal-jharokha";

  // Strictly build chapters ONLY from payload.permitted_events received from the server
  const chapters: Chapter[] = useMemo(() => {
    const list: Chapter[] = [
      {
        kind: "overview",
        id: "overview",
        label: isHeritage ? "Cover" : "Overview",
      },
    ];
    for (const ev of payload.permitted_events) {
      list.push({
        kind: "event",
        id: ev.id,
        label: ev.shortLabel,
        event: ev,
      });
    }
    list.push({
      kind: "rsvp",
      id: "rsvp",
      label: isHeritage ? "Regards & RSVP" : "RSVP",
    });
    return list;
  }, [isHeritage, payload.permitted_events]);

  const [isOpened, setIsOpened] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [rsvpDrawerOpen, setRsvpDrawerOpen] = useState(false);
  const activePillRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpened) return;
    activePillRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [isOpened, chapterIndex]);

  // RSVP form state initialized solely from permitted events
  const [rsvpStatus, setRsvpStatus] = useState<RsvpStatus>(
    payload.guest.rsvp_status === "declined" ? "declined" : "attending"
  );
  const [rsvpEvents, setRsvpEvents] = useState<EventId[]>(() => {
    if (payload.guest.rsvp_events.length > 0) {
      return payload.guest.rsvp_events;
    }
    return payload.permitted_events.map((e) => e.id);
  });
  const [rsvpCount, setRsvpCount] = useState<number>(
    payload.guest.rsvp_guests_count || 1
  );
  const [rsvpNote, setRsvpNote] = useState<string>(
    payload.guest.rsvp_note ?? ""
  );
  const [rsvpSubmitted, setRsvpSubmitted] = useState<boolean>(
    payload.guest.rsvp_status !== "pending"
  );
  const [rsvpSaving, setRsvpSaving] = useState(false);
  const [rsvpError, setRsvpError] = useState<string | null>(null);

  // Mark invitation viewed on live guest open (skipped for host preview)
  useEffect(() => {
    if (isPreview) return;
    fetch(`/api/invite/${encodeURIComponent(payload.guest.unique_code)}/view`, {
      method: "POST",
    }).catch(() => {
      // Non-blocking tracking beacon
    });
  }, [isPreview, payload.guest.unique_code]);

  const goToChapter = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= chapters.length) return;
      setDirection(nextIndex >= chapterIndex ? 1 : -1);
      setChapterIndex(nextIndex);
      if (chapters[nextIndex]?.kind !== "rsvp") {
        setRsvpDrawerOpen(false);
      }
    },
    [chapterIndex, chapters]
  );

  // Keyboard Left/Right navigation once open
  useEffect(() => {
    if (!isOpened) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowRight") {
        goToChapter(chapterIndex + 1);
      } else if (e.key === "ArrowLeft") {
        goToChapter(chapterIndex - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpened, chapterIndex, goToChapter]);

  const handleDragEnd = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (rsvpDrawerOpen) return;
    if (info.offset.x < -56 && chapterIndex < chapters.length - 1) {
      goToChapter(chapterIndex + 1);
    } else if (info.offset.x > 56 && chapterIndex > 0) {
      goToChapter(chapterIndex - 1);
    }
  };

  const toggleRsvpEvent = (eventId: EventId) => {
    setRsvpSubmitted(false);
    setRsvpEvents((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRsvpSaving(true);
    setRsvpError(null);
    try {
      const res = await fetch(
        `/api/invite/${encodeURIComponent(payload.guest.unique_code)}/rsvp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rsvp_status: rsvpStatus,
            rsvp_events: rsvpStatus === "declined" ? [] : rsvpEvents,
            rsvp_guests_count: rsvpCount,
            rsvp_note: rsvpNote.trim() || null,
          }),
        }
      );
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Could not save response");
      }
      setRsvpSubmitted(true);
    } catch (err) {
      setRsvpError(
        err instanceof Error ? err.message : "Could not save response"
      );
    } finally {
      setRsvpSaving(false);
    }
  };

  const currentChapter = chapters[chapterIndex];
  const eventCount = payload.permitted_events.length;
  const ceremonyCountLabel =
    eventCount === 1 ? "1 ceremony" : `${eventCount} ceremonies`;

  const dateSpanLabel = useMemo(() => {
    if (payload.permitted_events.length === 0) {
      return payload.copy.date_range_label || "November – December 2026";
    }
    if (payload.permitted_events.length === 1) {
      return payload.permitted_events[0].date;
    }
    const first = payload.permitted_events[0].date;
    const last =
      payload.permitted_events[payload.permitted_events.length - 1].date;
    return first === last ? first : `${first} — ${last}`;
  }, [payload.copy.date_range_label, payload.permitted_events]);

  const closingFamily = useMemo(
    () =>
      extractClosingFamily(
        payload.parents.groom_parents,
        payload.parents.bride_parents
      ),
    [payload.parents.bride_parents, payload.parents.groom_parents]
  );

  // Reusable RSVP form panel (shared across stationery and heritage drawer modes)
  const renderRsvpForm = (compact?: boolean) => (
    <form
      onSubmit={handleRsvpSubmit}
      className={`flex flex-col ${compact ? "gap-2 sm:gap-3" : "gap-4"}`}
    >
      <div>
        <p
          className="text-[11px] sm:text-[12px] font-mono-tabular mb-0.5"
          style={{ color: theme.accent }}
        >
          Confirm attendance
        </p>
        <h2
          className={`font-serif-display leading-[1.12] font-normal ${
            compact ? "text-[20px] sm:text-[24px]" : "text-[30px]"
          }`}
          style={{ color: theme.textPrimary }}
        >
          Kindly respond
        </h2>
        <p
          className="text-[11px] sm:text-[13px] mt-0.5 leading-snug"
          style={{ color: theme.textSecondary }}
        >
          Respond for {ceremonyCountLabel} assigned to {payload.guest.guest_name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => {
            setRsvpStatus("attending");
            setRsvpSubmitted(false);
          }}
          className={`${
            compact ? "h-8 sm:h-10" : "h-10"
          } rounded-lg border text-[11px] sm:text-[13px] font-medium transition-colors duration-150 cursor-pointer`}
          style={{
            backgroundColor:
              rsvpStatus === "attending" ? theme.accentSoft : theme.bgRaised,
            borderColor:
              rsvpStatus === "attending" ? theme.accent : theme.hairline,
            color:
              rsvpStatus === "attending" ? theme.accent : theme.textPrimary,
          }}
        >
          Joyfully attending
        </button>

        <button
          type="button"
          onClick={() => {
            setRsvpStatus("declined");
            setRsvpSubmitted(false);
          }}
          className={`${
            compact ? "h-8 sm:h-10" : "h-10"
          } rounded-lg border text-[11px] sm:text-[13px] font-medium transition-colors duration-150 cursor-pointer`}
          style={{
            backgroundColor:
              rsvpStatus === "declined" ? theme.accentSoft : theme.bgRaised,
            borderColor:
              rsvpStatus === "declined" ? theme.accent : theme.hairline,
            color: rsvpStatus === "declined" ? theme.accent : theme.textPrimary,
          }}
        >
          Unable to attend
        </button>
      </div>

      {rsvpStatus === "attending" && payload.permitted_events.length > 0 ? (
        <div>
          <p
            className={`${
              compact ? "text-[12px] sm:text-[13px] mb-1" : "text-[13px] mb-1.5"
            } font-medium`}
            style={{ color: theme.textPrimary }}
          >
            Events attending
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {payload.permitted_events.map((ev) => {
              const checked = rsvpEvents.includes(ev.id);
              return (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => toggleRsvpEvent(ev.id)}
                  className={`${
                    compact ? "px-2 py-1 sm:px-2.5 sm:py-1.5" : "px-3 py-2"
                  } rounded-lg border text-left flex items-center justify-between gap-1.5 sm:gap-2 transition-colors duration-150 cursor-pointer`}
                  style={{
                    backgroundColor: checked ? theme.accentSoft : "transparent",
                    borderColor: checked ? theme.accent : theme.hairline,
                    color: theme.textPrimary,
                  }}
                >
                  <span className="text-[11px] sm:text-[13px] truncate">
                    {ev.shortLabel}
                  </span>
                  <span
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded flex items-center justify-center border shrink-0"
                    style={{
                      backgroundColor: checked ? theme.accent : "transparent",
                      borderColor: checked ? theme.accent : theme.hairline,
                      color: theme.accentText,
                    }}
                  >
                    {checked ? (
                      <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={1.5} />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {rsvpStatus === "attending" ? (
        <div
          className={`flex items-center justify-between rounded-lg border ${
            compact ? "px-2.5 py-1.5 sm:px-4 sm:py-2" : "px-4 py-2.5"
          }`}
          style={{ borderColor: theme.hairline, backgroundColor: theme.bgRaised }}
        >
          <span
            className="text-[11px] sm:text-[13px] inline-flex items-center gap-1.5 sm:gap-2"
            style={{ color: theme.textSecondary }}
          >
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
            Number of guests
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setRsvpCount((c) => Math.max(1, c - 1));
                setRsvpSubmitted(false);
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded border text-[13px] sm:text-[14px] font-medium cursor-pointer"
              style={{
                borderColor: theme.hairline,
                backgroundColor: theme.bgCard,
                color: theme.textPrimary,
              }}
            >
              −
            </button>
            <span
              className="w-5 sm:w-6 text-center text-[13px] sm:text-[14px] font-mono-tabular"
              style={{ color: theme.textPrimary }}
            >
              {rsvpCount}
            </span>
            <button
              type="button"
              onClick={() => {
                setRsvpCount((c) => Math.min(10, c + 1));
                setRsvpSubmitted(false);
              }}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded border text-[13px] sm:text-[14px] font-medium cursor-pointer"
              style={{
                borderColor: theme.hairline,
                backgroundColor: theme.bgCard,
                color: theme.textPrimary,
              }}
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor="rsvp-note"
          className={`block ${
            compact ? "text-[11px] sm:text-[13px] mb-1" : "text-[13px] mb-1.5"
          }`}
          style={{ color: theme.textSecondary }}
        >
          Wishes or note for the families (optional)
        </label>
        <textarea
          id="rsvp-note"
          rows={compact ? 1 : 2}
          value={rsvpNote}
          onChange={(e) => {
            setRsvpNote(e.target.value);
            setRsvpSubmitted(false);
          }}
          placeholder="Write a blessing or note"
          className={`w-full rounded-lg border ${
            compact ? "px-2.5 py-1.5 text-[12px] sm:px-3 sm:py-2 sm:text-[14px]" : "px-3 py-2 text-[14px]"
          } focus:outline-none`}
          style={{
            backgroundColor: theme.bgRaised,
            borderColor: theme.hairline,
            color: theme.textPrimary,
          }}
        />
      </div>

      {rsvpError ? (
        <p className="text-[12px] sm:text-[13px]" style={{ color: "#b91c1c" }}>
          {rsvpError}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 sm:gap-3">
        <button
          type="submit"
          disabled={rsvpSaving}
          className={`${
            compact ? "h-8 sm:h-10 px-3.5 sm:px-5 text-[12px] sm:text-[14px]" : "h-10 px-5 text-[14px]"
          } rounded-lg inline-flex items-center gap-2 font-medium whitespace-nowrap transition-[transform,opacity] duration-150 active:scale-[0.98] disabled:opacity-60 cursor-pointer`}
          style={{
            backgroundColor: theme.accent,
            color: theme.accentText,
          }}
        >
          {rsvpSaving
            ? "Saving..."
            : rsvpSubmitted
              ? "Update response"
              : "Confirm response"}
        </button>
        {rsvpSubmitted ? (
          <span
            className="text-[11px] sm:text-[13px] inline-flex items-center gap-1 whitespace-nowrap"
            style={{ color: theme.accent }}
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.5} />
            Response recorded
          </span>
        ) : null}
      </div>
    </form>
  );

  // HERITAGE 9:16 ILLUSTRATED DECK ("royal-jharokha")
  if (isHeritage) {
    return (
      <div
        className="h-dvh min-h-[540px] overflow-y-auto overflow-x-hidden flex flex-col transition-colors duration-300"
        style={{
          backgroundColor: theme.bgPage,
          color: theme.textPrimary,
        }}
      >
        {isPreview ? (
          <div
            className="shrink-0 w-full px-3 py-1.5 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 text-[12px] sm:text-[13px] border-b"
            style={{
              backgroundColor: theme.bgRaised,
              borderColor: theme.hairline,
              color: theme.textSecondary,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: theme.accent }}
              />
              <span className="truncate">
                Preview:{" "}
                <strong style={{ color: theme.textPrimary, fontWeight: 500 }}>
                  {payload.guest.guest_name}
                </strong>{" "}
                · {ceremonyCountLabel}
              </span>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-[12px] sm:text-[13px] font-medium hover:underline shrink-0"
              style={{ color: theme.accent }}
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span className="sm:hidden">Dashboard</span>
              <span className="hidden sm:inline">Back to dashboard</span>
            </Link>
          </div>
        ) : null}

        <main className="flex-1 min-h-0 flex flex-col items-center justify-center px-2.5 py-2 sm:px-6 sm:py-4">
          <div className="w-full max-w-[430px] flex-1 min-h-0 flex flex-col gap-1.5 sm:gap-2.5">
            {/* Compact header bar when open */}
            {isOpened ? (
              <div className="shrink-0 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => {
                    setRsvpDrawerOpen(false);
                    setIsOpened(false);
                  }}
                  className="text-[12px] sm:text-[13px] inline-flex items-center gap-1.5 min-w-0 transition-opacity duration-150 hover:opacity-75 cursor-pointer"
                  style={{ color: theme.textMuted }}
                >
                  <span
                    className="font-heritage-serif text-[14px] sm:text-[15px] font-medium shrink-0"
                    style={{ color: theme.textPrimary }}
                  >
                    {payload.couple.groom.slice(0, 1)} &amp;{" "}
                    {payload.couple.bride.slice(0, 1)}
                  </span>
                  <span className="shrink-0">·</span>
                  <span className="truncate">{payload.guest.guest_name}</span>
                </button>
                <span
                  className="text-[12px] font-mono-tabular shrink-0 ml-2"
                  style={{ color: theme.textMuted }}
                >
                  {chapterIndex + 1} / {chapters.length}
                </span>
              </div>
            ) : null}

            <AnimatePresence mode="wait">
              {!isOpened ? (
                /* Sealed Heritage Cover Card (9:16 Sandstone Arch & Ceremonial Elephants) */
                <motion.section
                  key="heritage-cover-sealed"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="flex-1 min-h-0 w-full flex flex-col"
                >
                  <div
                    className="flex-1 min-h-0 w-full flex items-center justify-center"
                    style={{ containerType: "size" }}
                  >
                    <div
                      className="relative rounded-2xl overflow-hidden border border-[#1f1b16]/12 shadow-[0_8px_24px_rgba(31,27,22,0.09)] bg-[#e8eef5]"
                      style={{
                        width: "min(100cqw, calc(100cqh * 9 / 16))",
                        aspectRatio: "9 / 16",
                        containerType: "inline-size",
                      }}
                    >
                      {/* Illustrated 9:16 background */}
                      <img
                        src="/cards/cover-elephants.jpg"
                        alt="Carved sandstone arch framing lotus pillars and royal ceremonial elephants"
                        className="absolute inset-0 w-full h-full object-cover select-none"
                        draggable={false}
                      />
                      {/* Gentle morning sky contrast layer in upper center */}
                      <div
                        className="absolute inset-x-0 top-0 h-[58%] pointer-events-none"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(246, 250, 255, 0.56) 0%, rgba(246, 250, 255, 0.34) 55%, rgba(246, 250, 255, 0) 100%)",
                        }}
                      />

                      {/* Top Blessing Quote strictly inside upper morning sky band */}
                      <p
                        className="relative z-10 leading-[1.26] font-medium text-[#a31d47] text-center px-[3cqw] pt-[2cqw] max-w-[92cqw] mx-auto"
                        style={{ fontSize: "clamp(8px, 2.7cqw, 12px)" }}
                      >
                        {payload.copy.cover_quote}
                      </p>

                      {/* Carved Jharokha Arch Interior Typography (20%..55% height, inset safely between lotus stalks) */}
                      <div className="absolute inset-x-0 top-[20%] z-10 flex flex-col items-center text-center px-[14cqw]">
                        <AmCrest
                          groom={payload.couple.groom}
                          bride={payload.couple.bride}
                          hashtag={payload.couple.hashtag}
                          tone="rose"
                          className="mb-[0.6cqw] shrink-0"
                          style={{ width: "14cqw", height: "14cqw" }}
                        />

                        <p
                          className="text-[#354624] font-medium leading-[1.2] mb-[0.6cqw] max-w-[54cqw]"
                          style={{ fontSize: "clamp(7.5px, 2.6cqw, 11.5px)" }}
                        >
                          ({payload.copy.groom_parent_prefix ? `${payload.copy.groom_parent_prefix} ` : ""}
                          {payload.parents.groom_parents})
                        </p>

                        <h1
                          className="font-calligraphy leading-[1.04] font-normal text-[#b92252]"
                          style={{ fontSize: "clamp(21px, 8.3cqw, 36px)" }}
                        >
                          {payload.couple.groom}
                        </h1>

                        <p
                          className="font-heritage-serif font-medium tracking-[0.04em] text-[#5e6b34]"
                          style={{ fontSize: "clamp(9px, 3cqw, 13.5px)" }}
                        >
                          Weds
                        </p>

                        <p
                          className="font-calligraphy leading-[1.04] font-normal text-[#b92252]"
                          style={{ fontSize: "clamp(21px, 8.3cqw, 36px)" }}
                        >
                          {payload.couple.bride}
                        </p>

                        <p
                          className="text-[#354624] font-medium leading-[1.2] mt-[0.6cqw] max-w-[54cqw]"
                          style={{ fontSize: "clamp(7.5px, 2.6cqw, 11.5px)" }}
                        >
                          ({payload.copy.bride_parent_prefix ? `${payload.copy.bride_parent_prefix} ` : ""}
                          {payload.parents.bride_parents})
                        </p>
                      </div>

                      {/* Personal guest pass bar anchored cleanly along bottom floor */}
                      <div className="absolute inset-x-[2.8cqw] bottom-[2.6cqw] z-10">
                        <div className="w-full rounded-[2.8cqw] bg-[#fdfbf7]/95 backdrop-blur-sm border border-[#1f1b16]/12 px-[3cqw] py-[2cqw] flex items-center justify-between gap-[2cqw] text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                          <div className="min-w-0">
                            <p
                              className="text-[#756c60] leading-tight"
                              style={{ fontSize: "clamp(8.5px, 2.6cqw, 11.5px)" }}
                            >
                              Personal invitation for
                            </p>
                            <p
                              className="font-heritage-serif leading-tight font-medium text-[#1f1b16] truncate"
                              style={{ fontSize: "clamp(13px, 4.1cqw, 18px)" }}
                            >
                              {payload.guest.guest_name}
                            </p>
                            <p
                              className="text-[#5e554a] tabular-nums leading-tight mt-[0.4cqw]"
                              style={{ fontSize: "clamp(8.5px, 2.7cqw, 12px)" }}
                            >
                              {ceremonyCountLabel} · Folio{" "}
                              <span className="font-mono-tabular">
                                {payload.guest.unique_code}
                              </span>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setIsOpened(true);
                              if (payload.permitted_events.length > 0) {
                                goToChapter(1);
                              } else {
                                goToChapter(0);
                              }
                            }}
                            className="rounded-lg bg-[#b92854] hover:bg-[#9c2046] text-[#fdfbf7] font-medium inline-flex items-center gap-[1.2cqw] shrink-0 whitespace-nowrap transition-[transform,background-color] duration-150 active:scale-[0.98] cursor-pointer"
                            style={{
                              height: "clamp(28px, 8.5cqw, 38px)",
                              paddingInline: "clamp(10px, 3.2cqw, 14px)",
                              fontSize: "clamp(10.5px, 3.1cqw, 13.5px)",
                            }}
                          >
                            Open invitation
                            <ArrowRight
                              className="w-[3.5cqw] h-[3.5cqw] min-w-[12px] min-h-[12px] max-w-[16px] max-h-[16px]"
                              strokeWidth={1.5}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.section>
              ) : (
                /* Open Interactive 9:16 Heritage Deck */
                <motion.section
                  key="heritage-open-deck"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className="flex-1 min-h-0 w-full flex flex-col gap-1.5 sm:gap-2.5"
                >
                  <div
                    className="flex-1 min-h-0 w-full flex items-center justify-center"
                    style={{ containerType: "size" }}
                  >
                    <div
                      className="relative rounded-2xl overflow-hidden border border-[#1f1b16]/12 shadow-[0_8px_24px_rgba(31,27,22,0.09)] bg-[#e8eef5]"
                      style={{
                        width: "min(100cqw, calc(100cqh * 9 / 16))",
                        aspectRatio: "9 / 16",
                        containerType: "inline-size",
                      }}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div
                          key={currentChapter.id}
                          initial={{ opacity: 0, x: direction * 24 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: direction * -24 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          drag={rsvpDrawerOpen ? false : "x"}
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.12}
                          onDragEnd={handleDragEnd}
                          className="relative w-full h-full flex flex-col"
                        >
                          {currentChapter.kind === "overview" ? (
                            /* Chapter 0: Cover & Permitted Itinerary Index */
                            <>
                              <img
                                src="/cards/cover-elephants.jpg"
                                alt="Wedding invitation cover arch with royal ceremonial elephants"
                                className="absolute inset-0 w-full h-full object-cover select-none"
                                draggable={false}
                              />
                              <div
                                className="absolute inset-x-0 top-0 h-[62%] pointer-events-none"
                                style={{
                                  background:
                                    "linear-gradient(180deg, rgba(246, 250, 255, 0.72) 0%, rgba(246, 250, 255, 0.52) 65%, rgba(246, 250, 255, 0) 100%)",
                                }}
                              />

                              <p
                                className="relative z-10 leading-[1.26] font-medium text-[#a31d47] text-center px-[3cqw] pt-[2cqw] max-w-[92cqw] mx-auto"
                                style={{ fontSize: "clamp(8px, 2.7cqw, 12px)" }}
                              >
                                {payload.copy.cover_quote}
                              </p>

                              <div className="absolute inset-x-0 top-[20%] z-10 flex flex-col items-center text-center px-[14cqw]">
                                <AmCrest
                                  groom={payload.couple.groom}
                                  bride={payload.couple.bride}
                                  hashtag={payload.couple.hashtag}
                                  tone="rose"
                                  className="mb-[0.6cqw] shrink-0"
                                  style={{ width: "14cqw", height: "14cqw" }}
                                />
                                <p
                                  className="text-[#354624] font-medium leading-[1.2] mb-[0.6cqw] max-w-[54cqw]"
                                  style={{
                                    fontSize: "clamp(7.5px, 2.6cqw, 11.5px)",
                                  }}
                                >
                                  ({payload.copy.groom_parent_prefix ? `${payload.copy.groom_parent_prefix} ` : ""}
                                  {payload.parents.groom_parents})
                                </p>
                                <h2
                                  className="font-calligraphy leading-[1.04] font-normal text-[#b92252]"
                                  style={{
                                    fontSize: "clamp(21px, 8.3cqw, 36px)",
                                  }}
                                >
                                  {payload.couple.groom}
                                </h2>
                                <p
                                  className="font-heritage-serif font-medium tracking-[0.04em] text-[#5e6b34]"
                                  style={{
                                    fontSize: "clamp(9px, 3cqw, 13.5px)",
                                  }}
                                >
                                  Weds
                                </p>
                                <p
                                  className="font-calligraphy leading-[1.04] font-normal text-[#b92252]"
                                  style={{
                                    fontSize: "clamp(21px, 8.3cqw, 36px)",
                                  }}
                                >
                                  {payload.couple.bride}
                                </p>
                                <p
                                  className="text-[#354624] font-medium leading-[1.2] mt-[0.6cqw] max-w-[54cqw]"
                                  style={{
                                    fontSize: "clamp(7.5px, 2.6cqw, 11.5px)",
                                  }}
                                >
                                  ({payload.copy.bride_parent_prefix ? `${payload.copy.bride_parent_prefix} ` : ""}
                                  {payload.parents.bride_parents})
                                </p>
                              </div>

                              {/* Compact ceremony jump dock at bottom floor leaving ceremonial elephants uncovered */}
                              <div className="absolute inset-x-[2.8cqw] bottom-[2.6cqw] z-10 rounded-[2.6cqw] bg-[#fdfbf7]/95 backdrop-blur-sm border border-[#1f1b16]/12 px-[2.8cqw] py-[2cqw] text-left shadow-[0_2px_10px_rgba(0,0,0,0.06)]">
                                <div className="flex items-center justify-between gap-2 mb-[1.2cqw]">
                                  <span
                                    className="font-medium text-[#1f1b16] shrink-0"
                                    style={{
                                      fontSize: "clamp(8.5px, 2.6cqw, 11.5px)",
                                    }}
                                  >
                                    Invited ({eventCount})
                                  </span>
                                  <span
                                    className="font-mono-tabular text-[#756c60] truncate"
                                    style={{
                                      fontSize: "clamp(8.5px, 2.5cqw, 11px)",
                                    }}
                                  >
                                    {dateSpanLabel
                                      .split("—")[0]
                                      .trim()
                                      .replace(/^[A-Za-z]+day\s+/i, "")}
                                  </span>
                                </div>
                                {payload.permitted_events.length === 0 ? (
                                  <p
                                    className="text-[#5e554a]"
                                    style={{
                                      fontSize: "clamp(9px, 2.8cqw, 12px)",
                                    }}
                                  >
                                    No ceremonies assigned yet
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-[1.2cqw]">
                                    {payload.permitted_events.map(
                                      (ev, idx) => (
                                        <button
                                          key={ev.id}
                                          type="button"
                                          onClick={() => goToChapter(idx + 1)}
                                          className="rounded-md bg-[#f3eee4] hover:bg-[#e8e0d0] border border-[#1f1b16]/10 font-medium text-[#1f1b16] transition-colors duration-150 cursor-pointer"
                                          style={{
                                            padding: "0.9cqw 2.4cqw",
                                            fontSize:
                                              "clamp(9px, 2.75cqw, 12px)",
                                          }}
                                        >
                                          {ev.shortLabel}
                                        </button>
                                      )
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          ) : currentChapter.kind === "event" ? (
                            /* Chapters 1..N: Heritage Ceremony Card */
                            (() => {
                              const ev = currentChapter.event;
                              const scene =
                                HERITAGE_EVENT_SCENES[ev.id] ??
                                HERITAGE_EVENT_SCENES.wedding;
                              const mapHref = getEventMapHref(ev);
                              const isDinnerCard = ev.id === "dinner";

                              return (
                                <>
                                  <img
                                    src={scene.imageSrc}
                                    alt={ev.title}
                                    className="absolute inset-0 w-full h-full object-cover select-none"
                                    draggable={false}
                                  />
                                  <div
                                    className="absolute inset-0 pointer-events-none"
                                    style={{ background: scene.scrimGradient }}
                                  />

                                  {/* Corner index & countdown badges kept outside center flow to preserve upper sky */}
                                  <div className="absolute inset-x-[2.8cqw] top-[2.6cqw] z-10 flex items-center justify-between pointer-events-none">
                                    <span
                                      className="font-mono-tabular rounded-md border"
                                      style={{
                                        fontSize: "clamp(8px, 2.5cqw, 11px)",
                                        padding: "0.4cqw 1.8cqw",
                                        color: scene.isNightSky
                                          ? "#e6edf7"
                                          : "#4a3310",
                                        borderColor: scene.isNightSky
                                          ? "rgba(253,251,247,0.22)"
                                          : "rgba(31,27,22,0.16)",
                                        backgroundColor: scene.isNightSky
                                          ? "rgba(8,25,56,0.58)"
                                          : "rgba(253,251,247,0.78)",
                                      }}
                                    >
                                      {String(chapterIndex).padStart(2, "0")}{" "}
                                      / {String(eventCount).padStart(2, "0")}
                                    </span>
                                    <span
                                      className="font-mono-tabular rounded-md border"
                                      style={{
                                        fontSize: "clamp(8px, 2.5cqw, 11px)",
                                        padding: "0.4cqw 1.8cqw",
                                        color: scene.isNightSky
                                          ? "#e6edf7"
                                          : "#4a3310",
                                        borderColor: scene.isNightSky
                                          ? "rgba(253,251,247,0.22)"
                                          : "rgba(31,27,22,0.16)",
                                        backgroundColor: scene.isNightSky
                                          ? "rgba(8,25,56,0.58)"
                                          : "rgba(253,251,247,0.78)",
                                      }}
                                    >
                                      {getCountdownLabel(ev.isoStart)}
                                    </span>
                                  </div>

                                  <div
                                    className="relative z-10 h-full flex flex-col justify-between text-center"
                                    style={{ padding: "2.4cqw 4.5cqw 2.8cqw" }}
                                  >
                                    {/* Upper open sky content zone (stays cleanly above scene horizon) */}
                                    <div className="flex flex-col items-center">
                                      <AmCrest
                                        groom={payload.couple.groom}
                                        bride={payload.couple.bride}
                                        hashtag={payload.couple.hashtag}
                                        tone={scene.crestTone}
                                        className="shrink-0"
                                        style={{
                                          width: "13.5cqw",
                                          height: "13.5cqw",
                                        }}
                                      />

                                      {ev.tagline ? (
                                        <p
                                          className="leading-[1.24] max-w-[70cqw]"
                                          style={{
                                            color: scene.subtitleColor,
                                            fontSize:
                                              "clamp(8px, 2.65cqw, 12px)",
                                            marginTop: "0.8cqw",
                                            marginBottom: "0.4cqw",
                                          }}
                                        >
                                          {ev.tagline}
                                        </p>
                                      ) : null}

                                      {ev.host?.trim() ? (
                                        <p
                                          className="font-heritage-serif tracking-[0.04em] font-medium"
                                          style={{
                                            color: scene.subtitleColor,
                                            fontSize:
                                              "clamp(8.5px, 2.9cqw, 13px)",
                                            marginTop: "0.4cqw",
                                          }}
                                        >
                                          {ev.id === "sangeet"
                                            ? ev.host.trim()
                                            : `Hosted by ${ev.host.trim()}`}
                                        </p>
                                      ) : ev.id === "sangeet" &&
                                        ev.title.trim() ===
                                          "Mosariya Sangeet" ? (
                                        <p
                                          className="font-heritage-serif tracking-[0.04em] font-medium"
                                          style={{
                                            color: scene.subtitleColor,
                                            fontSize:
                                              "clamp(10px, 3.4cqw, 15px)",
                                            marginTop: "0.4cqw",
                                          }}
                                        >
                                          Mosariya
                                        </p>
                                      ) : null}

                                      <h2
                                        className={
                                          scene.titleKind === "script"
                                            ? isDinnerCard
                                              ? "font-calligraphy leading-[1.06] font-normal"
                                              : "font-calligraphy leading-[1.04] font-normal"
                                            : "font-heritage-serif leading-[1.06] font-medium tracking-[0.03em]"
                                        }
                                        style={{
                                          color: scene.titleColor,
                                          fontSize:
                                            scene.titleKind === "script"
                                              ? isDinnerCard
                                                ? "clamp(19px, 7cqw, 33px)"
                                                : "clamp(25px, 9.4cqw, 44px)"
                                              : "clamp(21px, 7.6cqw, 35px)",
                                          marginTop: "0.4cqw",
                                        }}
                                      >
                                        {ev.id === "sangeet" &&
                                        ev.title.trim() ===
                                          "Mosariya Sangeet" &&
                                        !ev.host?.trim()
                                          ? "Sangeet"
                                          : ev.id === "reception_jariwala" &&
                                              ev.title.trim() ===
                                                "Wedding Reception"
                                            ? "Reception"
                                            : ev.title}
                                      </h2>

                                      {ev.subtitle ? (
                                        <p
                                          className={`leading-[1.24] ${
                                            isDinnerCard
                                              ? "max-w-[66cqw]"
                                              : "max-w-[74cqw]"
                                          }`}
                                          style={{
                                            color: scene.subtitleColor,
                                            fontSize:
                                              "clamp(8px, 2.65cqw, 12px)",
                                            marginTop: "0.8cqw",
                                          }}
                                        >
                                          {ev.subtitle}
                                        </p>
                                      ) : null}

                                      <div
                                        className="border-b border-dashed"
                                        style={{
                                          borderColor: scene.dividerColor,
                                          width: "32cqw",
                                          marginBlock: "1.4cqw",
                                        }}
                                      />

                                      <p
                                        className="font-heritage-serif leading-tight font-medium tabular-nums"
                                        style={{
                                          color: scene.dateColor,
                                          fontSize:
                                            "clamp(13px, 4.7cqw, 22px)",
                                        }}
                                      >
                                        {ev.date}
                                      </p>
                                      <p
                                        className="font-heritage-serif font-medium tabular-nums"
                                        style={{
                                          color: scene.metaColor,
                                          fontSize:
                                            "clamp(10px, 3.4cqw, 15px)",
                                          marginTop: "0.4cqw",
                                        }}
                                      >
                                        {ev.time}
                                      </p>

                                      <div
                                        className="max-w-[74cqw]"
                                        style={{ marginTop: "1.2cqw" }}
                                      >
                                        <p
                                          className="font-heritage-serif font-medium tracking-[0.02em]"
                                          style={{
                                            color: scene.dateColor,
                                            fontSize:
                                              "clamp(9.5px, 3.1cqw, 14px)",
                                          }}
                                        >
                                          Venue
                                        </p>
                                        <p
                                          className="leading-[1.24] font-medium"
                                          style={{
                                            color: scene.metaColor,
                                            fontSize:
                                              "clamp(8.5px, 2.8cqw, 13px)",
                                            marginTop: "0.3cqw",
                                          }}
                                        >
                                          {ev.venue}
                                        </p>
                                      </div>

                                      {/* Direct Map & Calendar actions in one compact row */}
                                      <div
                                        className="flex flex-wrap items-center justify-center"
                                        style={{
                                          marginTop: "1.4cqw",
                                          gap: "1.8cqw",
                                        }}
                                      >
                                        <a
                                          href={mapHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="rounded-lg inline-flex items-center font-medium border whitespace-nowrap transition-[transform,background-color] duration-150 active:scale-[0.98]"
                                          style={{
                                            height: "clamp(22px, 6.5cqw, 29px)",
                                            paddingInline:
                                              "clamp(7px, 2.4cqw, 11px)",
                                            fontSize:
                                              "clamp(8.5px, 2.7cqw, 12px)",
                                            gap: "1.2cqw",
                                            backgroundColor: scene.isNightSky
                                              ? "rgba(253, 251, 247, 0.14)"
                                              : "rgba(253, 251, 247, 0.86)",
                                            borderColor: scene.isNightSky
                                              ? "rgba(253, 251, 247, 0.28)"
                                              : "rgba(31, 27, 22, 0.16)",
                                            color: scene.isNightSky
                                              ? "#fdfbf7"
                                              : "#1f1b16",
                                          }}
                                        >
                                          <MapPin
                                            className="w-[3cqw] h-[3cqw] min-w-[10px] min-h-[10px] max-w-[14px] max-h-[14px]"
                                            strokeWidth={1.5}
                                          />
                                          Click for location
                                          <ExternalLink
                                            className="w-[2.6cqw] h-[2.6cqw] min-w-[9px] min-h-[9px] max-w-[12px] max-h-[12px] opacity-80"
                                            strokeWidth={1.5}
                                          />
                                        </a>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            downloadIcsFile(ev, payload.couple)
                                          }
                                          className="rounded-lg inline-flex items-center font-medium border whitespace-nowrap transition-[transform,background-color] duration-150 active:scale-[0.98] cursor-pointer"
                                          style={{
                                            height: "clamp(22px, 6.5cqw, 29px)",
                                            paddingInline:
                                              "clamp(7px, 2.4cqw, 11px)",
                                            fontSize:
                                              "clamp(8.5px, 2.7cqw, 12px)",
                                            gap: "1.2cqw",
                                            backgroundColor: scene.isNightSky
                                              ? "rgba(253, 251, 247, 0.08)"
                                              : "rgba(253, 251, 247, 0.72)",
                                            borderColor: scene.isNightSky
                                              ? "rgba(253, 251, 247, 0.22)"
                                              : "rgba(31, 27, 22, 0.14)",
                                            color: scene.isNightSky
                                              ? "#e6edf7"
                                              : "#3f382e",
                                          }}
                                        >
                                          <CalendarPlus
                                            className="w-[3cqw] h-[3cqw] min-w-[10px] min-h-[10px] max-w-[14px] max-h-[14px]"
                                            strokeWidth={1.5}
                                          />
                                          Add to calendar
                                        </button>
                                      </div>
                                    </div>

                                    {/* Subtle bottom attire badge kept slim so artwork shines */}
                                    {ev.attire ? (
                                      <div className="flex justify-center">
                                        <span
                                          className="inline-flex items-center rounded-lg bg-[#161411]/72 text-[#fdfbf7] backdrop-blur-sm"
                                          style={{
                                            padding: "0.8cqw 2.8cqw",
                                            fontSize:
                                              "clamp(8.5px, 2.7cqw, 12px)",
                                          }}
                                        >
                                          {ev.attire}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                </>
                              );
                            })()
                          ) : (
                            /* Final Chapter: Closing Regards & Interactive RSVP Sheet */
                            <>
                              <img
                                src="/cards/closing-elephants.jpg"
                                alt="With warm regards under floral mandap framed by royal ceremonial elephants"
                                className="absolute inset-0 w-full h-full object-cover select-none"
                                draggable={false}
                              />
                              <div
                                className="absolute inset-x-0 top-0 h-[50%] pointer-events-none"
                                style={{
                                  background:
                                    "linear-gradient(180deg, rgba(246, 250, 255, 0.62) 0%, rgba(246, 250, 255, 0.35) 60%, rgba(246, 250, 255, 0) 100%)",
                                }}
                              />

                              <div
                                className="relative z-10 h-full flex flex-col items-center justify-start text-center"
                                style={{ padding: "3.4cqw 5cqw" }}
                              >
                                <div className="flex flex-col items-center mt-[0.8cqw]">
                                  <AmCrest
                                    groom={payload.couple.groom}
                                    bride={payload.couple.bride}
                                    hashtag={payload.couple.hashtag}
                                    tone="rose"
                                    className="shrink-0"
                                    style={{
                                      width: "15.5cqw",
                                      height: "15.5cqw",
                                      marginBottom: "1.2cqw",
                                    }}
                                  />

                                  <div
                                    className="flex items-center gap-[1.8cqw] text-[#5e6b34] font-medium"
                                    style={{
                                      fontSize: "clamp(9px, 3cqw, 13px)",
                                    }}
                                  >
                                    <span className="w-[4.5cqw] h-px bg-[#5e6b34]/50" />
                                    <span>{payload.copy.closing_kicker}</span>
                                    <span className="w-[4.5cqw] h-px bg-[#5e6b34]/50" />
                                  </div>

                                  <h2
                                    className="font-heritage-serif leading-tight font-normal text-[#b92252]"
                                    style={{
                                      fontSize: "clamp(22px, 8cqw, 36px)",
                                      marginTop: "0.8cqw",
                                    }}
                                  >
                                    {payload.copy.closing_heading.trim() ||
                                      closingFamily.heading}
                                  </h2>
                                  <p
                                    className="font-heritage-serif tracking-[0.06em] text-[#5e6b34] font-medium"
                                    style={{
                                      fontSize: "clamp(10px, 3.3cqw, 14px)",
                                    }}
                                  >
                                    {payload.copy.closing_subheading ||
                                      closingFamily.subheading}
                                  </p>
                                </div>
                              </div>

                              {/* Slide-up Frosted RSVP Form Overlay inside the card */}
                              <AnimatePresence>
                                {rsvpDrawerOpen ? (
                                  <motion.div
                                    initial={{ opacity: 0, y: 28 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 28 }}
                                    transition={{ duration: 0.28, ease: EASE }}
                                    className="absolute inset-0 z-20 bg-[#fdfbf7]/96 backdrop-blur-md p-3 sm:p-5 overflow-y-auto flex flex-col justify-start gap-2 sm:gap-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] sm:text-[12px] font-mono-tabular text-[#756c60]">
                                        Folio {payload.guest.unique_code}
                                      </span>
                                      <button
                                        type="button"
                                        aria-label="Close RSVP form"
                                        onClick={() => setRsvpDrawerOpen(false)}
                                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[#5e554a] hover:bg-[#eae3d5] cursor-pointer"
                                      >
                                        <X
                                          className="w-4 h-4"
                                          strokeWidth={1.5}
                                        />
                                      </button>
                                    </div>
                                    {renderRsvpForm(true)}
                                  </motion.div>
                                ) : null}
                              </AnimatePresence>
                            </>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Chapter Pagination Strip & Prev/Next */}
                  <div className="shrink-0 flex flex-col gap-1.5 sm:gap-2">
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {chapters.map((chapter, idx) => {
                        const active = idx === chapterIndex;
                        return (
                          <button
                            key={chapter.id}
                            ref={active ? activePillRef : undefined}
                            type="button"
                            onClick={() => goToChapter(idx)}
                            className="h-7 sm:h-8 px-2.5 sm:px-3 rounded-lg text-[12px] sm:text-[13px] whitespace-nowrap border transition-colors duration-150 cursor-pointer shrink-0"
                            style={{
                              backgroundColor: active
                                ? theme.accentSoft
                                : theme.bgCard,
                              borderColor: active
                                ? theme.accent
                                : theme.hairline,
                              color: active
                                ? theme.accent
                                : theme.textSecondary,
                              fontWeight: active ? 500 : 400,
                            }}
                          >
                            {chapter.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => goToChapter(chapterIndex - 1)}
                        disabled={chapterIndex === 0}
                        className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-lg border inline-flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] disabled:opacity-40 transition-colors duration-150 cursor-pointer disabled:cursor-default shrink-0"
                        style={{
                          backgroundColor: theme.bgCard,
                          borderColor: theme.hairline,
                          color: theme.textPrimary,
                        }}
                      >
                        <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                        Previous
                      </button>

                      {currentChapter.kind === "rsvp" ? (
                        <button
                          type="button"
                          onClick={() => setRsvpDrawerOpen(true)}
                          className="h-8 sm:h-9 px-3 sm:px-4 rounded-lg inline-flex items-center justify-center text-[12px] sm:text-[13px] font-medium whitespace-nowrap transition-colors duration-150 active:scale-[0.98] cursor-pointer"
                          style={{
                            backgroundColor: theme.accent,
                            color: theme.accentText,
                          }}
                        >
                          {rsvpSubmitted ? "Update RSVP" : "Confirm RSVP"}
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => goToChapter(chapterIndex + 1)}
                        disabled={chapterIndex === chapters.length - 1}
                        className="h-8 sm:h-9 px-2.5 sm:px-3.5 rounded-lg border inline-flex items-center gap-1 sm:gap-1.5 text-[12px] sm:text-[13px] disabled:opacity-40 transition-colors duration-150 cursor-pointer disabled:cursor-default shrink-0"
                        style={{
                          backgroundColor: theme.bgCard,
                          borderColor: theme.hairline,
                          color: theme.textPrimary,
                        }}
                      >
                        Next
                        <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    );
  }

  // CLASSIC STATIONERY FOLIO TEMPLATES ("ivory-vermilion", "salabatpura-dusk", "marigold-press")
  return (
    <div
      className="min-h-dvh overflow-x-hidden flex flex-col justify-between transition-colors duration-300"
      style={{
        backgroundColor: theme.bgPage,
        color: theme.textPrimary,
      }}
    >
      {isPreview ? (
        <div
          className="w-full px-3 py-1.5 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 text-[12px] sm:text-[13px] border-b"
          style={{
            backgroundColor: theme.bgRaised,
            borderColor: theme.hairline,
            color: theme.textSecondary,
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-block w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: theme.accent }}
            />
            <span className="truncate">
              Preview:{" "}
              <strong style={{ color: theme.textPrimary, fontWeight: 500 }}>
                {payload.guest.guest_name}
              </strong>{" "}
              · {ceremonyCountLabel}
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[12px] sm:text-[13px] font-medium hover:underline shrink-0"
            style={{ color: theme.accent }}
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span className="sm:hidden">Dashboard</span>
            <span className="hidden sm:inline">Back to dashboard</span>
          </Link>
        </div>
      ) : null}

      <main className="flex-1 flex flex-col items-center justify-center px-3 py-4 sm:px-6 sm:py-10">
        <div className="w-full max-w-[580px]">
          <AnimatePresence mode="wait">
            {!isOpened ? (
              <motion.section
                key="sealed-cover"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-2xl p-2 border"
                style={{
                  backgroundColor: theme.bgCard,
                  borderColor: theme.hairline,
                  boxShadow: theme.isDark
                    ? "none"
                    : "0 8px 24px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  className="rounded-lg border px-6 py-8 sm:px-10 sm:py-12 flex flex-col items-center text-center"
                  style={{ borderColor: theme.hairline }}
                >
                  <div
                    className="w-full flex items-center justify-between text-[12px] font-mono-tabular mb-8"
                    style={{ color: theme.textMuted }}
                  >
                    <span>{payload.couple.hashtag}</span>
                    <span>Folio {payload.guest.unique_code}</span>
                  </div>

                  <CeremonyIllustration
                    kind="crest"
                    accentColor={theme.accent}
                    inkColor={theme.textPrimary}
                    className="w-24 h-24 mb-6"
                  />

                  <p
                    className="text-[13px] mb-2"
                    style={{ color: theme.textMuted }}
                  >
                    {payload.copy.classic_blessing}
                  </p>

                  <h1 className="font-serif-display text-[36px] sm:text-[46px] leading-[1.08] font-normal tracking-[-0.02em] mb-4">
                    {payload.couple.bride}{" "}
                    <span style={{ color: theme.accent }}>&amp;</span>{" "}
                    {payload.couple.groom}
                  </h1>

                  <div
                    className="w-12 h-px my-4"
                    style={{ backgroundColor: theme.hairline }}
                  />

                  <div
                    className="w-full rounded-xl px-5 py-4 my-4 border"
                    style={{
                      backgroundColor: theme.bgRaised,
                      borderColor: theme.hairline,
                    }}
                  >
                    <p
                      className="text-[12px] mb-1"
                      style={{ color: theme.textMuted }}
                    >
                      Personal invitation for
                    </p>
                    <p className="font-serif-display text-[24px] leading-[1.2] font-normal">
                      {payload.guest.guest_name}
                    </p>
                    <p
                      className="text-[13px] mt-2 tabular-nums"
                      style={{ color: theme.textSecondary }}
                    >
                      {ceremonyCountLabel}
                      {payload.copy.city_label
                        ? ` · ${payload.copy.city_label}`
                        : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpened(true)}
                    className="mt-6 h-11 px-6 rounded-lg inline-flex items-center gap-2.5 text-[14px] font-medium transition-[transform,opacity] duration-150 active:scale-[0.98] cursor-pointer"
                    style={{
                      backgroundColor: theme.accent,
                      color: theme.accentText,
                    }}
                  >
                    Open invitation
                    <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </motion.section>
            ) : (
              <motion.section
                key="open-folio"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setIsOpened(false)}
                    className="text-[13px] inline-flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-75 cursor-pointer"
                    style={{ color: theme.textMuted }}
                  >
                    <span
                      className="font-serif-display text-[15px]"
                      style={{ color: theme.textPrimary }}
                    >
                      {payload.couple.groom.slice(0, 1)} &amp;{" "}
                      {payload.couple.bride.slice(0, 1)}
                    </span>
                    <span>·</span>
                    <span>{payload.guest.guest_name}</span>
                  </button>
                  <span
                    className="text-[12px] font-mono-tabular"
                    style={{ color: theme.textMuted }}
                  >
                    {chapterIndex + 1} / {chapters.length}
                  </span>
                </div>

                <div
                  className="rounded-2xl p-2 border overflow-hidden"
                  style={{
                    backgroundColor: theme.bgCard,
                    borderColor: theme.hairline,
                    boxShadow: theme.isDark
                      ? "none"
                      : "0 8px 24px rgba(0, 0, 0, 0.05)",
                  }}
                >
                  <div
                    className="rounded-lg border min-h-[360px] sm:min-h-[460px] flex flex-col justify-between overflow-hidden"
                    style={{ borderColor: theme.hairline }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div
                        key={currentChapter.id}
                        initial={{ opacity: 0, x: direction * 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: direction * -20 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.12}
                        onDragEnd={handleDragEnd}
                        className="p-4 sm:p-8 flex-1 flex flex-col justify-between"
                      >
                        {currentChapter.kind === "overview" ? (
                          <div className="flex flex-col gap-6">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p
                                  className="text-[12px] font-mono-tabular mb-2"
                                  style={{ color: theme.accent }}
                                >
                                  {payload.couple.hashtag}
                                </p>
                                <h2 className="font-serif-display text-[30px] sm:text-[34px] leading-[1.12] font-normal tracking-[-0.02em]">
                                  {payload.couple.bride} &amp;{" "}
                                  {payload.couple.groom}
                                </h2>
                              </div>
                              <CeremonyIllustration
                                kind="crest"
                                accentColor={theme.accent}
                                inkColor={theme.textPrimary}
                                className="w-16 h-16 shrink-0"
                              />
                            </div>

                            <div
                              className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl p-4 border"
                              style={{
                                backgroundColor: theme.bgRaised,
                                borderColor: theme.hairline,
                              }}
                            >
                              <div>
                                <p
                                  className="text-[12px] mb-1"
                                  style={{ color: theme.textMuted }}
                                >
                                  Bride&apos;s parents
                                </p>
                                <p
                                  className="text-[13px] leading-relaxed"
                                  style={{ color: theme.textPrimary }}
                                >
                                  {payload.parents.bride_parents}
                                </p>
                              </div>
                              <div>
                                <p
                                  className="text-[12px] mb-1"
                                  style={{ color: theme.textMuted }}
                                >
                                  Groom&apos;s parents
                                </p>
                                <p
                                  className="text-[13px] leading-relaxed"
                                  style={{ color: theme.textPrimary }}
                                >
                                  {payload.parents.groom_parents}
                                </p>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h3
                                  className="text-[14px] font-medium"
                                  style={{ color: theme.textPrimary }}
                                >
                                  Your celebrations ({eventCount})
                                </h3>
                                <span
                                  className="text-[12px]"
                                  style={{ color: theme.textMuted }}
                                >
                                  {dateSpanLabel}
                                </span>
                              </div>

                              {payload.permitted_events.length === 0 ? (
                                <p
                                  className="text-[14px] py-4"
                                  style={{ color: theme.textSecondary }}
                                >
                                  Your invitation details will appear here once ceremonies are assigned.
                                </p>
                              ) : (
                                <div className="flex flex-col gap-2">
                                  {payload.permitted_events.map((ev, idx) => (
                                    <button
                                      key={ev.id}
                                      type="button"
                                      onClick={() => goToChapter(idx + 1)}
                                      className="w-full text-left rounded-lg px-4 py-3 border flex items-center justify-between gap-3 transition-colors duration-150 cursor-pointer"
                                      style={{
                                        borderColor: theme.hairline,
                                        backgroundColor: "transparent",
                                      }}
                                    >
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className="text-[12px] font-mono-tabular"
                                            style={{ color: theme.accent }}
                                          >
                                            {String(idx + 1).padStart(2, "0")}
                                          </span>
                                          <span className="text-[14px] font-medium truncate">
                                            {ev.title}
                                          </span>
                                        </div>
                                        <p
                                          className="text-[13px] mt-0.5 truncate"
                                          style={{ color: theme.textSecondary }}
                                        >
                                          {ev.date} · {ev.time}
                                        </p>
                                      </div>
                                      <ArrowRight
                                        className="w-4 h-4 shrink-0"
                                        strokeWidth={1.5}
                                        style={{ color: theme.textMuted }}
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : currentChapter.kind === "event" ? (
                          <div className="flex flex-col justify-between gap-6 flex-1">
                            <div>
                              <div className="flex items-center justify-between gap-3 mb-6">
                                <span
                                  className="text-[12px] font-mono-tabular"
                                  style={{ color: theme.accent }}
                                >
                                  Ceremony {String(chapterIndex).padStart(2, "0")}{" "}
                                  of {String(eventCount).padStart(2, "0")}
                                </span>
                                <span
                                  className="text-[12px] font-mono-tabular px-2.5 py-1 rounded-md border"
                                  style={{
                                    backgroundColor: theme.bgRaised,
                                    borderColor: theme.hairline,
                                    color: theme.textSecondary,
                                  }}
                                >
                                  {getCountdownLabel(currentChapter.event.isoStart)}
                                </span>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
                                <div>
                                  {currentChapter.event.host ? (
                                    <p
                                      className="text-[13px] mb-1.5"
                                      style={{ color: theme.textMuted }}
                                    >
                                      Hosted by {currentChapter.event.host}
                                    </p>
                                  ) : null}
                                  <h2 className="font-serif-display text-[32px] sm:text-[36px] leading-[1.1] font-normal tracking-[-0.02em]">
                                    {currentChapter.event.title}
                                  </h2>
                                </div>
                                <CeremonyIllustration
                                  kind={currentChapter.event.id}
                                  accentColor={theme.accent}
                                  inkColor={theme.textPrimary}
                                  className="w-24 h-24 shrink-0"
                                />
                              </div>

                              <div
                                className="rounded-xl border divide-y"
                                style={{
                                  backgroundColor: theme.bgRaised,
                                  borderColor: theme.hairline,
                                }}
                              >
                                <div
                                  className="px-4 py-3.5 flex items-start gap-3"
                                  style={{ borderColor: theme.hairline }}
                                >
                                  <Clock
                                    className="w-4 h-4 mt-0.5 shrink-0"
                                    strokeWidth={1.5}
                                    style={{ color: theme.textMuted }}
                                  />
                                  <div>
                                    <p className="text-[14px] font-medium">
                                      {currentChapter.event.date}
                                    </p>
                                    <p
                                      className="text-[13px] mt-0.5"
                                      style={{ color: theme.textSecondary }}
                                    >
                                      {currentChapter.event.time}
                                    </p>
                                  </div>
                                </div>

                                <div
                                  className="px-4 py-3.5 flex items-start gap-3"
                                  style={{ borderColor: theme.hairline }}
                                >
                                  <MapPin
                                    className="w-4 h-4 mt-0.5 shrink-0"
                                    strokeWidth={1.5}
                                    style={{ color: theme.textMuted }}
                                  />
                                  <div>
                                    <p
                                      className="text-[14px] leading-relaxed"
                                      style={{ color: theme.textPrimary }}
                                    >
                                      {currentChapter.event.venue}
                                    </p>
                                  </div>
                                </div>

                                {currentChapter.event.attire ? (
                                  <div
                                    className="px-4 py-3 flex items-start gap-3"
                                    style={{ borderColor: theme.hairline }}
                                  >
                                    <Tag
                                      className="w-4 h-4 mt-0.5 shrink-0"
                                      strokeWidth={1.5}
                                      style={{ color: theme.textMuted }}
                                    />
                                    <p
                                      className="text-[13px]"
                                      style={{ color: theme.textSecondary }}
                                    >
                                      {currentChapter.event.attire}
                                    </p>
                                  </div>
                                ) : null}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() =>
                                  downloadIcsFile(
                                    currentChapter.event,
                                    payload.couple
                                  )
                                }
                                className="h-9 px-4 rounded-lg inline-flex items-center gap-2 text-[13px] font-medium border transition-[transform,color,background-color,border-color] duration-150 active:scale-[0.98] cursor-pointer"
                                style={{
                                  backgroundColor: theme.bgRaised,
                                  borderColor: theme.hairline,
                                  color: theme.textPrimary,
                                }}
                              >
                                <CalendarPlus
                                  className="w-4 h-4"
                                  strokeWidth={1.5}
                                  style={{ color: theme.textSecondary }}
                                />
                                Add to calendar
                              </button>
                              <a
                                href={getEventMapHref(currentChapter.event)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-9 px-4 rounded-lg inline-flex items-center gap-2 text-[13px] font-medium border transition-[transform,color,background-color,border-color] duration-150 active:scale-[0.98]"
                                style={{
                                  backgroundColor: "transparent",
                                  borderColor: theme.hairline,
                                  color: theme.textSecondary,
                                }}
                              >
                                Open map
                                <ExternalLink
                                  className="w-4 h-4"
                                  strokeWidth={1.5}
                                />
                              </a>
                            </div>
                          </div>
                        ) : (
                          renderRsvpForm(false)
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {chapters.map((chapter, idx) => {
                      const active = idx === chapterIndex;
                      return (
                        <button
                          key={chapter.id}
                          ref={active ? activePillRef : undefined}
                          type="button"
                          onClick={() => goToChapter(idx)}
                          className="h-8 px-3 rounded-lg text-[13px] whitespace-nowrap border transition-colors duration-150 cursor-pointer shrink-0"
                          style={{
                            backgroundColor: active
                              ? theme.accentSoft
                              : theme.bgCard,
                            borderColor: active ? theme.accent : theme.hairline,
                            color: active ? theme.accent : theme.textSecondary,
                            fontWeight: active ? 500 : 400,
                          }}
                        >
                          {chapter.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => goToChapter(chapterIndex - 1)}
                      disabled={chapterIndex === 0}
                      className="h-9 px-3.5 rounded-lg border inline-flex items-center gap-1.5 text-[13px] disabled:opacity-40 transition-colors duration-150 cursor-pointer disabled:cursor-default"
                      style={{
                        backgroundColor: theme.bgCard,
                        borderColor: theme.hairline,
                        color: theme.textPrimary,
                      }}
                    >
                      <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                      Previous
                    </button>

                    <button
                      type="button"
                      onClick={() => goToChapter(chapterIndex + 1)}
                      disabled={chapterIndex === chapters.length - 1}
                      className="h-9 px-3.5 rounded-lg border inline-flex items-center gap-1.5 text-[13px] disabled:opacity-40 transition-colors duration-150 cursor-pointer disabled:cursor-default"
                      style={{
                        backgroundColor: theme.bgCard,
                        borderColor: theme.hairline,
                        color: theme.textPrimary,
                      }}
                    >
                      Next
                      <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
