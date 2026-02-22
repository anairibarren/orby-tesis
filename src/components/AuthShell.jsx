// src/components/auth/AuthShell.jsx
export default function AuthShell({ children, className = "" }) {
  return (
    <div className={["min-h-screen bg-[#1E2F5D] relative overflow-hidden", className].join(" ")}>
      <div className="relative z-10">{children}</div>
    </div>
  );
}