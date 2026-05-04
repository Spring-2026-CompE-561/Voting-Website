import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { LoginForm } from "@/components/auth/login-form";


vi.mock("next/navigation", () => ({
    useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("LoginForm", () => {
    it("renders email and password fields", () => {
        render(<LoginForm />);
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
    
    it("renders the login button", () => {
        render(<LoginForm />);
        expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
    });
    
    it("shows a link to sign up", () => {
        render(<LoginForm />);
        expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
    });
    
    it("redirects to /vote on successful login", async () => {
        const push = vi.fn();
        const { useRouter } = await import("next/navigation");
        vi.mocked(useRouter).mockReturnValue({ push } as any);
        
        server.use(
            http.post("http://localhost:8000/api/v1/user/login", () =>
                HttpResponse.json({ access_token: "fake-token" })
            )
        );
        
        render(<LoginForm />);
        await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/password/i), "password123");
        await userEvent.click(screen.getByRole("button", { name: /login/i }));
        
        await screen.findByRole("button", { name: /login/i });
        expect(push).toHaveBeenCalledWith("/vote");
    });
    
    it("shows error message on failed login", async () => {
        server.use(
            http.post("http://localhost:8000/api/v1/user/login", () =>
                HttpResponse.json({ detail: "Invalid credentials" }, { status: 401 })
            )
        );
        
        render(<LoginForm />);
        await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/password/i), "wrongpassword");
        await userEvent.click(screen.getByRole("button", { name: /login/i }));
    
        await screen.findByText("Invalid credentials");
    });

    it("disables the button while submitting", async () => {
        server.use(
            http.post("http://localhost:8000/api/v1/user/login", async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return HttpResponse.json({ access_token: "fake-token" });
            })
        );

        render(<LoginForm />);
        await userEvent.type(screen.getByLabelText(/email/i), "test@example.com");
        await userEvent.type(screen.getByLabelText(/password/i), "password123");
        await userEvent.click(screen.getByRole("button", { name: /login/i }));

        expect(screen.getByRole("button", { name: /logging in/i })).toBeDisabled();
    });
});