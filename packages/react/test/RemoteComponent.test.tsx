import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { loadRemote } from "@fedkit/runtime";
import { RemoteComponent, lazyRemote, clearRemoteCache } from "../src/index.js";

vi.mock("@fedkit/runtime", () => ({
  loadRemote: vi.fn(),
}));

const mockLoad = loadRemote as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearRemoteCache();
  mockLoad.mockReset();
});
afterEach(() => cleanup());

describe("RemoteComponent", () => {
  it("shows the fallback, then renders the loaded remote and forwards props", async () => {
    const Widget = (props: { label: string }) => <div data-testid="widget">widget:{props.label}</div>;
    mockLoad.mockResolvedValue(Widget);

    render(
      <RemoteComponent name="checkout/Widget" fallback={<span data-testid="fb">loading</span>} label="hello" />,
    );

    // Fallback renders synchronously while the lazy import is pending.
    expect(screen.getByTestId("fb")).toBeTruthy();

    await waitFor(() => expect(screen.getByTestId("widget")).toBeTruthy());
    expect(screen.getByTestId("widget").textContent).toBe("widget:hello");
    expect(mockLoad).toHaveBeenCalledWith("checkout/Widget");
  });

  it("renders the error fallback and calls onError when the remote fails to load", async () => {
    mockLoad.mockRejectedValue(new Error("boom"));
    const onError = vi.fn();

    render(
      <RemoteComponent
        name="checkout/Broken"
        errorFallback={(e) => <div data-testid="err">err:{e.message}</div>}
        onError={onError}
      />,
    );

    await waitFor(() => expect(screen.getByTestId("err")).toBeTruthy());
    expect(screen.getByTestId("err").textContent).toBe("err:boom");
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0]![0]).toBeInstanceOf(Error);
  });

  it("accepts a static (non-function) error fallback", async () => {
    mockLoad.mockRejectedValue(new Error("nope"));
    render(<RemoteComponent name="checkout/Broken2" errorFallback={<div data-testid="err2">failed</div>} />);
    await waitFor(() => expect(screen.getByTestId("err2")).toBeTruthy());
  });
});

describe("lazyRemote", () => {
  it("returns the same cached component per specifier and clears on demand", () => {
    const a = lazyRemote("x/Y");
    const b = lazyRemote("x/Y");
    expect(a).toBe(b);
    clearRemoteCache("x/Y");
    expect(lazyRemote("x/Y")).not.toBe(a);
  });
});
