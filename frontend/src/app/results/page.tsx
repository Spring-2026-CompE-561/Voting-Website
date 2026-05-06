"use client";

import { Component, Suspense } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { BackHomeLink } from "@/components/custom/back-home-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Globe from "@/components/ui/globe";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

type TodayQuestion = {
  id: number;
};

type ResultItem = {
  option_id: number;
  option_text: string;
  votes: number;
};

type QuestionResults = {
  id: number;
  title: string;
  description: string | null;
  question_text: string;
  publish_date: string;
  created_at: string;
  results: ResultItem[];
  vote_locations: {
    latitude: number;
    longitude: number;
    country: string | null;
    votes: number;
  }[];
};

type ExistingVote = {
  option_id: number;
};

class GlobeErrorBoundary extends Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const [results, setResults] = useState<QuestionResults | null>(null);
  const [userVoteOptionId, setUserVoteOptionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setErrorMessage(null);

        let questionId = searchParams.get("questionId");
        if (!questionId) {
          const todayResponse = await fetch(`${API_BASE_URL}/api/v1/question/today`);
          if (todayResponse.status === 404) {
            setResults(null);
            return;
          }
          if (!todayResponse.ok) {
            throw new Error("Failed to load today's question.");
          }

          const todayQuestion = (await todayResponse.json()) as TodayQuestion;
          questionId = String(todayQuestion.id);
        }

        const resultsResponse = await fetch(
          `${API_BASE_URL}/api/v1/question/${questionId}/results`,
        );
        if (!resultsResponse.ok) {
          throw new Error("Failed to load results.");
        }

        const data = (await resultsResponse.json()) as QuestionResults;
        setResults(data);

        const voteResponse = await fetch(
          `${API_BASE_URL}/api/v1/vote/me/question/${questionId}`,
          {
            credentials: "include",
          },
        );

        if (voteResponse.ok) {
          const voteData = (await voteResponse.json()) as ExistingVote | null;
          setUserVoteOptionId(voteData?.option_id ?? null);
        }
      } catch (error) {
        console.error(error);
        setErrorMessage("We couldn't load the results right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [searchParams]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading results...</p>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </main>
    );
  }

  if (!results) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          No results are available yet because there is no scheduled question.
        </p>
      </main>
    );
  }

  const totalVotes = results.results.reduce(
    (sum, optionResult) => sum + optionResult.votes,
    0,
  );

  return (
    <main className="space-y-8">
      <div className="space-y-6">
        <BackHomeLink />

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Today&apos;s Question
          </p>
          <p className="text-sm text-muted-foreground">
            {formatDateOnly(results.publish_date, {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <h1 className="text-3xl font-semibold leading-tight">
            {results.question_text}
          </h1>
          {results.description ? (
            <p className="text-sm text-muted-foreground">{results.description}</p>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Live Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {results.results.map((result) => {
              const percentage =
                totalVotes === 0 ? 0 : Math.round((result.votes / totalVotes) * 100);
              const isUserChoice = userVoteOptionId === result.option_id;

              return (
                <div key={result.option_id} className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-medium">
                      {result.option_text}
                      {isUserChoice ? " • Your vote" : ""}
                    </span>
                    <span className="text-muted-foreground">
                      {result.votes.toLocaleString()} votes ({percentage}%)
                    </span>
                  </div>
                  <div
                    className={`h-3 overflow-hidden rounded-full bg-muted ${
                      isUserChoice ? "ring-1 ring-primary/30" : ""
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all ${
                        isUserChoice ? "bg-primary" : "bg-primary/60"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vote Map</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <GlobeErrorBoundary>
              <Globe
                width={520}
                height={320}
                points={results.vote_locations}
                className="mx-auto border"
              />
            </GlobeErrorBoundary>
            <p className="text-sm text-muted-foreground">
              {results.vote_locations.length === 0
                ? "No location data has been shared for this question yet."
                : `${results.vote_locations.reduce(
                    (sum, location) => sum + location.votes,
                    0,
                  )} location-aware votes shown.`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <p className="text-2xl font-semibold">{totalVotes.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">
                votes from around the community
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/vote"
                className={cn(buttonVariants({ variant: "default" }), "w-full")}
              >
                Answer Today&apos;s Question
              </Link>
              <Link
                href="/history"
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                View Full History
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading results...</p>
      </main>
    }>
      <ResultsContent />
    </Suspense>
  );
}
