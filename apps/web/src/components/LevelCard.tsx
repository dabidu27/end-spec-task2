import type { CSSProperties } from "react";
import type { UserData } from "@/app/page";

export default function LevelCard({userData}: {userData: UserData}) {

  const currLevelXp = userData.xpIntoLevel;
  const xpToNextLevel = userData.xpToNextLevel;
  const nextLevelXp = currLevelXp + xpToNextLevel;
  const level = userData.level;
  const streak = userData.streak;
  const xp = userData.xp;

  const progressBarProgress = Math.min(
    Math.max((currLevelXp / nextLevelXp) * 100, 0),
    100,
  );

  return (
    <div className="levelCard">
      <div className="levelMetric">
        <span className="metricLabel">LEVEL</span>
        <strong>{level}</strong>
      </div>

      <div className="levelMetric">
        <span className="metricLabel">TOTAL XP</span>
        <strong>{xp}</strong>
      </div>

      <div className="levelMetric streakMetric">
        <span className="metricLabel">CURRENT STREAK</span>
        <strong>
          {streak}
          <small> days</small>
        </strong>
      </div>

      <div className="levelProgressArea">
        <div className="levelProgressHeader">
          <span>Progress to Level {level + 1}</span>
          <span>
            <strong>{currLevelXp}</strong> of {nextLevelXp} XP · {xpToNextLevel} to go
          </span>
        </div>
        <div
          className="progressBar"
          style={{ "--progress": `${progressBarProgress}%` } as CSSProperties}
        />
      </div>
    </div>
  );
}