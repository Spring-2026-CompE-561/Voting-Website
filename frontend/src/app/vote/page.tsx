"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { formatDateOnly } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Option = {
  id: number;
  question_id: number;
  option_text: string;
  created_at: string;
};

type TodayQuestion = {
  id: number;
  title: string;
  description: string | null;
  question_text: string;
  publish_date: string;
  created_at: string;
  options: Option[];
};

type ExistingVote = {
  id: number;
  user_id: number;
  question_id: number;
  option_id: number;
  created_at: string;
};

function VoteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState<TodayQuestion | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [existingVote, setExistingVote] = useState<ExistingVote | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        setErrorMessage(null);
        const questionId = searchParams.get("questionId");
        const url = questionId
          ? `${API_BASE_URL}/api/v1/question/${questionId}`
          : `${API_BASE_URL}/api/v1/question/today`;
        const res = await fetch(url);
        if (res.status === 404) {
          setQuestion(null);
          return;
        }
        if (!res.ok) {
          throw new Error("Failed to fetch today's question");
        }
        const data: TodayQuestion = await res.json();
        setQuestion(data);
      } catch (error) {
        console.error(error);
        setErrorMessage("We couldn't load today's question. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestion();
  }, [searchParams]);

  useEffect(() => {
    const fetchExistingVote = async () => {
      if (!question) {
        setExistingVote(null);
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/vote/me/question/${question.id}`,
          {
            credentials: "include",
          },
        );

        if (response.status === 401) {
          setExistingVote(null);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load your saved vote.");
        }

        const data = (await response.json()) as ExistingVote | null;
        setExistingVote(data);
        if (data) {
          setSelectedOptionId(data.option_id);
          setSubmitSuccess("You already voted on today's question.");
          setSubmitError(null);
        } else {
          setSubmitSuccess(null);
        }
      } catch (error) {
        console.error(error);
      }
    };

    fetchExistingVote();
  }, [question]);

  const handleVoteSubmit = async () => {
    if (!question || selectedOptionId === null || existingVote) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const location = await getVoteLocation();
      const response = await fetch(`${API_BASE_URL}/api/v1/vote/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: question.id,
          option_id: selectedOptionId,
          ...location,
        }),
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 409) {
        const errorData = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        setSubmitError(
          errorData?.detail ?? "You have already voted on this question.",
        );
        return;
      }

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          detail?: string;
        } | null;
        throw new Error(errorData?.detail ?? "Unable to submit your vote.");
      }

      const createdVote = (await response.json()) as ExistingVote;
      setExistingVote(createdVote);
      setSubmitSuccess("Thanks for voting. Your response has been recorded.");
    } catch (submitVoteError) {
      const message =
        submitVoteError instanceof Error
          ? submitVoteError.message
          : "Unable to submit your vote.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = question
    ? formatDateOnly(question.publish_date, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading today’s question...</p>
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

  if (!question) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            No question is scheduled for today yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Add one from the admin flow or seed script and this page will pick it up.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Vodle</h1>
          <p className="mt-2 text-sm text-muted-foreground">{formattedDate}</p>
        </div>

        <Card>
          <CardHeader>
            <p className="text-center text-sm uppercase tracking-[0.2em] text-muted-foreground">
              {question.title}
            </p>
            <CardTitle className="text-center text-2xl">
              {question.question_text}
            </CardTitle>
            {question.description ? (
              <p className="text-center text-sm text-muted-foreground">
                {question.description}
              </p>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3">
              {question.options.map((option) => {
                const isSelected = selectedOptionId === option.id;

                return (
                  <button
                    key={option.id}
                    onClick={() => {
                      if (!existingVote) {
                        setSelectedOptionId(option.id);
                      }
                    }}
                    disabled={Boolean(existingVote)}
                    className={`w-full rounded-md border px-4 py-3 text-base font-medium transition ${
                      isSelected
                        ? "bg-foreground text-background"
                        : "bg-background text-foreground hover:bg-muted"
                    } ${
                      existingVote ? "cursor-default opacity-80" : ""
                    }`}
                  >
                    {option.option_text}
                  </button>
                );
              })}
            </div>

            <Button
              className="w-full"
              disabled={selectedOptionId === null || submitting || Boolean(existingVote)}
              onClick={handleVoteSubmit}
            >
              {existingVote
                ? "Vote Submitted"
                : submitting
                  ? "Submitting Vote..."
                  : "Submit Vote"}
            </Button>
            {submitError ? (
              <p className="text-center text-sm text-destructive">
                {submitError}
              </p>
            ) : null}
            {submitSuccess ? (
              <div className="space-y-3 text-center">
                <p className="text-sm text-foreground">{submitSuccess}</p>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/results?questionId=${question.id}`)}
                >
                  View Results
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function VotePage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">Loading today&apos;s question...</p>
      </main>
    }>
      <VoteContent />
    </Suspense>
  );
}

function getVoteLocation(): Promise<{
  latitude?: number;
  longitude?: number;
} | null> {
  if (!navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: false, maximumAge: 600000, timeout: 3000 },
    );
  });
}
