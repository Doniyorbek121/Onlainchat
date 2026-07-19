interface AvatarProps {
  emoji: string;
  color: string;
  imageUrl?: string;
  size?: number;
  className?: string;
}

export default function Avatar({
  emoji,
  color,
  imageUrl,
  size = 48,
  className = "",
}: AvatarProps) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-2xl object-cover ${className}`}
        style={{
          width: size,
          height: size,
          boxShadow: `0 6px 18px -6px ${color}88`,
        }}
        aria-hidden
      />
    );
  }

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
