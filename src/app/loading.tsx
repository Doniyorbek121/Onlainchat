/** Route-level loading state shown during navigation/streaming. */
export default function Loading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand" />
        <span
          className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="h-2.5 w-2.5 animate-pulse-dot rounded-full bg-brand"
          style={{ animationDelay: "0.4s" }}
        />
      </div>
    </div>
  );
}
