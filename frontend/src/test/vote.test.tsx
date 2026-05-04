import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { handlers } from "./msw/handlers";
import VotePage from "@/app/vote/page";
import { useRouter } from "next/navigation";


vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
    useSearchParams: () => ({ get: () => null }),
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("VotePage", () => {
    it("shows loading state inmitially", () => {
        render(<VotePage />);
        expect(screen.getByText(/loading today/i)).toBeInTheDocument();
    });

    it("renders question and options after loading", async () => {
        render(<VotePage />);
        await screen.findByText("What is your favorite color?");
        expect(screen.getByText("Red")).toBeInTheDocument();
        expect(screen.getByText("Blue")).toBeInTheDocument();
    });

    it("shows already voted state when user has an existing vote", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/vote/me/question/:id", () =>
            HttpResponse.json({
                id: 1,
                user_id: 1,
                question_id: 1,
                option_id: 1,
                created_at: "",
            })
            )
        );

        render(<VotePage />);
        await screen.findByText(/you already voted/i);
        expect(screen.getByRole("button", { name: /vote submitted/i })).toBeDisabled();
    });

    it("submit button disabled until an option is selected", async () => {
        render(<VotePage />);
        await screen.findByText("What is your favorite color?");
        expect(screen.getByRole("button", { name: /submit vote/i })).toBeDisabled();
    });

    it("submit button enabled after selecting an option", async () => {
        render(<VotePage />);
        await screen.findByText("What is your favorite color?");
        await userEvent.click(screen.getByText("Red"));
        expect(screen.getByRole("button", { name: /submit vote/i })).not.toBeDisabled();
    });

    it("redirect to login when submitting without being authenticated", async () => {
        const push = vi.fn();
        vi.mocked(useRouter).mockReturnValue({ push } as any);

        server.use(
            http.post("http://localhost:8000/api/v1/vote/", () =>
            HttpResponse.json(null, { status: 401 })
            )
        );

        render(<VotePage />);
        await screen.findByText("What is your favorite color?");
        await userEvent.click(screen.getByText("Red"));
        await userEvent.click(screen.getByRole("button", { name: /submit vote/i }));

        await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    });

    it("shows success message after submitting a vote", async () => {
        render(<VotePage />);
        await screen.findByText("What is your favorite color?");
        await userEvent.click(screen.getByText("Red"));
        await userEvent.click(screen.getByRole("button", { name: /submit vote/i }));
        await screen.findByText(/thanks for voting/i);
    });

    it("shows no question message when API returns 404", async () => {
        server.use(
        http.get("http://localhost:8000/api/v1/question/today", () =>
            HttpResponse.json(null, { status: 404 })
        )
        );
        render(<VotePage />);
        await screen.findByText(/no question is scheduled for today/i);
    });
});