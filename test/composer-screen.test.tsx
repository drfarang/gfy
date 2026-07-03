import { expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import type { VbClient } from "../src/vb/client";
import { ComposeScreen } from "../src/ui/screens/ComposeScreen";

const client = {
  thread: async () => ({ items: [], page: 1, totalPages: 1 }),
  reply: async () => ({ ok: true }),
  newThread: async () => ({ ok: true }),
} as unknown as VbClient;

async function settle(setup: Awaited<ReturnType<typeof testRender>>) {
  await act(async () => {
    await setup.flush();
    await new Promise<void>((resolve) => process.nextTick(resolve));
  });
  await act(async () => setup.flush());
}

test("ComposeScreen switches between extracted quote and emoji pickers", async () => {
  const setup = await testRender(
    <ComposeScreen
      client={client}
      mode="reply"
      threadId={42}
      title="Refactor thread"
      quoteContext={{
        posts: [{ id: 7, index: 1, author: "Alice", body: "A useful post" }],
        page: 1,
        totalPages: 1,
      }}
      onDone={() => {}}
      onCancel={() => {}}
    />,
    { width: 100, height: 24, kittyKeyboard: true },
  );

  try {
    await settle(setup);
    expect(setup.captureCharFrame()).toContain("Reply to: Refactor thread");

    act(() => {
      setup.mockInput.pressKey("q", { ctrl: true });
    });
    await settle(setup);
    expect(setup.captureCharFrame()).toContain("Quote posts");
    expect(setup.captureCharFrame()).toContain("Alice");

    act(() => {
      setup.mockInput.pressEscape();
    });
    await settle(setup);
    act(() => {
      setup.mockInput.pressKey("e", { ctrl: true });
    });
    await settle(setup);
    expect(setup.captureCharFrame()).toContain("Emoji");
  } finally {
    act(() => setup.renderer.destroy());
  }
});
