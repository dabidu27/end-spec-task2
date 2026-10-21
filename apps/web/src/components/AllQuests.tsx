export interface Quest {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  due_date: string | null;
  recurrence: "daily" | null;
  done: boolean;
}

function formatDueDate(date: string) {
  const [, , day] = date.split("-");
  const monthName = new Date(`${date}T00:00:00`).toLocaleString("en", {
    month: "short",
  });

  return `${day} ${monthName}`;
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
            className={`questRow quest-${quest.difficulty} ${quest.done ? "questDone" : ""}`}
            key={quest.id}
          >
            <span className="questMarker" aria-hidden="true" />
            <div className="questDetails">
              <h3>{quest.title}</h3>
              <p>
                {quest.difficulty[0].toUpperCase() + quest.difficulty.slice(1)} ·{" "}
                {quest.difficulty === "easy"
                  ? 10
                  : quest.difficulty === "medium"
                    ? 25
                    : 50}{" "}
                XP ·{" "}
                {quest.recurrence === "daily"
                  ? "daily"
                  : quest.due_date
                    ? `due ${formatDueDate(quest.due_date)}`
                    : "no due date"}
              </p>
              {quest.due_date && new Date(`${quest.due_date}T23:59:59`) < new Date() && !quest.done ? (
                <span className="overdueBadge">Overdue</span>
              ) : null}
            </div>
            {quest.done ? (
              <span className="doneState">
                <span className="doneIcon" aria-hidden="true">✓</span>
                Done
              </span>
            ) : (
              <button
                className="completeQuestButton"
                type="button"
                disabled={completingQuestId === quest.id}
                onClick={() => completeQuest(quest.id)}
              >
                {completingQuestId === quest.id ? "Completing..." : "Complete"}
              </button>
            )}
          </article>
        ))
      )}
    </section>
  );
}
