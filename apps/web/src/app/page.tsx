"use client";

import styles from "./page.module.css";
import LevelCard from "@/components/LevelCard";
import { useState, useEffect, useMemo, useRef } from "react";
import NewQuestCard from "@/components/NewQuestCard";
import AllQuests from "@/components/AllQuests";
import type { Quest } from "@/components/AllQuests";
import RecentCompletions from "@/components/RecentCompletions";
import type { Completion } from "@/components/RecentCompletions";
import LevelUpPopup from "@/components/LevelUpPopup";

export interface UserData{
  xp: number;
  xpIntoLevel: number,
  xpToNextLevel: number,
  streak: number,
  level: number,
  timezone: string
}

export default function Home() {

  const [userData, setUserData] = useState<UserData>();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [error, setError] = useState<string>('');
  const [submitQuest, setSubmitQuest] = useState(false);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);
  const [undoingCompletionId, setUndoingCompletionId] = useState<string | null>(null);
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const timezonePopoverRef = useRef<HTMLDivElement>(null);
  const [newLevel, setNewLevel] = useState(false);

  const timezones = useMemo(() => Intl.supportedValuesOf("timeZone"), []);
  const filteredTimezones = useMemo(() => {
    const query = timezoneSearch.trim().toLowerCase();
    return query
      ? timezones.filter((timezone) => timezone.toLowerCase().includes(query))
      : timezones;
  }, [timezones, timezoneSearch]);

  const handleCreateQuest = async (title: string, difficulty: string, recurrence: string, dueDate: string) => {

    setError('');
    setSubmitQuest(true);
    try {
      const body: {title: string; difficulty: string; due_date?: string; recurrence?: "daily"} = { title, difficulty };

      if (recurrence === "daily") {
        body.recurrence = "daily";
      } else if (dueDate) {
        body.due_date = dueDate;
      }

      const res = await fetch("/api/quests", {method: "POST", body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "X-Now": new Date().toISOString(),
        },
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Internal server error");
        return;
      }

      await loadQuests();
      
    } catch {
      setError("Unable to create quest");
    } finally {
      setSubmitQuest(false);
    }
  };

  const loadUserData = async () => {
    try {
      const res = await fetch("/api/me", { method: "GET" });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Internal server error");
        return;
      }

      if(data.level > userData?.level!)
        setNewLevel(true);

      setUserData({
        xp: data.xp,
        xpIntoLevel: data.xp_into_level,
        xpToNextLevel: data.xp_to_next_level,
        streak: data.streak,
        level: data.level,
        timezone: data.timezone,
      });

    } catch {
      setError("Unable to load user data");
    }
  };

  const loadQuests = async () => {
    setError('');
    setLoadingQuests(true);
    try {
      const res = await fetch("/api/quests");
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Unable to load quests");
        return;
      }

      setQuests(data);
    } catch {
      setError("Unable to load quests");
    } finally{
      setLoadingQuests(false);
    }
  };

  const loadCompletions = async () => {
    try {
      const res = await fetch("/api/completions");
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Unable to load completions");
        return;
      }
      setCompletions(data);
    } catch {
      setError("Unable to load completions");
    }
  };

  const handleCompleteQuest = async(id: string) => {
    setError('')
    setCompletingQuestId(id);
    try{

      const res = await fetch(`/api/quests/${encodeURIComponent(id)}/complete`, {
        method: "POST",
        headers: {
          "X-Now": new Date().toISOString(),
        },
      });
      const data = await res.json();

      if(!res.ok || data.error){
        setError(data.error ?? 'Unable to complete quest');
        return;
      }

      await Promise.all([loadUserData(), loadQuests(), loadCompletions()]);
    }catch(err){
      setError('Unable to complete quest');
    }finally{
      setCompletingQuestId(null);
    }

  }

  const handleUndoCompletion = async (id: string) => {
    setError("");
    setUndoingCompletionId(id);
    try {
      const res = await fetch(`/api/completions/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Unable to undo completion");
        return;
      }
      await Promise.all([loadUserData(), loadQuests(), loadCompletions()]);
    } catch {
      setError("Unable to undo completion");
    } finally {
      setUndoingCompletionId(null);
    }
  };

  const handleTimezoneChange = async (timezone: string) => {
    if (!userData || timezone === userData.timezone) {
      setTimezonePopoverOpen(false);
      return;
    }

    setError("");
    try {
      const res = await fetch("/api/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Unable to update timezone");
        return;
      }

      setUserData({
        xp: data.xp,
        xpIntoLevel: data.xp_into_level,
        xpToNextLevel: data.xp_to_next_level,
        streak: data.streak,
        level: data.level,
        timezone: data.timezone,
      });
      setTimezonePopoverOpen(false);
      setTimezoneSearch("");
    } catch {
      setError("Unable to update timezone");
    }
  };

  const handlePopupDismiss = ()=>{
    setNewLevel(false);
  }

  useEffect(() => {
    void loadUserData();
    void loadQuests();
    void loadCompletions();
  }, []);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        timezonePopoverRef.current &&
        !timezonePopoverRef.current.contains(event.target as Node)
      ) {
        setTimezonePopoverOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  useEffect(() => {
    void loadUserData();
  }, [quests])

  return (
    <main className={styles.page}>
      {newLevel && (
        <LevelUpPopup level={userData?.level!} handleDismiss={handlePopupDismiss}></LevelUpPopup>
      )}
      <header className={styles.header}>
        <span className={styles.brand}>Quests</span>
        <div className={styles.timezoneControl} ref={timezonePopoverRef}>
          <button
            className={styles.timezoneButton}
            type="button"
            aria-expanded={timezonePopoverOpen}
            aria-haspopup="dialog"
            onClick={() => setTimezonePopoverOpen((open) => !open)}
          >
            {userData?.timezone ?? "Select timezone"}
            <span aria-hidden="true">⌄</span>
          </button>

          {timezonePopoverOpen ? (
            <div className={styles.timezonePopover} role="dialog" aria-label="Choose timezone">
              <input
                className={styles.timezoneSearch}
                type="search"
                value={timezoneSearch}
                onChange={(event) => setTimezoneSearch(event.target.value)}
                placeholder="Search timezones"
                autoFocus
              />
              <div className={styles.timezoneList}>
                {filteredTimezones.map((timezone) => (
                  <button
                    className={styles.timezoneOption}
                    type="button"
                    key={timezone}
                    onClick={() => void handleTimezoneChange(timezone)}
                  >
                    <span>{timezone}</span>
                    <span className={styles.timezoneMeta}>
                      {currentTime
                        ? new Intl.DateTimeFormat("en", {
                            timeZone: timezone,
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          }).format(currentTime)
                        : "--:--"}
                      {timezone === userData?.timezone ? " ✓" : ""}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>
      {error ? <p>{error}</p> : null}
      {userData ? <LevelCard userData={userData} /> : null}

      <NewQuestCard
        handleCreateQuest={handleCreateQuest}
        submitQuest={submitQuest}
      />
      <div className={styles.questContent}>
        <AllQuests
          quests={quests}
          completeQuest={handleCompleteQuest}
          completingQuestId={completingQuestId}
        />
        <RecentCompletions
          completions={completions}
          quests={quests}
          undoCompletion={handleUndoCompletion}
          undoingCompletionId={undoingCompletionId}
          timezone={userData?.timezone}
        />
      </div>
    </main>
  );
}
