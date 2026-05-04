import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers } from "./msw/handlers";
import ResultsPage from "@/app/results/page";
import { useSearchParams } from "next/navigation";


vi.mock("next/navigation", () => ({
    useSearchParams: vi.fn(() => ({ get: () => "1" })),
}));

vi.mock("@/components/ui/globe", () => ({
    default: () => <div data-testid="globe" />,
}));

const mockResults = {
    id: 1,
    title: "Test Question",
    question_text: "What is your favorite color?",
    description: null,
    publish_date: "2026-05-01",
    created_at: "2026-05-01T00:00:00",
    results: [
        { option_id: 1, option_text: "Red", votes: 75 },
        { option_id: 2, option_text: "Blue", votes: 25 },
    ],
    vote_locations: [],
};

const server = setupServer(
    ...handlers,
    http.get("http://localhost:8000/api/v1/question/1/results", () =>
        HttpResponse.json(mockResults)
    )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ResultsPage", () => {
    it("shows loading state initially", () => {
        render(<ResultsPage />);
        expect(screen.getByText(/loading results/i)).toBeInTheDocument();
    });

    it("renders the question text after loading", async () => {
        render(<ResultsPage />);
        await screen.findByText("What is your favorite color?");
    });

    it("renders all options with vote counts", async () => {
        render(<ResultsPage />);
        await screen.findByText("What is your favorite color?");
        expect(screen.getByText("Red")).toBeInTheDocument();
        expect(screen.getByText("Blue")).toBeInTheDocument();
        expect(screen.getAllByText(/75/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/25/)[0]).toBeInTheDocument();
    });

    it("shows correct percentages", async () => {
        render(<ResultsPage />);
        await screen.findByText("What is your favorite color?");
        expect(screen.getByText(/75%/i)).toBeInTheDocument();
        expect(screen.getByText(/25%/i)).toBeInTheDocument();
    });

    it("highlights the user's vote", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/vote/me/question/1", () =>
                HttpResponse.json({ option_id: 1 })
            )
        );
        render(<ResultsPage />);
        await screen.findByText(/your vote/i);
    });

    it("shows no location data message when vote_locations is empty", async () => {
        render(<ResultsPage />);
        await screen.findByText(/no location data has been shared/i);
    });

    it("shows no results message when question does not exist", async () => {
        vi.mocked(useSearchParams).mockReturnValue({ get: () => null } as any);
        server.use(
            http.get("http://localhost:8000/api/v1/question/today", () =>
                HttpResponse.json(null, { status: 404 })
            )
        );
        render(<ResultsPage />);
        await screen.findByText(/no results are available/i);
    });

    it("renders the globe component", async () => {
        render(<ResultsPage />);
        await screen.findByText("What is your favorite color?");
        expect(screen.getByTestId("globe")).toBeInTheDocument();
    });
});