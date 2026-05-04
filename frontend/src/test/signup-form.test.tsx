import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { SignupForm } from "@/components/auth/signup-form";
import { useRouter } from "next/navigation";


vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SignupForm", () => {
    it("renders email, password and confirm password fields", () => {
        render(<SignupForm />);
        expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it("renders the create account button", () => {
        render(<SignupForm />);
        expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
    });

    it("shows a link to sign in", () => {
        render(<SignupForm />);
        expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument();
    });

    it("shows error when passwords do not match", async () => {
        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "Password1!");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "Password2!");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));
        await screen.findByText("Passwords do not match.");
    });

    it("shows error when password is too short", async () => {
        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "Ab1!");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "Ab1!");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));
        await screen.findByText("Password must be at least 8 characters long.");
    });

    it("shows error when password has no uppercase letter", async () => {
        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "password1!");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "password1!");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));
        await screen.findByText("Password must include at least one uppercase letter.");
    });

    it("shows error when password has no special character", async () => {
        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "Password1");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "Password1");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));
        await screen.findByText("Password must include at least one special character.");
    });

    it("redirects to /login on successful signup", async () => {
        const push = vi.fn();
        vi.mocked(useRouter).mockReturnValue({ push } as any);

        server.use(
            http.post("http://localhost:8000/api/v1/user/", () =>
                HttpResponse.json({ id: 1, email: "test@example.com" })
            )
        );

        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "Password1!");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "Password1!");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        await screen.findByRole("button", { name: /create account/i });
        expect(push).toHaveBeenCalledWith("/login");
    });

    it("shows error message from server on failed signup", async () => {
        server.use(
            http.post("http://localhost:8000/api/v1/user/", () =>
                HttpResponse.json({ detail: "Email already registered." }, { status: 409 })
            )
        );

        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "Password1!");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "Password1!");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        await screen.findByText("Email already registered.");
    });

    it("disables button while submitting", async () => {
        server.use(
            http.post("http://localhost:8000/api/v1/user/", async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return HttpResponse.json({ id: 1, email: "test@example.com" });
            })
        );

        render(<SignupForm />);
        await userEvent.type(screen.getByLabelText(/^email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/^password$/i), "Password1!");
        await userEvent.type(screen.getByLabelText(/confirm password/i), "Password1!");
        await userEvent.click(screen.getByRole("button", { name: /create account/i }));

        expect(screen.getByRole("button", { name: /creating account/i })).toBeDisabled();
    });
});