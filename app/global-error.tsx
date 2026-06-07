"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Application error</h1>
            <p style={{ marginTop: 8, color: "#57534e" }}>{error.message}</p>
            <button
              onClick={reset}
              style={{ marginTop: 16, padding: "8px 16px", borderRadius: 6, background: "#1c1917", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Reload
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
