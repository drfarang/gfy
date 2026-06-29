import { expect, test } from "bun:test";
import { testRender } from "@opentui/react/test-utils";
import { act } from "react";
import { List } from "../src/ui/components/List";

function ListHarness() {
  const items = Array.from({ length: 20 }, (_, index) => `item-${index + 1}`);

  return (
    <box style={{ flexDirection: "column", flexGrow: 1 }}>
      <text>header</text>
      <List
        items={items}
        onEnter={() => {}}
        renderRow={(item) => <text>{item}</text>}
      />
      <text>footer</text>
    </box>
  );
}

test("List fills its allocated height and responds to terminal resizing", async () => {
  const setup = await testRender(<ListHarness />, { width: 30, height: 10 });

  try {
    await act(async () => {
      await setup.flush();
      await new Promise<void>((resolve) => process.nextTick(resolve));
    });
    await act(async () => setup.flush());
    let lines = setup.captureCharFrame().split("\n");

    expect(lines[7]).toContain("item-7");
    expect(lines[8]).toContain("1/20");
    expect(lines[9]).toContain("footer");

    await act(async () => {
      setup.resize(30, 12);
      await setup.flush();
      await new Promise<void>((resolve) => process.nextTick(resolve));
    });
    await act(async () => setup.flush());
    lines = setup.captureCharFrame().split("\n");

    expect(lines[9]).toContain("item-9");
    expect(lines[10]).toContain("1/20");
    expect(lines[11]).toContain("footer");
  } finally {
    act(() => setup.renderer.destroy());
  }
});
