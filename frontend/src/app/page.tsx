"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { API_BASE_URL } from "@/lib/api";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { VodleLogo } from "@/components/custom/vodle-logo";
import Globe from "@/components/ui/globe";

type CurrentUser = {
  username: string;
};

type UserStats = {
  total_answers: number;
  current_streak: number;
  longest_streak: number;
};

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [meResponse, statsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/user/me`, {
            credentials: "include",
          }),
          fetch(`${API_BASE_URL}/api/v1/user/me/stats`, {
            credentials: "include",
          }),
        ]);

        if (meResponse.status === 401 || statsResponse.status === 401) {
          setIsAuthenticated(false);
          return;
        }

        if (!meResponse.ok || !statsResponse.ok) {
          throw new Error("Unable to load personalized home data.");
        }

        const meData = (await meResponse.json()) as CurrentUser;
        const statsData = (await statsResponse.json()) as UserStats;
        setUsername(meData.username);
        setStats(statsData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error(error);
        setIsAuthenticated(false);
      }
    };

    loadHomeData();
  }, []);

  const [todayLabel, setTodayLabel] = useState("");
  useEffect(() => {
    setTodayLabel(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    );
  }, []);

  if (isAuthenticated && stats) {
    return (
      <main className="space-y-8">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
              {todayLabel}
            </p>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold leading-tight">
                Welcome back{username ? `, ${username}` : ""}.
              </h1>
              <p className="max-w-xl text-muted-foreground">
                Your next daily vote is ready. Keep your streak alive and see how
                your choices compare with the rest of the community.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/vote"
                className={buttonVariants({ variant: "default" })}
              >
                Go To Today&apos;s Vote
              </Link>
              <Link
                href="/history"
                className={cn(buttonVariants({ variant: "outline" }))}
              >
                View History
              </Link>
            </div>
          </div>

          <div className="mx-auto hidden lg:block">
            <Globe width={280} height={280} className="rounded-3xl border" />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Total Answers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.total_answers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.current_streak}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Longest Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{stats.longest_streak}</p>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-6">
      <section className="w-full max-w-md text-center">
        <div className="space-y-8">
          <div className="flex justify-center">
            <Globe width={100} height={100} className="rounded-lg border" />
          </div>

          <div className="space-y-3">
            <div className="flex justify-center">
              <VodleLogo size="large" />
            </div>

            <p className="text-sm text-muted-foreground">
              Daily opinions. Global perspective.
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              {todayLabel}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/login"
              className="rounded-md bg-foreground px-4 py-2 font-medium text-background transition hover:opacity-90"
            >
              Log In
            </Link>

            <Link
              href="/signup"
              className="rounded-md border px-4 py-2 font-medium transition hover:bg-muted"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
