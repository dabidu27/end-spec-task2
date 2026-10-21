export interface Quest {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  due_date: string | null;
  recurrence: "daily" | null;
  done: boolean;
}

export default function AllQuests({
  quests,
  completeQuest,
  completingQuestId,
}: {
  quests: Quest[];
  completeQuest: (id: string) => void;
  completingQuestId: string | null;
}) {
  return (
    <section className="allQuestsCard">
      <h2 className="allQuestsTitle">All quests</h2>

      {quests.length === 0 ? (
        <p className="emptyQuests">No quests yet. Add your first quest above.</p>
      ) : (
        quests.map((quest) => (
          <article
            className={`questRow ${quest.done ? "questDone" : ""}`}
            key={quest.id}
          >
            <div className="questDetails">
              <h3>{quest.title}</h3>
              <p>
                <span className={`difficultyBadge ${quest.difficulty}`}>
                  {quest.difficulty} ·{" "}
                  {quest.difficulty === "easy"
                    ? 10
                    : quest.difficulty === "medium"
                      ? 25
                      : 50}{" "}
                  XP
                </span>
                <span className="questSchedule">
                  {quest.recurrence === "daily"
                    ? "Repeats daily"
                    : quest.due_date
                      ? `Due ${quest.due_date}`
                      : "No due date"}
                </span>
              </p>
            </div>
            <button
              className="completeQuestButton"
              type="button"
              disabled={quest.done || completingQuestId === quest.id}
              onClick={() => completeQuest(quest.id)}
            >
              {quest.done
                ? "Done"
                : completingQuestId === quest.id
                  ? "Completing..."
                  : "Complete"}
            </button>
          </article>
        ))
      )}
    </section>
  );
}
