"use client";

import styles from "./page.module.css";
import LevelCard from "@/components/LevelCard";
import { useState, useEffect } from "react";
import NewQuestCard from "@/components/NewQuestCard";
import AllQuests from "@/components/AllQuests";
import type { Quest } from "@/components/AllQuests";

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
  const [error, setError] = useState<string>('');
  const [submitQuest, setSubmitQuest] = useState(false);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [completingQuestId, setCompletingQuestId] = useState<string | null>(null);

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

      await Promise.all([loadUserData(), loadQuests()]);
    }catch(err){
      setError('Unable to complete quest');
    }finally{
      setCompletingQuestId(null);
    }
  }

  useEffect(() => {
    void loadUserData();
    void loadQuests();
  }, []);

  useEffect(() => {
    void loadUserData();
  }, [quests])

  return (
    <main className={styles.page}>
      {error ? <p>{error}</p> : null}
      {userData ? <LevelCard userData={userData} /> : null}

      <NewQuestCard
        handleCreateQuest={handleCreateQuest}
        submitQuest={submitQuest}
      />
      <AllQuests
        quests={quests}
        completeQuest={handleCompleteQuest}
        completingQuestId={completingQuestId}
      />
    </main>
  );
}
