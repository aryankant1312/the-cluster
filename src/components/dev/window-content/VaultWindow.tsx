export function VaultWindow() {
  return (
    <div className="text-center py-6">
      <p className="font-chrome text-base tracking-wide">SEALED.</p>
      <p className="mt-2 text-xs text-fg-muted">
        THE CLUSTER OPENS THIS ON RELEASE DAY.
      </p>
      <input
        type="text"
        disabled
        placeholder="ENTER CODE"
        className="win98-border mt-4 w-full px-2 py-1 text-center bg-white/70 text-black disabled:opacity-60"
      />
    </div>
  );
}
