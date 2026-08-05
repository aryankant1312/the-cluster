export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="py-6 text-center text-fg-muted">
      <p className="font-chrome text-base tracking-wide">{label}</p>
      <p className="mt-2 text-xs">COMING SOON.</p>
    </div>
  );
}
