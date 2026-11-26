/** Bloc de chargement : un reflet traverse la surface au lieu d'un simple gris clignotant. */
export default function Shimmer({ className = "h-24 w-full rounded-[1.25rem]" }) {
  return (
    <div className={`relative overflow-hidden bg-line ${className}`} role="status" aria-label="Chargement">
      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent motion-reduce:animate-none" />
    </div>
  );
}
