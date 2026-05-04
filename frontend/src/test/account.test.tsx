import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import AccountPage from "@/app/account/page";
import { useRouter } from "next/navigation";

vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const mockUser = {
    id: 1,
    email: "test@example.com",
    role: "user",
    created_at: "2026-05-01T00:00:00",
};

const server = setupServer(
    http.get("http://localhost:8000/api/v1/user/me", () =>
        HttpResponse.json(mockUser)
    ),
    http.put("http://localhost:8000/api/v1/user/1", () =>
        HttpResponse.json(mockUser)
    ),
    http.delete("http://localhost:8000/api/v1/user/1", () =>
        new HttpResponse(null, { status: 204 })
    ),
    http.post("http://localhost:8000/api/v1/user/logout", () =>
        new HttpResponse(null, { status: 200 })
    )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AccountPage", () => {
    it("shows loading state initially", () => {
        render(<AccountPage />);
        expect(screen.getByText(/loading account/i)).toBeInTheDocument();
    });

    it("renders the user email after loading", async () => {
        render(<AccountPage />);
        await screen.findByText("test@example.com");
    });

    it("renders the user role after loading", async () => {
        render(<AccountPage />);
        await screen.findByText("user");
    });

    it("shows admin tools button when user is an admin", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/user/me", () =>
                HttpResponse.json({ ...mockUser, role: "admin" })
            )
        );
        render(<AccountPage />);
        await screen.findByRole("button", { name: /open admin tools/i });
    });

    it("does not show admin tools button for regular users", async () => {
        render(<AccountPage />);
        await screen.findByText("test@example.com");
        expect(screen.queryByRole("button", { name: /open admin tools/i })).not.toBeInTheDocument();
    });

    it("redirects to login when not authenticated", async () => {
        const push = vi.fn();
        vi.mocked(useRouter).mockReturnValue({ push } as any);

        server.use(
            http.get("http://localhost:8000/api/v1/user/me", () =>
                HttpResponse.json(null, { status: 401 })
            )
        );

        render(<AccountPage />);
        await waitFor(() => expect(push).toHaveBeenCalledWith("/login"));
    });

    it("shows error message when account fails to load", async () => {
        server.use(
            http.get("http://localhost:8000/api/v1/user/me", () =>
                HttpResponse.json(null, { status: 500 })
            )
        );

        render(<AccountPage />);
        await screen.findByText(/unable to load your account/i);
    });

    it("shows error when new passwords do not match", async () => {
        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.type(screen.getByLabelText(/^new password$/i), "Password1!");
        await userEvent.type(screen.getByLabelText(/confirm new password/i), "Password2!");
        await userEvent.click(screen.getByRole("button", { name: /update password/i }));

        await screen.findByText("Passwords do not match.");
    });

    it("shows error when new password is too short", async () => {
        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.type(screen.getByLabelText(/^new password$/i), "Ab1!");
        await userEvent.type(screen.getByLabelText(/confirm new password/i), "Ab1!");
        await userEvent.click(screen.getByRole("button", { name: /update password/i }));

        await screen.findByText("Password must be at least 8 characters long.");
    });

    it("shows success message after updating password", async () => {
        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.type(screen.getByLabelText(/^new password$/i), "NewPass1!");
        await userEvent.type(screen.getByLabelText(/confirm new password/i), "NewPass1!");
        await userEvent.click(screen.getByRole("button", { name: /update password/i }));

        await screen.findByText("Your password was updated successfully.");
    });

    it("shows error message when password update fails", async () => {
        server.use(
            http.put("http://localhost:8000/api/v1/user/1", () =>
                HttpResponse.json({ detail: "Unable to update your password." }, { status: 400 })
            )
        );

        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.type(screen.getByLabelText(/^new password$/i), "NewPass1!");
        await userEvent.type(screen.getByLabelText(/confirm new password/i), "NewPass1!");
        await userEvent.click(screen.getByRole("button", { name: /update password/i }));

        await screen.findByText("Unable to update your password.");
    });

    it("disables update button while submitting", async () => {
        server.use(
            http.put("http://localhost:8000/api/v1/user/1", async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return HttpResponse.json(mockUser);
            })
        );

        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.type(screen.getByLabelText(/^new password$/i), "NewPass1!");
        await userEvent.type(screen.getByLabelText(/confirm new password/i), "NewPass1!");
        await userEvent.click(screen.getByRole("button", { name: /update password/i }));

        expect(screen.getByRole("button", { name: /updating/i })).toBeDisabled();
    });

    it("redirects to home after successful account deletion", async () => {
        const push = vi.fn();
        vi.mocked(useRouter).mockReturnValue({ push } as any);

        vi.spyOn(window, "confirm").mockReturnValue(true);

        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.click(screen.getByRole("button", { name: /delete account/i }));

        await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    });

    it("does not delete when user cancels the confirmation", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(false);

        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.click(screen.getByRole("button", { name: /delete account/i }));

        await screen.findByText("test@example.com");
        expect(screen.queryByRole("button", { name: /deleting/i })).not.toBeInTheDocument();
    });

    it("shows error when account deletion fails", async () => {
        vi.spyOn(window, "confirm").mockReturnValue(true);

        server.use(
            http.delete("http://localhost:8000/api/v1/user/1", () =>
                HttpResponse.json({ detail: "Unable to delete your account." }, { status: 500 })
            )
        );

        render(<AccountPage />);
        await screen.findByText("test@example.com");

        await userEvent.click(screen.getByRole("button", { name: /delete account/i }));

        await screen.findByText("Unable to delete your account.");
    });
});
