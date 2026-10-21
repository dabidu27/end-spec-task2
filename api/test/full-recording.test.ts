import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

type RecordingEntry = {
    x_now: string;
    method: string;
    path: string;
    body?: Record<string, unknown>;
    status: number;
    response?: unknown;
};

const recordingPath = new URL("../../reference_recording.jsonl", import.meta.url);
const recording = (await readFile(recordingPath, "utf8"))
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as RecordingEntry);

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

const replaceAliases = (
    value: unknown,
    aliases: Map<string, string>,
): unknown => {
    if (typeof value === "string") {
        return aliases.get(value) ?? value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => replaceAliases(item, aliases));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [
                key,
                replaceAliases(item, aliases),
            ]),
        );
    }
    return value;
};

const recordingPathToApiPath = (
    path: string,
    questIds: Map<string, string>,
    completionIds: Map<string, string>,
) => {
    const questCompletion = path.match(/^\/quests\/(q\d+)\/complete$/);
    if (questCompletion) {
        const alias = questCompletion[1];
        if (!alias) {
            throw new Error(`invalid quest path: ${path}`);
        }
        const questId = alias === "q99"
            ? "00000000-0000-0000-0000-000000000099"
            : questIds.get(alias);
        if (!questId) {
            throw new Error(`quest alias ${alias} was not created`);
        }
        return `/api/quests/${questId}/complete`;
    }

    const completionDeletion = path.match(/^\/completions\/(c\d+)$/);
    if (completionDeletion) {
        const alias = completionDeletion[1];
        if (!alias) {
            throw new Error(`invalid completion path: ${path}`);
        }
        const completionId = completionIds.get(alias);
        if (!completionId) {
            throw new Error(`completion alias ${alias} was not created`);
        }
        return `/api/completions/${completionId}`;
    }

    if (path === "/quests" || path === "/completions" || path === "/me") {
        return `/api${path}`;
    }

    return path;
};

test("replays the complete reference recording", async () => {
    const resetResponse = await fetch(`${apiBaseUrl}/test/reset`, {
        method: "POST",
    });
    assert.equal(resetResponse.status, 204);

    const questIds = new Map<string, string>();
    const completionIds = new Map<string, string>();
    const aliases = new Map<string, string>();
    let createdQuestCount = 0;
    let createdCompletionCount = 0;

    for (const [index, entry] of recording.entries()) {
        const headers: Record<string, string> = {"x-now": entry.x_now};
        const request: RequestInit = {
            method: entry.method,
            headers,
        };

        if (entry.body !== undefined) {
            headers["content-type"] = "application/json";
            request.body = JSON.stringify(entry.body);
        }

        const response = await fetch(
            `${apiBaseUrl}${recordingPathToApiPath(entry.path, questIds, completionIds)}`,
            request,
        );
        assert.equal(response.status, entry.status, `recording line ${index + 1}`);

        if (entry.status === 204) {
            continue;
        }

        const actual = await response.json() as unknown;

        if (entry.path === "/quests" && entry.status === 201) {
            const actualQuest = actual as {id?: unknown};
            if (typeof actualQuest.id !== "string") {
                throw new Error(`recording line ${index + 1}: quest id missing`);
            }
            const alias = `q${++createdQuestCount}`;
            questIds.set(alias, actualQuest.id);
            aliases.set(actualQuest.id, alias);
        }

        if (/^\/quests\/q\d+\/complete$/.test(entry.path) && entry.status === 201) {
            const actualCompletion = (actual as {completion?: {id?: unknown}}).completion;
            if (!actualCompletion || typeof actualCompletion.id !== "string") {
                throw new Error(`recording line ${index + 1}: completion id missing`);
            }
            const alias = `c${++createdCompletionCount}`;
            completionIds.set(alias, actualCompletion.id);
            aliases.set(actualCompletion.id, alias);
        }

        const normalizedActual = replaceAliases(actual, aliases);
        assert.deepEqual(
            normalizedActual,
            entry.response,
            `recording line ${index + 1}`,
        );
    }
});
