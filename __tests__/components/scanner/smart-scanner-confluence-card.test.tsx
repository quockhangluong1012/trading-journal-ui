import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SmartScannerConfluenceCard } from "@/components/scanner/smart-scanner-confluence-card";
import type { SmartScannerConfluenceDto } from "@/lib/scanner-api";

const getSmartConfluenceMock = vi.fn();

vi.mock("@/lib/scanner-api", () => ({
  scannerApi: {
    getSmartConfluence: (...args: unknown[]) => getSmartConfluenceMock(...args),
  },
}));

function createSmartConfluenceResult(
  overrides: Partial<SmartScannerConfluenceDto> = {},
): SmartScannerConfluenceDto {
  return {
    symbol: "EURUSD",
    economicRiskState: "Yellow",
    economicRiskMessage: "High-impact event CPI (USD) in 42m.",
    minConfluenceScore: 1,
    maxConfluenceScore: 3,
    candidates: [
      {
        patternType: "FVG",
        confluenceScore: 3,
        confirmingTimeframes: ["H1", "M15"],
        signals: [
          {
            timeframe: "M15",
            priceAtDetection: 1.0845,
            zoneHigh: 1.086,
            zoneLow: 1.083,
            description: "M15 fair value gap retest inside higher-timeframe structure.",
            detectedAt: "2026-05-06T12:00:00Z",
          },
        ],
      },
    ],
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;

  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
}

describe("SmartScannerConfluenceCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests smart confluence for the selected symbol and renders the returned candidates", async () => {
    const user = userEvent.setup();
    const result = createSmartConfluenceResult();
    const pendingResult = createDeferred<SmartScannerConfluenceDto>();

    getSmartConfluenceMock.mockImplementation(() => pendingResult.promise);

    render(<SmartScannerConfluenceCard symbols={["GBPUSD", "EURUSD"]} />);

    await user.click(screen.getByRole("button", { name: "EURUSD" }));
    await user.click(screen.getByRole("button", { name: "Analyze confluence" }));

    expect(getSmartConfluenceMock).toHaveBeenCalledWith("EURUSD");
    expect(screen.getByText("Analyzing...")).toBeInTheDocument();

    await act(async () => {
      pendingResult.resolve(result);
      await Promise.resolve();
    });

    expect(screen.getByText("Yellow event risk")).toBeInTheDocument();
    expect(screen.getByText("Max score 3")).toBeInTheDocument();
    expect(screen.getByText("FVG")).toBeInTheDocument();
    expect(screen.getByText("H1, M15 confirming")).toBeInTheDocument();
  });

  it("shows a validation message when no symbol is entered", async () => {
    const user = userEvent.setup();

    render(<SmartScannerConfluenceCard symbols={[]} />);

    const input = screen.getByRole("textbox", { name: "Smart scanner symbol" });
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Analyze confluence" }));

    expect(getSmartConfluenceMock).not.toHaveBeenCalled();
    expect(screen.getByText("Enter a symbol like EURUSD to analyze confluence.")).toBeInTheDocument();
  });
})