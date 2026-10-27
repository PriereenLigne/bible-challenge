export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card animate-fade-up">
      <h2 className="font-reading text-xl font-semibold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
