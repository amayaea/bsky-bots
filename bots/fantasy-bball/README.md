# fantasy-bball

BlueSky: https://bsky.app/profile/mlb-fantasy-bot.bsky.social

MLB bot: ranks **probable starting pitchers** for **tomorrow** (US/Eastern) using [SportsDataIO](https://sportsdata.io) game projections via the [`fantasydata-node-client`](https://www.npmjs.com/package/fantasydata-node-client) MLB v3 projections client (`PlayerGameProjectionStatsByDate`), and posts to Bluesky.

On **Sundays** (Eastern), it also posts **two-start pitchers** for the week **Monday–Sunday** immediately following that Sunday, with summed projections for both starts.

## Scheduling

This process runs **once per invocation** and exits. Run it daily via cron, Cloud Scheduler, or your host (e.g. `yarn workspace fantasy-bball start` or the Docker image). Align the schedule with **America/New_York** if you care about “Sunday” and “tomorrow” matching MLB’s day boundary.

## Environment variables

Define these in **`bots/fantasy-bball/.env`**, like the other bots. The entrypoint loads `../.env` from `dist/`, so it resolves correctly from `yarn workspace fantasy-bball start` or from this directory.

| Variable                     | Required | Description                                                                                                                         |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `BLUESKY_USERNAME`           | Yes      | Bluesky handle                                                                                                                      |
| `BLUESKY_PASSWORD`           | Yes      | App password                                                                                                                        |
| `SPORTSDATAIO_API_KEY`       | Yes      | Subscription key (sent as `Ocp-Apim-Subscription-Key` by the SDK against `api.sportsdata.io`)                                       |
| `SPORTSDATAIO_FANTASY_FIELD` | No       | One of `FantasyPointsDraftKings`, `FantasyPointsFanDuel`, `FantasyPoints`, `FantasyPointsYahoo`, `FantasyPointsPitching`            |
| `SPORTSDATAIO_PLAYER_MAP`    | No       | JSON map of MLB player id (number) → SportsData / SportsDataIO `PlayerID`, e.g. `{"669194":10007215}` when name/team matching fails |
| `NODE_ENV` / `TEST_BOT_*`    | No       | Same as other bots for dev login (`common` `BskyClient`)                                                                            |

## Two-start week definition

When the job runs on a **Sunday** in Eastern time, the bot loads probables for each day from the **next Monday** through the **following Sunday** (7 days). Pitchers with exactly **two** distinct games (`gamePk`) in that window are treated as two-starters; projection totals are the sum of the two single-game projection lookups.

## Development

From repo root:

```bash
yarn install
yarn build
yarn workspace fantasy-bball start
```

Ensure `common` is built so `paths` resolve to `../../common/dist`.
