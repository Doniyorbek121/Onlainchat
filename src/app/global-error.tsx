"use client";

/**
 * Global error boundary — catches errors in the root layout itself. Must render
 * its own <html>/<body> because it replaces the whole document.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0e0e11",
          color: "#ececf1",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Something went wrong</h1>
          <p style={{ color: "#9a9aa8", fontSize: 14, maxWidth: 360 }}>
            A critical error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: 16,
              background: "#7c5cff",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 24px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error?.digest && (
            <p style={{ color: "#6b6b78", fontSize: 12, marginTop: 20 }}>
              Reference: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
