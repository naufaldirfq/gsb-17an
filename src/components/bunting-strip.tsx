export function BuntingStrip() {
  return (
    <div className="w-full overflow-hidden whitespace-nowrap flex py-2 select-none" aria-hidden="true">
      <div className="flex gap-2">
        {Array.from({ length: 100 }).map((_, i) => (
          <span key={i} className={`text-xl ${i % 2 === 0 ? "text-merah" : "text-emas"}`}>
            {i % 2 === 0 ? "▼" : "▲"}
          </span>
        ))}
      </div>
    </div>
  );
}
