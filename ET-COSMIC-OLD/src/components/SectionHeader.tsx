type Props = {
  index?: string;
  kicker?: string;
  tag?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
};

export default function SectionHeader({
  index = "∞",
  kicker,
  tag,
  title,
  description,
  subtitle,
}: Props) {
  const label = kicker ?? tag ?? "";
  const desc = description ?? subtitle;
  return (
    <div className="mb-14 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <span className="font-mono text-[11px] tracking-[0.3em] text-[#b6ff3a]">
          § {index}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-[#b6ff3a]/40 to-transparent max-w-[120px]" />
        <span className="font-mono text-[11px] tracking-[0.3em] text-zinc-500">
          {label}
        </span>
      </div>
      <h2 className="font-sans font-light text-3xl md:text-5xl text-zinc-100 leading-tight tracking-tight mb-4">
        {title}
      </h2>
      {desc && (
        <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl">
          {desc}
        </p>
      )}
    </div>
  );
}
