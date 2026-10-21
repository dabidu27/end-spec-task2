import { useEffect, useMemo, useState } from "react";


export interface Completion {
  id: string;
  quest_id: string;
  base_xp: number;
  created_at: string;
}

export default function RecentCompletions({
  completions,
  quests,
  undoCompletion,
  undoingCompletionId,
  timezone,
}: {
  completions: Completion[];
  quests: { id: string; title: string; difficulty: "easy" | "medium" | "hard" }[];
  undoCompletion: (id: string) => void;
  undoingCompletionId: string | null;
  timezone?: string;
}) {
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(completions.length / pageSize));
  const visibleCompletions = useMemo(
    () => completions.slice((page - 1) * pageSize, page * pageSize),
    [completions, page],
  );

  useEffect(() => {
    setPage((currentPage) => Math.min(currentPage, pageCount));
  }, [pageCount]);

  const formatDate = (createdAt: string) =>
    new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(createdAt));

  return (
    <section className="recentCompletionsCard">
      <h2 className="recentCompletionsTitle">Recent completions</h2>
      {completions.length === 0 ? (
        <p className="emptyCompletions">No completions yet.</p>
      ) : (
        visibleCompletions.map((completion) => {
          const quest = quests.find(({ id }) => id === completion.quest_id);
          return (
            <article
              className={`completionRow completion-${quest?.difficulty ?? "easy"}`}
              key={completion.id}
            >
              <span className="completionMarker" aria-hidden="true" />
              <div className="completionDetails">
                <h3>{quest?.title ?? "Completed quest"}</h3>
                <p>{formatDate(completion.created_at)}</p>
              </div>
              <strong>+{completion.base_xp} XP</strong>
              <button
                className="undoCompletionButton"
                type="button"
                aria-label={`Undo ${quest?.title ?? "completion"}`}
                disabled={undoingCompletionId === completion.id}
                onClick={() => undoCompletion(completion.id)}
              >
                {undoingCompletionId === completion.id ? "..." : "↶"}
              </button>
            </article>
          );
        })
      )}
      {completions.length > 0 ? (
        <div className="completionPagination">
          <span>
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, completions.length)} of{" "}
            {completions.length}
          </span>
          <div className="paginationButtons">
            <button
              className="paginationButton"
              type="button"
              aria-label="Previous completions page"
              disabled={page === 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
            >
              ‹
            </button>
            <button
              className="paginationButton"
              type="button"
              aria-label="Next completions page"
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
