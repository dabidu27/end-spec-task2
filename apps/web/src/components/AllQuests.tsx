import { useEffect, useMemo, useState } from "react";


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
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(quests.length / pageSize));
  const visibleQuests = useMemo(
    () => quests.slice((page - 1) * pageSize, page * pageSize),
    [page, quests],
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  return (
    <section className="allQuestsCard">
      <h2 className="allQuestsTitle">All quests</h2>

      {quests.length === 0 ? (
        <p className="emptyQuests">No quests yet. Add your first quest above.</p>
      ) : (
        visibleQuests.map((quest) => (
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
      {quests.length > 0 ? (
        <div className="questPagination">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, quests.length)} of{" "}
            {quests.length}
          </span>
          <div className="paginationButtons">
            <button
              className="paginationButton"
              type="button"
              aria-label="Previous quests page"
              disabled={page === 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
            >
              ‹
            </button>
            <button
              className="paginationButton"
              type="button"
              aria-label="Next quests page"
              disabled={page === pageCount}
              onClick={() => setPage((currentPage) => currentPage + 1)}
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
