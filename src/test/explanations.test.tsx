import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AiExplainPanel } from "@/components/check/AiExplainPanel";
import { checks } from "@/data/mock";
import { applyVariants } from "@/context/ChecksContext";
import { EXPLANATION_DRAFTS, REQUEST_DRAFTS } from "@/data/problems";

afterEach(cleanup);
const problems = checks.flatMap((check) => check.rows).filter((row) => row.status !== "verified");

describe("Rule explanations", () => {
  it.each(problems.map((row) => [row.id, row] as const))("shows all three blocks immediately for %s", (_id, row) => {
    render(<AiExplainPanel row={row} />);
    expect(screen.getByText("Что не сходится")).toBeInTheDocument();
    expect(screen.getByText(row.reason)).toBeInTheDocument();
    expect(screen.getByText("Возможные причины")).toBeInTheDocument();
    expect(row.causes?.length).toBeGreaterThan(0);
    expect(within(screen.getByRole("list")).getAllByRole("listitem").map((item) => item.textContent)).toEqual(row.causes);
    expect(screen.getByText("Рекомендация")).toBeInTheDocument();
    expect(row.recommendation?.trim()).toBeTruthy();
    expect(screen.getByText(row.recommendation!)).toBeInTheDocument();
    expect(screen.getByText("Статус ставят правила. Подпись за вами.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/ИИ/)).not.toBeInTheDocument();
  });

  it("includes the expert's payroll causes for both problematic salary articles", () => {
    for (const id of ["b-1", "c-1"]) {
      const row = problems.find((item) => item.id === id)!;
      expect(row.causes).toEqual(expect.arrayContaining([
        "Больничные не попали в сальдо.",
        "Учтены выданные авансы.",
        "Фактические затраты ниже плановых.",
      ]));
    }
  });

  it("removes the block once a correction verifies the indicator", () => {
    const base = checks.find((check) => check.id === "b")!;
    const { container, rerender } = render(<AiExplainPanel row={base.rows[0]!} />);
    const corrected = applyVariants(base, { "b-1": "fix" });
    rerender(<AiExplainPanel row={corrected.rows[0]!} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("explains a manually selected document mismatch without stale ambiguity advice", () => {
    const check = applyVariants(checks.find((item) => item.id === "c")!, { "c-7": "pick-ar09-1" });
    const row = check.rows.find((item) => item.id === "c-7")!;
    render(<AiExplainPanel row={row} />);
    expect(row.status).toBe("discrepancy");
    expect(screen.getByText(/Выбран акт АР-09\/1 по договору А-7\/1/)).toBeInTheDocument();
    expect(screen.getByText(/выберите акт АР-09 либо/)).toBeInTheDocument();
  });

  it("distinguishes the unconfirmed article from its difference and removes AI labels from drafts", () => {
    expect(EXPLANATION_DRAFTS["g"]).toContain("не подтверждена статья 0800: 415 600,00 ₽ (15,3%), расхождение 10 500,00 ₽");
    expect(EXPLANATION_DRAFTS["g"]).toContain("2 300 300,00 ₽ (84,7%)");
    for (const draft of [...Object.values(EXPLANATION_DRAFTS), ...Object.values(REQUEST_DRAFTS)]) {
      expect(draft).not.toContain("ИИ");
    }
  });
});
