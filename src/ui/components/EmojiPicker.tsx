import { COMPOSER_EMOJIS } from "../emojis";

export function EmojiPicker({ focused, onSelect }: { focused: boolean; onSelect: (value: unknown) => void }) {
  return (
    <box title="Emoji  ·  ←/→ choose  ·  Enter insert  ·  Esc close" style={{ border: true, height: 3 }}>
      <tab-select
        options={COMPOSER_EMOJIS}
        tabWidth={4}
        showDescription={false}
        showUnderline={false}
        showScrollArrows={true}
        wrapSelection={true}
        focused={focused}
        onSelect={(_, option) => onSelect(option?.value)}
        style={{ flexGrow: 1, height: 1 }}
      />
    </box>
  );
}
