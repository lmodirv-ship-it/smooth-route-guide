import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-qr-code", () => ({
  default: {
    default: ({ value }: { value: string }) => <svg data-testid="qr-code" data-value={value} />,
  },
}));

vi.mock("@/lib/firebase", () => ({
  auth: {},
  db: {},
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return () => {};
  },
  signOut: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
}));

import Welcome from "@/pages/Welcome";

describe("Welcome", () => {
  it("renders the QR section without crashing when the QR module is wrapped in nested default exports", () => {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );

    expect(screen.getByText("امسح الكود بالجوال")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code")).toHaveAttribute(
      "data-value",
      "https://smooth-route-guide.lovable.app/welcome#mobile-download",
    );
  });
});
