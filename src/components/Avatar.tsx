interface AvatarProps {
  emoji: string;
  color: string;
  size?: number;
  className?: string;
}

export default function Avatar({
  emoji,
  color,
  size = 48,
  className = "",
}: AvatarProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: `linear-gradient(145deg, ${color}, ${color}99)`,
        boxShadow: `0 6px 18px -6px ${color}88`,
      }}
      aria-hidden
    >
      <span style={{ lineHeight: 1 }}>{emoji}</span>
    </div>
  );
}
