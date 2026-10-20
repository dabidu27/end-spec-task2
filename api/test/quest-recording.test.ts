import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

type RecordingEntry = {
    x_now: string;
    method: string;
    path: string;
    body?: Record<string, unknown>;
    status: number;
    response?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const recordingPath = new URL("../../reference_recording.jsonl", import.meta.url);
const recording = (await readFile(recordingPath, "utf8"))
    .split("\n")
    .flatMap((line, index) => {
        if (!line.trim()) {
            return [];
        }

        const entry = JSON.parse(line) as RecordingEntry;
        return entry.method === "POST" && entry.path === "/quests"
            ? [{ line: index + 1, entry }]
            : [];
    });

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:3001";

async function postQuest(body: Record<string, unknown>, now = "2026-10-20T08:00:00+03:00") {
    return fetch(`${apiBaseUrl}/api/quests`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-now": now,
        },
        body: JSON.stringify(body),
    });
}

for (const { line, entry } of recording) {
    test(`recording line ${line}: POST ${entry.path}`, async () => {
        const response = await postQuest(entry.body ?? {}, entry.x_now);

        assert.equal(response.status, entry.status);

        const actual = await response.json() as Record<string, unknown>;
        const expected = { ...entry.response };
        if (entry.status === 201) {
            assert.ok(actual.id, "successful responses must include an id");
            delete actual.id;
            delete expected.id;
        }

        assert.deepEqual(actual, expected);
    });
}

test("happy path: creates a quest with a daily recurrence", async () => {
    const response = await postQuest({
        title: "Take a short walk",
        difficulty: "easy",
        recurrence: "daily",
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json().then((body) => ({
        title: body.title,
        difficulty: body.difficulty,
        due_date: body.due_date,
        recurrence: body.recurrence,
        done: body.done,
    })), {
        title: "Take a short walk",
        difficulty: "easy",
        due_date: null,
        recurrence: "daily",
        done: false,
    });
});

test("validation failure: rejects an unsupported difficulty", async () => {
    const response = await postQuest({
        title: "Unsupported difficulty",
        difficulty: "extreme",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid difficulty" });
});

test("validation failure: rejects a malformed request body", async () => {
    const response = await fetch(`${apiBaseUrl}/api/quests`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: "null",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid request body" });
});

test("not found: rejects an unknown quest route", async () => {
    const response = await fetch(`${apiBaseUrl}/api/quests/does-not-exist`, {
        method: "POST",
    });

    assert.equal(response.status, 404);
});

test("edge case: accepts a title of exactly 100 characters", async () => {
    const response = await postQuest({
        title: "a".repeat(100),
        difficulty: "medium",
    });

    assert.equal(response.status, 201);
});

test("edge case: rejects a title longer than 100 characters", async () => {
    const response = await postQuest({
        title: "a".repeat(101),
        difficulty: "medium",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid title" });
});

test("edge case: rejects an impossible calendar date", async () => {
    const response = await postQuest({
        title: "Use a valid date",
        difficulty: "easy",
        due_date: "2026-02-31",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "invalid due date" });
});

test("edge case: rejects both due_date and recurrence", async () => {
    const response = await postQuest({
        title: "Choose one schedule",
        difficulty: "hard",
        due_date: "2026-10-21",
        recurrence: "daily",
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
        error: "a quest cannot have both due_date and recurrence",
    });
});

const recordedGets = (await readFile(recordingPath, "utf8"))
    .split("\n")
    .flatMap((line, index) => {
        if (!line.trim()) {
            return [];
        }

        const entry = JSON.parse(line) as RecordingEntry;
        return entry.method === "GET" && entry.path === "/quests"
            ? [{ line: index + 1, entry }]
            : [];
    });

async function getQuests(now: string) {
    return fetch(`${apiBaseUrl}/api/quests`, {
        headers: { "x-now": now },
    });
}

test("GET /api/quests happy path: returns the required quest shape", async () => {
    const response = await getQuests("2026-10-26T08:04:00+02:00");

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.ok(Array.isArray(body));

    for (const quest of body) {
        assert.deepEqual(Object.keys(quest).sort(), [
            "difficulty",
            "done",
            "due_date",
            "id",
            "recurrence",
            "title",
        ]);
        assert.equal(typeof quest.id, "string");
        assert.equal(typeof quest.title, "string");
        assert.equal(typeof quest.difficulty, "string");
        assert.equal(typeof quest.done, "boolean");
        assert.ok(quest.due_date === null || typeof quest.due_date === "string");
        assert.ok(quest.recurrence === null || typeof quest.recurrence === "string");
    }
});

test("GET /api/quests failure: unknown quest sub-route returns 404", async () => {
    const response = await fetch(`${apiBaseUrl}/api/quests/not-a-quest`, {
        method: "GET",
    });

    assert.equal(response.status, 404);
});

for (const { line, entry } of recordedGets) {
    test(`recorded GET line ${line}: returns 200`, async () => {
        const response = await getQuests(entry.x_now);

        assert.equal(response.status, entry.status);
        assert.ok(Array.isArray(await response.json()));
    });
}
