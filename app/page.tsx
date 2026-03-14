import HabitTracker from '@/components/habit-tracker';

export default function Home() {
  return (
    <>
      {/* Sunrise star overlay — purely decorative, hidden in light mode via CSS.
          viewBox spans full 1440×900 so stars sit in upper sky, well above horizon */}
      {/* <svg
        className="sunrise-stars"
        viewBox="0 0 1440 900"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        {}
        <circle className="st" cx="112"  cy="80"  r="1.4" fill="#fff"    opacity="0.28" />
        <circle className="st" cx="310"  cy="44"  r="1.6" fill="#ffe8b0" opacity="0.24" />
        <circle className="st" cx="540"  cy="96"  r="1.2" fill="#fff"    opacity="0.20" />
        <circle className="st" cx="760"  cy="52"  r="1.3" fill="#fff"    opacity="0.22" />
        <circle className="st" cx="990"  cy="72"  r="1.2" fill="#ffe090" opacity="0.22" />
        <circle className="st" cx="1210" cy="38"  r="1.5" fill="#fff"    opacity="0.20" />
        <circle className="st" cx="96"   cy="180" r="1.1" fill="#fff"    opacity="0.16" />
        <circle className="st" cx="1360" cy="110" r="1.2" fill="#fff"    opacity="0.17" />
        {}
        <circle cx="440"  cy="130" r="1.0" fill="#ffe090" opacity="0.13" />
        <circle cx="680"  cy="160" r="0.9" fill="#fff"    opacity="0.11" />
        <circle cx="1080" cy="90"  r="1.0" fill="#fff"    opacity="0.13" />
        <circle cx="1290" cy="150" r="0.9" fill="#fff"    opacity="0.11" />
        <circle cx="220"  cy="210" r="0.8" fill="#fff"    opacity="0.09" />
        <circle cx="900"  cy="200" r="0.8" fill="#ffe090" opacity="0.10" />
        <circle cx="1420" cy="200" r="0.8" fill="#fff"    opacity="0.08" />
      </svg> */}

      <HabitTracker />
    </>
  );
}