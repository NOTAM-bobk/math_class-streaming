import { PANIC_URL } from "../lib/constants.js";

export default function PanicButton() {
  return (
    <button
      type="button"
      className="panic"
      title="Panic — leave this site"
      aria-label="Panic: leave this site and open Google Classroom"
      onClick={() => window.location.replace(PANIC_URL)}
    >
      Panic
    </button>
  );
}
