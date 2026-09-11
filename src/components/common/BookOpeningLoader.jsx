export default function BookOpeningLoader() {
  return (
    <div className="splash book-opening-loader" role="status" aria-live="polite">
      <div className="startup-doodle startup-doodle-coin" aria-hidden="true">
        ₨
      </div>
      <div className="startup-doodle startup-doodle-note" aria-hidden="true">
        EVERY RUPEE
        <br />
        HAS A JOB.
      </div>
      <div className="startup-doodle startup-doodle-stamp" aria-hidden="true">
        CHECKING
        <br />
        THE MATH!
      </div>

      <div className="startup-scene">
        <div className="startup-logo" aria-hidden="true">
          <img src="/icon.svg" alt="" />
        </div>

        <div className="startup-title">
          <span>LEDGER INCOMING!</span>
          <strong>OPENING YOUR BOOK…</strong>
          <small>Counting every rupee. Misplacing absolutely none.</small>
        </div>

        <div className="startup-spinner" aria-hidden="true">
          <i />
          <b>₨</b>
        </div>
      </div>

      <div className="startup-scribble" aria-hidden="true">
        <span>+</span>
        <span>×</span>
        <span>÷</span>
        <span>=</span>
      </div>
    </div>
  );
}
