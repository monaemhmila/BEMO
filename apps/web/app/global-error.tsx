"use client";

/**
 * Last-resort boundary for errors thrown in the root layout itself.
 * Must render its own <html>/<body>.
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
          fontFamily: "system-ui, sans-serif",
          background: "#fdf7ef",
          color: "#1f1636",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 22, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#6b6483", marginBottom: 20 }}>
            {error?.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "10px 22px",
              borderRadius: 999,
              border: "none",
              background: "#5b3bd4",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}