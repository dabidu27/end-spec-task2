import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import supabase from "../src/utils/db.js";

type RecordingEntry = {
    x_now: string;
    method: string;
    path: string;
    body?: Record<string, unknown>;
    status: number;
    response?: Record<string, unknown>;
};

const recordingPath = new URL("../../../reference_recording.jsonl", import.meta.url);
const recording = (await readFile(recordingPath, "utf8"))
    .split("\n")
    .flatMap((line, index) => {
        if (!line.trim()) {
            return [];
        }

        const entry = JSON.parse(line) as RecordingEntry;
        return entry.method === "POST" && entry.path === "/quests" ||
            entry.method === "POST" && /^\/quests\/q\d+\/complete$/.test(entry.path) ||
            entry.method === "PUT" && entry.path === "/me" ||
            entry.method === "DELETE" && /^\/completions\/c\d+$/.test(entry.path)
            ? [{ line: index + 1, entry }]
            : [];
    });

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

async function resetDatabase() {
    const emptyUuid = "00000000-0000-0000-0000-000000000000";

    const { error: completionError } = await supabase
        .from("completions")
        .delete()
        .neq("id", emptyUuid);
    if (completionError) {
        throw completionError;
    }

    const { error: questError } = await supabase
        .from("quests")
        .delete()
        .neq("id", emptyUuid);
    if (questError) {
        throw questError;
    }

    const { error: meError } = await supabase
        .from("me")
        .update({
            timezone: "Europe/Bucharest",
            xp: 0,
            level: 1,
            xp_into_level: 0,
            xp_to_next_level: 100,
            streak: 0,
        })
        .not("id", "is", null);
    if (meError) {
        throw meError;
    }
}

async function postQuest(body: Record<string, unknown>, now: string) {
    return fetch(`${apiBaseUrl}/api/quests`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-now": now,
        },
        body: JSON.stringify(body),
    });
}

async function completeQuest(path: string, now: string) {
    return fetch(`${apiBaseUrl}/api${path}`, {
        method: "POST",
        headers: { "x-now": now },
    });
}

async function updateMe(body: Record<string, unknown>, now: string) {
    return fetch(`${apiBaseUrl}/api/me`, {
        method: "PUT",
        headers: {
            "content-type": "application/json",
            "x-now": now,
        },
        body: JSON.stringify(body),
    });
}

test("replays recorded POST /quests/:id/complete examples", async () => {
    await resetDatabase();

    const questIds = new Map<string, string>();
    const completionIds = new Map<string, string>();

    for (const { line, entry } of recording) {
        if (entry.method === "PUT") {
            const response = await updateMe(entry.body ?? {}, entry.x_now);
            assert.equal(response.status, entry.status, `recording line ${line}`);
            continue;
        }

        if (entry.method === "DELETE") {
            const alias = entry.path.split("/").pop();
            const completionId = alias ? completionIds.get(alias) : undefined;
            if (!completionId) {
                throw new Error(`recording line ${line}: completion was not created`);
            }
            const { error } = await supabase
                .from("completions")
                .delete()
                .eq("id", completionId);
            assert.ifError(error);
            continue;
        }

        if (entry.path === "/quests") {
            if (entry.status !== 201 || !entry.body) {
                continue;
            }

            const response = await postQuest(entry.body, entry.x_now);
            assert.equal(response.status, entry.status, `recording line ${line}`);

            const body = await response.json() as { id?: string };
            assert.ok(body.id, `recording line ${line}: quest id missing`);
            questIds.set(`q${questIds.size + 1}`, body.id);
            continue;
        }

        const recordedQuestId = entry.path.match(/^\/quests\/(q\d+)\/complete$/)?.[1];
        assert.ok(recordedQuestId, `recording line ${line}: invalid completion path`);

        const questId = recordedQuestId === "q99"
            ? "00000000-0000-0000-0000-000000000099"
            : questIds.get(recordedQuestId);
        assert.ok(questId, `recording line ${line}: quest was not created`);

        const response = await completeQuest(`/quests/${questId}/complete`, entry.x_now);
        assert.equal(response.status, entry.status, `recording line ${line}`);

        const actual = await response.json() as Record<string, unknown>;
        const expected = entry.response as Record<string, unknown>;

        if (entry.status === 404) {
            assert.deepEqual(actual, expected);
            continue;
        }

        const actualCompletionId = (actual.completion as Record<string, unknown>).id;
        if (typeof actualCompletionId !== "string") {
            throw new Error(`recording line ${line}: completion id missing`);
        }

        const actualCompletion = actual.completion as Record<string, unknown>;
        const expectedCompletion = expected.completion as Record<string, unknown>;
        delete actualCompletion.id;
        delete expectedCompletion.id;
        delete actualCompletion.quest_id;
        delete expectedCompletion.quest_id;

        assert.deepEqual(actualCompletion, expectedCompletion);
        assert.deepEqual(actual.me, expected.me);

        if (entry.status === 201) {
            const completionAlias = `c${completionIds.size + 1}`;
            completionIds.set(completionAlias, actualCompletionId);
        }
    }
});
