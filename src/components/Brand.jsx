export function Logo({ className = '', light = false }) {
  const big = /h-10/.test(className);
  return (
    <span className={`inline-flex items-center gap-2.5 ${className.replace(/\bh-\d+\b/g, '')}`} aria-label="BACH INSTITUT">
      <img src="/brand/mark.png" alt="" className={big ? 'h-10 w-auto' : 'h-8 w-auto'} draggable={false} />
      <span className={`flex flex-col font-display font-extrabold leading-[0.9] tracking-[-0.04em] ${big ? 'text-2xl' : 'text-xl'} ${light ? 'text-white' : 'text-forest'}`}>
        bach
        <span className={`mt-1 font-sans font-semibold tracking-[0.42em] ${big ? 'text-[8.5px]' : 'text-[7px]'}`}>INSTITUT</span>
      </span>
    </span>
  );
}

export function SourceNote({ className = '' }) {
  return (
    <p className={`text-xs leading-relaxed text-forest-500 ${className}`}>
      Nội dung đề: Goethe-Zertifikat A1: Start Deutsch 1 – Modellsatz (© Goethe-Institut). Chỉ dùng nội bộ cho lớp học của BACH INSTITUT.
      Website này không thuộc Goethe-Institut và không phải bài thi được Goethe-Institut chứng nhận.
    </p>
  );
}
