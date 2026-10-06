export const Logo = ({ dark = false }: { dark?: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
    <rect width="28" height="28" rx="7" fill={dark ? "#ffffff" : "#032147"} fillOpacity={dark ? 0.08 : 1} />
    <rect x="7" y="7" width="3.5" height="14" rx="1.75" fill="#ffffff" />
    <rect x="12.25" y="7" width="3.5" height="9" rx="1.75" fill="#ecad0a" />
    <rect x="17.5" y="7" width="3.5" height="11.5" rx="1.75" fill="#ffffff" opacity="0.55" />
  </svg>
);
