interface CoverageNoteProps {
  city: string;
  /** From useCityCoverage; null renders an empty, height-reserving slot. */
  count: number | null;
}

/** Honest supply note under the province field. The number is always the live count, never a constant. */
export default function CoverageNote({ city, count }: CoverageNoteProps) {
  let message: string | null = null;
  if (city && count !== null) {
    message =
      count > 0
        ? `${city} ilinde ${count} kayıtlı firma listeleniyor.`
        : `Henüz ${city} ilinde kayıtlı firmamız yok. Talebinizi yine de alıyoruz; bölgenizde firma bulabilirsek size dönüş yaparız, ancak garanti veremiyoruz.`;
  }
  return (
    <p className="min-h-5 text-xs leading-relaxed text-muted-foreground" aria-live="polite">
      {message}
    </p>
  );
}
