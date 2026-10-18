export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-paper">
      <div className="mx-auto flex max-w-content flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-ink/50 sm:flex-row sm:px-6">
        <p>YouTube Concept Filter — AI-powered anatomical analysis.</p>
        <p>Built with Next.js, Tailwind &amp; free LLM APIs.</p>
      </div>
    </footer>
  );
}