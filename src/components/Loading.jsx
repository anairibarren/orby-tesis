// src/components/Loading.jsx
export default function Loading({ fullScreen = true, className = "" }) {
  const Wrapper = fullScreen ? "div" : "div";

  return (
    <Wrapper
      className={[
        fullScreen ? "min-h-screen" : "",
        "bg-[#F5F5F5] grid place-items-center",
        className,
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#1E2F5D] opacity-30 animate-[orbyDot_900ms_ease-in-out_infinite]" />
        <span className="h-2 w-2 rounded-full bg-[#1E2F5D] opacity-30 animate-[orbyDot_900ms_ease-in-out_150ms_infinite]" />
        <span className="h-2 w-2 rounded-full bg-[#1E2F5D] opacity-30 animate-[orbyDot_900ms_ease-in-out_300ms_infinite]" />
      </div>

      <style>{`
        @keyframes orbyDot {
          0%,100% { transform: translateY(0); opacity: .25; }
          50% { transform: translateY(-4px); opacity: .9; }
        }
      `}</style>
    </Wrapper>
  );
}