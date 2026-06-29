# gfy

A terminal client for **gfy.com** (the "GFY Webmaster Board"), built with [OpenTUI](https://github.com/anomalyco/opentui) + React on Bun.

gfy.com runs **vBulletin 3.8.8** (no public API), so this app talks to it the way a browser does: it logs in, fetches pages over HTTP, and parses the HTML. Because vB 3.8 is frozen, the markup is stable and predictable.

## What it does

- Sign in with username/password, or by importing your browser session cookies
- Browse the forum list
- List threads in a forum (paginated)
- Read a thread (paginated, scrollable, with post bodies rendered to readable text)
- Reply to a thread (drag or paste an image to auto-upload it and insert the `[IMG]` tag)
- Start a new thread
- Open threads in multiple tabs
- Persists your session so you stay logged in between runs

## Requirements

- [Bun](https://bun.sh) (OpenTUI is Bun-only right now). Install with:
  ```sh
  curl -fsSL https://bun.sh/install | bash
  ```
- A real terminal (it's a full-screen TUI).

## Install & run

Requires [Bun](https://bun.sh) (OpenTUI is Bun-only). Run it without installing:

```sh
bunx @paleproton/gfy
```

Or install the `gfy` command globally:

```sh
bun install -g @paleproton/gfy
gfy
```

The platform-specific native bits (`@opentui/core-*`, `sharp`) resolve automatically for your OS/arch.

### From source (development)

```sh
bun install
bun start          # (bun run dev is the same; the full-screen TUI can't hot-reload)
```

After editing source, stop with `q` / `Ctrl+C` and re-run - `--watch`/hot-reload
isn't compatible with a TUI that takes over the terminal in raw mode.

## Signing in

Two ways, switchable on the login screen with **Ctrl+K**:

1. **Password** - type your GFY username and password. Note the password is shown as you type (no masking yet).
2. **Cookie import** - paste your logged-in browser cookies. This never handles your password and is the most reliable option if Cloudflare ever challenges an automated login.

   To get the cookies: open gfy.com in your browser while logged in, open DevTools -> **Application/Storage -> Cookies -> https://www.gfy.com**, and copy the values into one string:
   ```
   bbuserid=123456; bbpassword=abcdef0123456789...; bbsessionhash=...
   ```
   (`bbpassword` and `bbsessionhash` are HttpOnly, so they won't appear in `document.cookie` - read them from the DevTools cookie panel.)

## Keybindings

| Context        | Keys |
| -------------- | ---- |
| Lists          | `j`/`k` or arrows move · `J`/`K` jump 10 · `enter`/`→` open · `Shift+Enter`/`t` open in new tab · `←`/`esc`/`backspace` back · `g`/`G` top/bottom · `PgUp`/`PgDn` page |
| Tabs           | `Shift+Enter`/`t` open thread in new background tab · `1`..`9` switch tab · `Ctrl+W` close tab |
| Forums         | `enter` open · `,` settings · `r` refresh · `o` sign out · `q` quit |
| Settings       | `Tab`/`↑↓` move fields · `←`/`→` change theme · `Ctrl+S` save · `Esc` cancel |
| Thread list    | Shows two forum pages at once · `enter` open · `n`/`p` next/prev pair · `c` new thread · `r` refresh · `←` back |
| Thread view    | `↑`/`↓` scroll · `n`/`p` next/prev page · `r` reply · `q` back |
| Compose        | `Ctrl+S` send · `Ctrl+Q` select posts to quote · `Ctrl+E` emoji picker · `Esc` cancel · `Tab` switch subject/body (new thread) · drag an image in / `Ctrl+V` paste a clipboard image to upload it |
| Anywhere       | `Ctrl+T` cycle theme · `Ctrl+F` hide/show the footer · `Ctrl+C` quit |

## Config & data

Stored under `~/.config/gfytui/` (override the directory with `GFYTUI_DIR`):

- `session.json` - your saved session cookies (written with `0600` permissions; no password is stored).
- `config.json` - optional overrides: `baseUrl`, `userAgent`, `requestDelayMs`, `editor`, `theme`, and the image-upload target `uploadHost` / `uploadDir` / `uploadBaseUrl` (an scp host, its directory, and the public URL that serves it; `uploadHost: ""` disables upload). Images are uploaded over `scp`, so the host must be reachable with SSH key or agent authentication; upload passwords are not stored.

The app opens forum 26 by default, with the full forum list available by going back. The theme and image-upload target can be changed in-app: press `,` on the forum list to open **Settings**, edit the fields, and `Ctrl+S` to save (written back to `config.json`). Theme changes preview immediately. Upload is disabled by default - set the upload fields there to enable it.

Requests are throttled (default 800ms apart) to stay polite to the server.

## How it works

```
src/
  vb/              vBulletin client (pure, no UI - independently testable)
    http.ts        fetch wrapper: browser-like headers, cookie jar, latin1 decode,
                   manual redirect following (vB sets auth cookies on a 302),
                   Cloudflare-challenge detection
    cookies.ts     minimal cookie jar
    parse.ts       cheerio parsers: forums, thread lists, posts, pagination, post tokens
    auth.ts        login / cookie-import / verify
    client.ts      high-level API: forums(), threads(), thread(), reply(), newThread()
  ui/              OpenTUI React UI
    App.tsx        screen-stack router + session bootstrap + global quit
    screens/       Login, ForumList, ThreadList, ThreadView, Compose
    components/    List (keyboard-driven, windowed), header/status/loading/error
  config.ts        config + session persistence
```

## Caveats

- **Terms of service.** Automated access may be discouraged by the forum. This is a personal client for your own account; it throttles requests and sends a normal User-Agent. Use it responsibly.
- **Cloudflare.** The site is behind Cloudflare. GETs and the login POST currently pass through with a normal User-Agent. If that ever changes, use the cookie-import login.
- **Scraping is markup-coupled.** Parsers target vB 3.8.8's templates. They're defensive, but a forum-side template change could require selector tweaks (`src/vb/parse.ts`).
- **Password masking** isn't implemented on the login screen yet - prefer cookie import if that matters to you.

## Development

Throwaway harnesses that hit the live site live in `scripts/`:

```sh
# Exercise the vBulletin layer and save HTML fixtures to ./scratch (or $GFYTUI_FIXTURES)
bun run probe http
bun run probe parse
bun run probe client                     # browse as guest
GFY_USER=.. GFY_PASS=.. bun run probe client
GFY_COOKIES="bbuserid=..; bbpassword=.." bun run probe client
bun run probe tokens <threadId>          # dry-run: scrape reply-form tokens, no post

# Render a single screen for a few seconds (uses real guest data), then exit
bun run smoke forums      # or: login | threads | thread | compose

bun run typecheck
bun test                                 # parser/bbcode unit tests (test/)
```

### Releasing

Typecheck + tests run on every push/PR (`.github/workflows/ci.yml`). Pushing a
version tag publishes to npm (`.github/workflows/publish.yml`):

```sh
npm version patch          # 0.1.0 -> 0.1.1: edits package.json, makes tag v0.1.1
git push --follow-tags     # pushes the commit + tag, which triggers the publish
```

The publish workflow needs a repo secret `NPM_TOKEN` (a granular npm automation
token with publish access and 2FA bypass). It re-runs typecheck/tests, checks the
tag matches `package.json`, then `npm publish`es.

## License

[MIT](LICENSE) © paleproton
