# Send button · a DeepSeek Harness plugin

An **editable** one-click send button on the right of the composer. Click it and its text goes out as a normal
prompt. It defaults to `继续` ("continue").

![The 继续 button in the composer's bottom-right tool row](docs/images/composer.png)

It saves the "type 继续, press Enter" round trip — and the text is yours to choose.

---

## Usage

| Action | Result |
| --- | --- |
| Left-click the button | Sends its text as a normal prompt |
| Click the pencil ✎ on its right | Turns the pill into an input to edit that text |
| Enter / click away in the input | Save |
| Esc in the input | Discard the edit |

![Editing the text in place](docs/images/edit.png)

- The text is stored in browser `localStorage` (key `dsh-continue-button:text`); it survives reloads.
- The default follows the UI language: `继续` for Chinese, `Continue` for English. Once edited it is no longer
  re-seeded.
- 120 characters max; longer text is ellipsised in the button and kept whole in its `title`.

## How it actually sends

It uses the **official send path**, not a hand-rolled remote call:

```
click → inputActions.setDraft(buttonText) → inputActions.submit()
```

`inputActions` is the standard prop the composer slot exposes to plugins, and `submit()` copies the current draft
into the submission before handing it to the submit state machine. So behaviour matches pressing Send exactly:

- clicking while the agent is running **queues** the message;
- the message shows up in the conversation immediately (local echo), and failures are surfaced/restored by the host;
- the submission carries the button text, so the user's own draft is **put back into the composer** right after;
- the button is disabled while a send, adjudication, or command claim is in flight.

## Install

**From the plugin market**: DSH sidebar → **Plugins** → **Discover** → find "发送按钮" → install → enable.

**From a local directory** (development): Plugins → Add plugin → paste the absolute directory path → install →
enable. Then **refresh the page once** (the browser half is plain JS, no build step). After upgrading, restart DSH.

## Screenshot

![The whole window](docs/images/window.png)

## Compatibility

- Declares `engines.dsh: >=0.2.1-rc.2 <0.3.0`; tested on DSH **0.2.1-rc.3** desktop.
- Registered into `conversation.input.right` ("Compact controls before the composer submit action"), an
  **additive list slot** (`replaceRisk: none`): it only adds one cell left of Send and never replaces host UI.
  On builds without that slot the button simply does not appear.
- Depends only on the slot's standard props (`t` / `useInput` / `inputActions`), imports no Harness client package,
  and styles everything with theme tokens (`--dsw-alias-*`), so it follows light and dark themes.

## Layout

| File | Purpose |
| --- | --- |
| `client.js` | Browser half: button, editor, send (plain JS; React comes from the host module table) |
| `index.js` | Host half: an empty shell so the patch row resolves |
| `cordis.patch.yml` | Inserts one row into the profile |
| `locale/zh.json`, `locale/en.json` | Plugin-page title and description |
| `icon.svg` | Plugin icon |
| `docs/images/` | README screenshots (taken from the running app) |

## Known limits

- The text lives in the browser, not the profile: another browser or cleared site data falls back to the default.
- What goes out is the button text alone — it does not combine with the draft.
- Draft restoration is best effort; in the narrow window where the submit machine clears the draft
  asynchronously, the restored text can be replaced by the button text.
- The desktop shell swallows the web `contextmenu`, so the pencil is the only editing entry point.

## License

[MIT](LICENSE)

---

[中文](README.md)
