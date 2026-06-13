import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { RemoteFragment } from "../src/index.js";

const realFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = vi.fn();
});
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

function mockOnce(value: { ok?: boolean; status?: number; text: string }) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: value.ok ?? true,
    status: value.status ?? 200,
    text: async () => value.text,
  });
}

describe("RemoteFragment", () => {
  it("shows the fallback, then embeds the fetched fragment HTML", async () => {
    mockOnce({ text: '<section id="frag">FRAGMENT</section>' });
    render(<RemoteFragment src="https://remote.example/fragment" fallback={<span>loading…</span>} />);

    const host = screen.getByTestId("remote-fragment");
    expect(host.getAttribute("data-status")).toBe("loading");
    expect(host.textContent).toBe("loading…");

    await waitFor(() => expect(screen.getByTestId("remote-fragment").getAttribute("data-status")).toBe("ready"));
    expect(screen.getByTestId("remote-fragment").querySelector("#frag")?.textContent).toBe("FRAGMENT");
    expect(globalThis.fetch).toHaveBeenCalledWith("https://remote.example/fragment", undefined);
  });

  it("renders the error fallback on a failed fetch", async () => {
    mockOnce({ ok: false, status: 502, text: "" });
    render(
      <RemoteFragment
        src="https://down.example/fragment"
        errorFallback={(e) => <span data-testid="err">{e.message.includes("502") ? "502" : "err"}</span>}
      />,
    );
    await waitFor(() => expect(screen.getByTestId("remote-fragment").getAttribute("data-status")).toBe("error"));
    expect(screen.getByTestId("err").textContent).toBe("502");
  });

  it("honors the `as` tag", async () => {
    mockOnce({ text: "<p>x</p>" });
    render(<RemoteFragment src="https://r/f" as="section" />);
    await waitFor(() => expect(screen.getByTestId("remote-fragment").getAttribute("data-status")).toBe("ready"));
    expect(screen.getByTestId("remote-fragment").tagName).toBe("SECTION");
  });
});
