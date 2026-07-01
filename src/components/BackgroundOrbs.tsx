/**
 * Ambient 3D-feeling floating orbs used as a background layer on public pages.
 * Positioned absolutely inside a `relative` parent. Pointer-events disabled.
 */
export function BackgroundOrbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Cream blob top-left */}
      <div
        className="absolute -left-32 -top-32 h-[520px] w-[520px] rounded-full opacity-70 animate-float-slow"
        style={{
          background: "radial-gradient(circle at 35% 35%, oklch(0.97 0.02 85), oklch(0.9 0.05 60 / 0.4) 60%, transparent 75%)",
          filter: "blur(2px)",
        }}
      />
      {/* Lavender ribbon top-right */}
      <div
        className="absolute right-[-180px] top-[10%] h-[600px] w-[420px] rotate-12 rounded-[50%] opacity-80 animate-float"
        style={{
          background: "linear-gradient(160deg, oklch(0.82 0.09 295), oklch(0.72 0.14 285 / 0.6))",
          boxShadow: "inset -30px -30px 80px oklch(0.5 0.15 285 / 0.4), inset 20px 20px 60px oklch(1 0 0 / 0.4)",
          filter: "blur(1px)",
        }}
      />
      {/* Blush disc left-middle */}
      <div
        className="absolute left-[8%] top-[45%] h-[220px] w-[220px] rounded-full opacity-70 animate-float-slow"
        style={{
          background: "radial-gradient(circle at 30% 30%, oklch(0.92 0.06 25), oklch(0.78 0.12 25 / 0.6))",
          boxShadow: "inset -15px -15px 40px oklch(0.5 0.15 25 / 0.3), inset 10px 10px 30px oklch(1 0 0 / 0.5)",
        }}
      />
      {/* Peach glob bottom-left */}
      <div
        className="absolute -bottom-40 left-[20%] h-[500px] w-[500px] rounded-full opacity-60 animate-float"
        style={{
          background: "radial-gradient(circle at 40% 40%, oklch(0.85 0.11 45 / 0.7), transparent 70%)",
          filter: "blur(4px)",
        }}
      />
      {/* Cyan orb bottom-right */}
      <div
        className="absolute right-[10%] bottom-[15%] h-[280px] w-[280px] rounded-full opacity-60 animate-float-slow"
        style={{
          background: "radial-gradient(circle at 35% 35%, oklch(0.92 0.06 220), oklch(0.72 0.14 230 / 0.5))",
          boxShadow: "inset -20px -20px 50px oklch(0.4 0.15 240 / 0.3), inset 15px 15px 40px oklch(1 0 0 / 0.5)",
        }}
      />
    </div>
  );
}
