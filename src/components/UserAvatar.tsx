import { useState } from "react";

interface UserAvatarProps {
  name: string;
  photoUrl?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const PRESET_GRADIENTS: Record<string, string> = {
  "preset:mono": "bg-zinc-900 text-white border-white/25",
  "preset:blue": "bg-blue-600 text-white border-blue-400/40",
  "preset:emerald": "bg-emerald-600 text-white border-emerald-400/40",
  "preset:amber": "bg-amber-500 text-black border-amber-300/50",
  "preset:rose": "bg-rose-600 text-white border-rose-400/40",
  "preset:violet": "bg-violet-600 text-white border-violet-400/40",
};

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-3xl",
};

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "N";
  const parts = cleaned.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
}

export function UserAvatar({
  name,
  photoUrl,
  size = "md",
  className = "",
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass = SIZE_CLASSES[size];

  if (photoUrl && photoUrl.startsWith("preset:")) {
    const presetClass =
      PRESET_GRADIENTS[photoUrl] ||
      "bg-[var(--nova-accent)] text-[var(--nova-accent-fg)] border-transparent";
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border font-display font-bold select-none ${sizeClass} ${presetClass} ${className}`}
      >
        {getInitials(name)}
      </div>
    );
  }

  if (photoUrl && !imgFailed) {
    return (
      <img
        src={photoUrl}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`shrink-0 rounded-full border border-[var(--nova-border)] object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full border border-[var(--nova-border)] bg-[var(--nova-surface-subtle)] font-display font-bold text-[var(--nova-text)] select-none ${sizeClass} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
