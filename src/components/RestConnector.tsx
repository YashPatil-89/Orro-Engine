export function RestConnector({ label }: { label: string }) {
  return (
    <div className="relative flex items-center py-1 pl-[1.15rem]" aria-hidden={false}>
      <div className="h-10 border-l-2 border-dashed border-blush" />
      <span className="ml-5 rounded-full bg-blush-soft px-3 py-1 text-[11px] font-medium text-secondary-foreground">{label}</span>
    </div>
  );
}
