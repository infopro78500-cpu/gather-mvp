import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950 px-6 py-6 text-center text-xs text-slate-400">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <span>© {new Date().getFullYear()} Usegather — Le partage de photos d’événement.</span>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/legal/confidentialite" className="hover:text-teal-300">
            Politique de confidentialité
          </Link>
          <Link href="/legal/mentions-legales" className="hover:text-teal-300">
            Mentions légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
