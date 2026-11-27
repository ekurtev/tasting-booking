import { company } from "@/content/company";

// Legal pages are TEMPLATES to be reviewed by a lawyer before production use (see README).
export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="prose">
      <h1>{title}</h1>
      <p className="meta">Последна актуализация: {company.legalUpdated}</p>
      {children}
    </article>
  );
}
