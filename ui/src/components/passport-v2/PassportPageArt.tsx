export function PassportPageArt() {
  return (
    <div className="onboarding-document" aria-hidden="true">
      <div className="onboarding-document__heading">
        <img src="/brand/midnight-symbol-black.svg" alt="" />
        <span>PASSPORT</span>
      </div>
      <div className="onboarding-document__fields">
        <span className="onboarding-document__portrait" />
        <div>
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <div className="onboarding-document__mrz">
        <span />
        <span />
      </div>
      <span className="onboarding-document__corner" />
    </div>
  );
}
