import { useState } from "react"

export default function NewQuestCard({ handleCreateQuest, submitQuest}: {
    handleCreateQuest: (
        title: string,
        difficulty: string,
        recurrence: string,
        dueDate: string,
    ) => void
    submitQuest: boolean
}){

    const [title, setTitle] = useState<string>('')
    const [recurrence, setRecurrence] = useState("daily")
    const [difficulty, setDifficulty] = useState("easy")
    const [dueDate, setDueDate] = useState("")

    return(


        <div className="newQuestCard">
            <span className="newQuestText">New Quest</span>

            <div className = "selectionArea">
                <div className = "titleArea">
                    <span className="metricLabel">Title</span>
                    <input
                        className="titleInput"
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Finish Endspec Task"
                    />
                </div>

                <div className="selectionField">
                    <span className="metricLabel">Difficulty</span>
                    <select
                        value={difficulty}
                        onChange={(event) => setDifficulty(event.target.value)}
                    >
                        <option value="easy">Easy · 10 XP</option>
                        <option value="medium">Medium · 25 XP</option>
                        <option value="hard">Hard · 50 XP</option>
                    </select>
                </div>

                <div className="selectionField">
                    <span className="metricLabel">Schedule</span>
                    <select
                        value={recurrence}
                        onChange={(event) => setRecurrence(event.target.value)}
                    >
                        <option value="daily">Repeat daily</option>
                        <option value="one-off">One-off</option>
                    </select>
                </div>

                {recurrence === "one-off" ? (
                    <div className="selectionField">
                        <label className="metricLabel" htmlFor="due-date">
                            Due date
                        </label>
                        <input
                            id="due-date"
                            className="dateInput"
                            type="date"
                            value={dueDate}
                            onChange={(event) => setDueDate(event.target.value)}
                        />
                    </div>
                ) : null}

                <button
                    className="addQuestButton"
                    type="button"
                    onClick={() => handleCreateQuest(title, difficulty, recurrence, dueDate)}
                    disabled={submitQuest}
                >
                    {submitQuest ? "Adding..." : "Add quest"}
                </button>
            </div>
        </div>

    )


}