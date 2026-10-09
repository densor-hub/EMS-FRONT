export function Copyright() {
  const year = new Date().getFullYear();

  return (
    <p className="text-xs text-muted-foreground sm:text-sm">
      © {year} Abibeck Software Solutions ·{' '}
      <a
        href="https://abibeck.onrender.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground underline underline-offset-4"
      >
        abibeck.onrender.com
      </a>
    </p>
  );
}