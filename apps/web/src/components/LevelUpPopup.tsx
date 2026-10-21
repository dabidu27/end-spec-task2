export default function LevelUpPopup({ level, handleDismiss }: {
  level: number
  handleDismiss:  () => void
}) {
  return (
    <aside className="levelUpPopup" aria-label={`Level ${level} reached`}>
      <div className="levelUpBadge">{level}</div>
      <strong className="levelUpMessage">Level {level} reached</strong>
      <button className="levelUpDismiss" type="button" onClick={handleDismiss}>
        Dismiss
      </button>
    </aside>
  );
}
