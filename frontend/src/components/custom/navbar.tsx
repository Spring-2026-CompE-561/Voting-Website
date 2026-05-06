"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { VodleLogo } from "@/components/custom/vodle-logo";
import { ModeToggle } from "@/components/custom/mode-toggle";
import { logoutUser } from "@/lib/auth";

const leftLinks = [
  { href: "/vote", label: "Vote" },
  { href: "/history", label: "History" },
];

const rightLinks = [
  { href: "/about", label: "About" },
  { href: "/settings", label: "Settings" },
  { href: "/account", label: "Account" },
];

type NavLink = {
  href: string;
  label: string;
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/user/me`, {
          credentials: "include",
        });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [pathname]);

  const handleLogout = async () => {
    await logoutUser(API_BASE_URL);
    setIsAuthenticated(false);
    setIsOpen(false);
    router.push("/login");
  };

  const renderLink = (link: NavLink) => {
    const isActive = pathname.startsWith(link.href);

    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={() => setIsOpen(false)}
        className={`text-sm transition-colors ${
          isActive
            ? "font-medium text-sky-700 dark:text-indigo-200"
            : "text-sky-700/70 hover:text-sky-700 dark:text-indigo-200/70 dark:hover:text-indigo-200"
        }`}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <header className="w-full border-b bg-background">
      <nav className="grid w-full grid-cols-[1fr_auto_1fr] items-center px-4 py-4 md:px-8">
        {/* Desktop Left Links */}
        <div className="hidden items-center gap-6 md:flex">
          {leftLinks.map(renderLink)}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={() => setIsOpen((prev) => !prev)}
            className="text-sky-700 transition-colors hover:text-sky-800 dark:text-indigo-200 dark:hover:text-indigo-100"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Center Logo */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="text-sky-700 transition-opacity hover:opacity-80 dark:text-indigo-200"
            onClick={() => setIsOpen(false)}
          >
            <VodleLogo size="small" />
          </Link>
        </div>

        {/* Desktop Right Links */}
        <div className="hidden items-center justify-end gap-6 md:flex">
          {rightLinks.map(renderLink)}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-sm text-sky-700/70 transition-colors hover:text-sky-700 dark:text-indigo-200/70 dark:hover:text-indigo-200"
            >
              Logout
            </button>
          ) : null}
          <ModeToggle />
        </div>

        {/* Mobile: theme toggle top-right */}
        <div className="flex justify-end md:hidden">
          <ModeToggle />
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t md:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col px-6 py-4">
            {[...leftLinks, ...rightLinks].map((link) => (
              <div key={link.href} className="py-3">
                {renderLink(link)}
              </div>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="py-3 text-left text-sm text-sky-700/70 transition-colors hover:text-sky-700 dark:text-indigo-200/70 dark:hover:text-indigo-200"
              >
                Logout
              </button>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
