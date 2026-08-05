const TOOLS = [
  { name: "Adobe Premiere Pro", caption: "Every cut, every edit." },
  { name: "Adobe After Effects", caption: "Every visual, every glitch." },
  { name: "Ableton Live", caption: "Every beat, every arrangement." },
  { name: "FL Studio", caption: "Where the first idea lands." },
];

export function ToolsWindow() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {TOOLS.map((tool) => (
        <div key={tool.name} className="win98-border bg-persona-surface-alt p-2 text-center">
          <p className="font-chrome text-xs">{tool.name}</p>
          <p className="text-[11px] text-fg-muted mt-1">{tool.caption}</p>
        </div>
      ))}
    </div>
  );
}
