import { vi, describe, it, expect } from "vitest";
import {
  authenticate,
  isAdmin,
  redirectIfAuthenticated,
  isDemo,
} from "../../../middleware/middleware";

// Test authenticate
describe("authenticate middleware", () => {
  it("calls next if authenticated", () => {
    const req = { isAuthenticated: () => true, flash: vi.fn() };
    const res = { redirect: vi.fn() };
    const next = vi.fn();
    authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("redirects if not authenticated", () => {
    const req = { isAuthenticated: () => false, flash: vi.fn() };
    const res = { redirect: vi.fn() };
    const next = vi.fn();
    authenticate(req, res, next);
    expect(req.flash).toHaveBeenCalledWith("error", "Not logged in");
    expect(res.redirect).toHaveBeenCalledWith("/");
    expect(next).not.toHaveBeenCalled();
  });
});

// Test isAdmin
describe("isAdmin middleware", () => {
  it("calls next if user is admin", () => {
    const req = { user: { role: "admin" }, flash: vi.fn() };
    const res = { redirect: vi.fn() };
    const next = vi.fn();
    isAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("redirects if user is not admin", () => {
    const req = { user: { role: "user" }, flash: vi.fn() };
    const res = { redirect: vi.fn() };
    const next = vi.fn();
    isAdmin(req, res, next);
    expect(req.flash).toHaveBeenCalledWith("error", "Unauthorized: Admin only");
    expect(res.redirect).toHaveBeenCalledWith("/");
    expect(next).not.toHaveBeenCalled();
  });
});

// Test RedirectIfAuthenticated
describe("redirectIfAuthenticated middleware", () => {
  it("redirects if authenticated", () => {
    const req = { isAuthenticated: () => true };
    const res = { redirect: vi.fn() };
    const next = vi.fn();
    redirectIfAuthenticated(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith("/user/account");
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next if not authenticated", () => {
    const req = { isAuthenticated: () => false };
    const res = { redirect: vi.fn() };
    const next = vi.fn();
    redirectIfAuthenticated(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

describe("isDemo middleware", () => {
  it("should block admin@demo.com and redirect with flash", () => {
    const req = {
      user: { email: "admin@demo.com" },
      flash: vi.fn(),
    };
    const res = { redirect: vi.fn() };
    const next = vi.fn();

    isDemo(req, res, next);

    expect(req.flash).toHaveBeenCalledWith(
      "error",
      "This action is disabled in demo mode"
    );
    expect(res.redirect).toHaveBeenCalledWith("/admin/dashboard");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() for non-demo users", () => {
    const req = {
      user: { email: "user@demo.com" },
      flash: vi.fn(),
    };
    const res = { redirect: vi.fn() };
    const next = vi.fn();

    isDemo(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.flash).not.toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
