import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import HistoryPage from "@/app/history/page";

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockQuestions = [
    {
        id: 1,
        title: "Color Question",
        question_text: "What is your favorite color?",
        description: null,
        publish_date: "2026-05-02",
        created_at: "2026-05-02T00:00:00",
    },
    {
        id: 2,
        title: "Animal Question",
        question_text: "What is your favorite animal?",
        description: null,
        publish_date: "2026-05-01",
        created_at: "2026-05-01T00:00:00",
    },
];

const mockResults: Record<string, { results: { option_id: number; option_text: string; votes: number }[] }> = {
    "1": { results: [{ option_id: 1, option_text: "Red", votes: 75 }, { option_id: 2, option_text: "Blue", votes: 25 }] },
    "2": { results: [{ option_id: 3, option_text: "Dog", votes: 60 }, { option_id: 4, option_text: "Cat", votes: 40 }] },
};

const server = setupServer(
    http.get("http://localhost:8000/api/v1/question/", () =>
        HttpResponse.json(mockQuestions)
    ),
    http.get("http://localhost:8000/api/v1/question/:id/results", ({ params }) =>
        HttpResponse.json(mockResults[params.id as string])
    ),
    http.get("http://localhost:8000/api/v1/vote/me/question/:id", () =>
        HttpResponse.json(null, { status: 401 })
    )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HistoryPage", () => {
    it("shows loading state initially", () => {
        render(<HistoryPage />);
        expect(screen.getByText(/loading history/i)).toBeInTheDocument();
    });

    it("shows error message when history fails to load", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/question/", () =>
                HttpResponse.json(null, { status: 500 })
            )
        );
        render(<HistoryPage />);
        await screen.findByText(/unable to load question history/i);
    });

    it("renders today's question in the Today's Results section", async () => {
        render(<HistoryPage />);
        await screen.findByText("What is your favorite color?");
    });

    it("shows today's vote percentages", async () => {
        render(<HistoryPage />);
        await screen.findByText("What is your favorite color?");
        expect(screen.getByText("75%")).toBeInTheDocument();
        expect(screen.getByText("25%")).toBeInTheDocument();
    });

    it("shows the user's answer for today when they voted", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/vote/me/question/1", () =>
                HttpResponse.json({ option_id: 1 })
            )
        );
        render(<HistoryPage />);
        await screen.findByText(/you voted for/i);
    });

    it("renders a past question in the Past Results list", async () => {
        render(<HistoryPage />);
        await screen.findByText("What is your favorite animal?");
    });

    it("shows the top answer for a past question", async () => {
        render(<HistoryPage />);
        await screen.findByText("What is your favorite animal?");
        expect(screen.getByText(/top answer/i)).toBeInTheDocument();
        expect(screen.getAllByText("Dog")[0]).toBeInTheDocument();
    });

    it("shows the user's answer for a past question when they voted", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/vote/me/question/2", () =>
                HttpResponse.json({ option_id: 3 })
            )
        );
        render(<HistoryPage />);
        await screen.findByText("What is your favorite animal?");
        expect(screen.getByText(/your answer/i)).toBeInTheDocument();
    });

    it("shows Open Result link when user answered a past question", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/vote/me/question/2", () =>
                HttpResponse.json({ option_id: 3 })
            )
        );
        render(<HistoryPage />);
        await screen.findByText("What is your favorite animal?");
        expect(screen.getByRole("link", { name: /open result/i })).toHaveAttribute(
            "href",
            "/results?questionId=2"
        );
    });

    it("shows Answer Question link when user has not answered a past question", async () => {
        render(<HistoryPage />);
        await screen.findByText("What is your favorite animal?");
        expect(screen.getByRole("link", { name: /answer question/i })).toHaveAttribute(
            "href",
            "/vote?questionId=2"
        );
    });

    it("shows total vote count for a past question", async () => {
        render(<HistoryPage />);
        await screen.findByText("What is your favorite animal?");
        expect(screen.getByText(/100 votes/i)).toBeInTheDocument();
    });

    it("shows no match message when there are no past questions", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/question/", () =>
                HttpResponse.json([mockQuestions[0]])
            )
        );
        render(<HistoryPage />);
        await screen.findByText(/no published question matched that date/i);
    });

    it("shows no question message when today has no question", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/question/", () =>
                HttpResponse.json([mockQuestions[1]])
            )
        );
        render(<HistoryPage />);
        await screen.findByText(/today.s question has not been answered yet/i);
    });
});
