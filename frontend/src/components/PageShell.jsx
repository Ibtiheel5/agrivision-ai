import LangToggle from "./LangToggle";
import Icon from "./Icon";

/** En-tête végétal réutilisé par les pages secondaires. */
export default function PageShell({ title, children }) {
  return (
    <div>
      <header className="relative overflow-hidden rounded-b-[2rem] bg-[#155d3c] px-5 pb-8 pt-7 text-white">
        <img src="/images/leaf-closeup.jpg" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0f5138]/95 via-[#176d3f]/85 to-[#78a72e]/60" />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Icon name="leaf" className="h-5 w-5 text-[#c8f28b]" />
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/65">agrivision-ia</p>
              <h1 className="text-xl font-semibold">{title}</h1>
            </div>
          </div>
          <LangToggle className="!bg-white/15" />
        </div>
      </header>
      <main className="space-y-5 px-4 pb-32 pt-5">{children}</main>
    </div>
  );
}
