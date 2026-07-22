import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ForbiddenPage from "@/pages/ForbiddenPage";
import ServerErrorPage from "@/pages/ServerErrorPage";

describe("Error pages", () => {
  it("renders 403 page", () => {
    render(
      <MemoryRouter>
        <ForbiddenPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/403/)).toBeInTheDocument();
    expect(screen.getByText(/ممنوع الوصول/)).toBeInTheDocument();
  });

  it("renders 500 page", () => {
    render(
      <MemoryRouter>
        <ServerErrorPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تحديث/ })).toBeInTheDocument();
  });
});
