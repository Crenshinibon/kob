# i18n: Translation Content

## Message File Structure

Each locale file (`en.json`, `de.json`, etc.) contains flat key-value pairs with namespacing:

```json
{
  "nav.home": "Home",
  "nav.tournaments": "Tournaments",
  "tournament.status.draft": "Draft",
  "tournament.status.active": "Active"
}
```

## Translation Keys by Area

### Navigation & Layout

| Key | English | Notes |
|-----|---------|-------|
| `nav.home` | Home | |
| `nav.tournaments` | Tournaments | |
| `nav.login` | Log In | |
| `nav.signup` | Sign Up | |
| `nav.logout` | Log Out | |
| `nav.language` | Language | |
| `nav.privacy` | Privacy Policy | |

### Tournament Creation

| Key | English | Notes |
|-----|---------|-------|
| `create.title` | Create Tournament | |
| `create.name` | Tournament Name | |
| `create.name.placeholder` | e.g. Summer Beach Classic | |
| `create.format` | Format | |
| `create.format.random-seed` | Random Seed | |
| `create.format.preseed` | Preseed | |
| `create.player_count` | Number of Players | |
| `create.physical_courts` | Physical Courts | |
| `create.virtual_courts` | Virtual Courts | |
| `create.court_config` | Court Configuration | |
| `create.court_config.bottom_5p` | Bottom court: 5-player (1 leftover) | |
| `create.court_config.bottom_6p` | Bottom court: 6-player (2 leftovers) | |
| `create.court_config.bottom_3p` | Bottom court: 3-player (3 leftovers) | |
| `create.court_config.clean` | All courts: 4-player (no leftovers) | |
| `create.leftover.include` | Include all players (recommended) | |
| `create.leftover.exclude` | Exclude {count} players for clean courts | |
| `create.leftover.parallel` | Parallel Games (5p/6p) | |
| `create.rounds` | Number of Rounds | |
| `create.rounds.fixed` | {count} rounds (fixed) | |
| `create.scoring` | Scoring Mode | |
| `create.scoring.single-21` | Single Set to 21 | |
| `create.scoring.best-of-3` | Best of 3 to 15 | |
| `create.submit` | Create | |
| `create.duration_estimate` | Estimated Duration | |
| `create.duration.approx` | ~{hours}h {minutes}min | |

### Player Management

| Key | English | Notes |
|-----|---------|-------|
| `players.title` | Add Players | |
| `players.count` | {current}/{max} players | |
| `players.names` | Player Names | |
| `players.names.random_placeholder` | One name per line | |
| `players.names.preseed_placeholder` | Name followed by points | |
| `players.add` | Add Players | |
| `players.start` | Start Tournament | |
| `players.error.exact_count` | Need exactly {count} players. Currently have {current}. | |
| `players.error.remaining_slots` | Only {count} slots remaining. | |
| `players.error.duplicate` | All entered names are already in the tournament | |
| `players.error.preseed_points` | Preseed format requires points for all players | |
| `players.success.added` | Added {count} player(s). {total}/{max} total. | |

### Tournament View

| Key | English | Notes |
|-----|---------|-------|
| `tournament.round` | Round {current} of {total} | |
| `tournament.status.draft` | Draft | |
| `tournament.status.active` | Active | |
| `tournament.status.completed` | Completed | |
| `tournament.close_round` | Close Round | |
| `tournament.close_round.disabled` | All scores must be entered first | |
| `tournament.final_round` | Final Round | |
| `tournament.complete` | Complete Tournament | |
| `tournament.delete` | Delete Tournament | |
| `tournament.standings` | View Standings | |
| `tournament.court` | Court {number} | |
| `tournament.court.3p` | Court {number} (3 players) | |
| `tournament.court.5p` | Court {number} (5 players) | |
| `tournament.court.6p` | Court {number} (6 players) | |
| `tournament.court.waiting` | Waiting | |
| `tournament.court.active` | Playing | |
| `tournament.players` | Players | |
| `tournament.physical_court` | Physical Court {number} | |
| `tournament.shift` | Shift {current} of {total} | |

### Court / Score Entry

| Key | English | Notes |
|-----|---------|-------|
| `court.title` | Court {number} — Round {round} | |
| `court.match` | Match {number} | |
| `court.vs` | vs | |
| `court.score.team_a` | Score Team A | |
| `court.score.team_b` | Score Team B | |
| `court.save` | Save Score | |
| `court.saved` | Score saved | |
| `court.standings` | Court Standings | |
| `court.standings.rank` | Rank | |
| `court.standings.player` | Player | |
| `court.standings.points` | Points | |
| `court.standings.diff` | Diff | |
| `court.error.min_score` | Winner must have at least {min} points | |
| `court.error.win_by` | Winner must win by at least {margin} | |
| `court.error.no_tie` | Scores cannot be tied | |
| `court.qr_code` | QR Code | |

### Standings

| Key | English | Notes |
|-----|---------|-------|
| `standings.title` | Final Standings | |
| `standings.place` | Place | |
| `standings.player` | Player | |
| `standings.points` | Points | |
| `standings.diff` | Diff | |
| `standings.court_history` | Court History | |
| `standings.round` | R{number} | |
| `standings.podium.first` | 1st Place | |
| `standings.podium.second` | 2nd Place | |
| `standings.podium.third` | 3rd Place | |

### Game Rules Display

| Key | English | Notes |
|-----|---------|-------|
| `rules.scoring` | Scoring | |
| `rules.single_set` | Single Set | |
| `rules.best_of_3` | Best of 3 | |
| `rules.points_to_win` | Points to Win | |
| `rules.win_by` | Win by | |
| `rules.point_cap` | Point Cap | |
| `rules.matches_per_round` | Matches per Round | |
| `rules.court_size` | Court Size | |

### Duration Display

| Key | English | Notes |
|-----|---------|-------|
| `duration.title` | Tournament Duration | |
| `duration.setup` | Setup | |
| `duration.round` | Round {number} | |
| `duration.transition` | Transition | |
| `duration.buffer` | Buffer | |
| `duration.total` | Total | |
| `duration.hours` | h | |
| `duration.minutes` | min | |
| `duration.approx` | ~{value} | |

### Format Descriptions

| Key | English | Notes |
|-----|---------|-------|
| `format.random-seed.name` | Random Seed | |
| `format.random-seed.desc` | Players are randomly assigned. Redistribution by ladder (2 up, 2 down). | |
| `format.preseed.name` | Preseed | |
| `format.preseed.desc` | Players seeded by points. Recursive bracket splitting determines final placement. | |

### Status & Labels

| Key | English | Notes |
|-----|---------|-------|
| `status.draft` | Draft | |
| `status.active` | Active | |
| `status.completed` | Completed | |
| `label.yes` | Yes | |
| `label.no` | No | |
| `label.cancel` | Cancel | |
| `label.confirm` | Confirm | |
| `label.save` | Save | |
| `label.delete` | Delete | |
| `label.back` | Back | |
| `label.next` | Next | |
| `label.close` | Close | |

### Auth

| Key | English | Notes |
|-----|---------|-------|
| `auth.login.title` | Log In | |
| `auth.login.email` | Email | |
| `auth.login.password` | Password | |
| `auth.login.submit` | Log In | |
| `auth.login.no_account` | Don't have an account? | |
| `auth.login.signup_link` | Sign up | |
| `auth.signup.title` | Sign Up | |
| `auth.signup.name` | Name | |
| `auth.signup.submit` | Sign Up | |
| `auth.signup.has_account` | Already have an account? | |
| `auth.signup.login_link` | Log in | |
| `auth.error.invalid_credentials` | Invalid email or password | |
| `auth.error.email_taken` | Email already registered | |

### Errors

| Key | English | Notes |
|-----|---------|-------|
| `error.not_found` | Not Found | |
| `error.unauthorized` | Unauthorized | |
| `error.tournament_not_found` | Tournament not found | |
| `error.tournament_not_active` | Tournament is not active | |
| `error.invalid_format` | Invalid format type | |
| `error.invalid_player_count` | Player count must be between {min} and {max} | |
| `error.server_error` | Something went wrong | |

### Privacy Page

| Key | English | Notes |
|-----|---------|-------|
| `privacy.title` | Privacy Policy | |
| `privacy.content` | ... | Long text, translated separately |

## Pluralization

Some strings need plural forms:

```json
{
  "players.count_many": "{count} players",
  "players.count_one": "1 player",
  "courts.count_many": "{count} courts",
  "courts.count_one": "1 court",
  "rounds.count_many": "{count} rounds",
  "rounds.count_one": "1 round"
}
```

Paraglide supports pluralization via ICU message format:

```json
{
  "players.count": "{count, plural, one {1 player} other {{count} players}}"
}
```

## Interpolation

Messages with dynamic values use placeholders:

```json
{
  "tournament.round": "Round {current} of {total}",
  "players.error.exact_count": "Need exactly {count} players. Currently have {current}.",
  "create.duration.approx": "~{hours}h {minutes}min"
}
```

## What NOT to Translate

| Content | Reason |
|---------|--------|
| Tournament names | User-entered |
| Player names | User-entered |
| Scores | Numeric |
| Court tokens | System-generated URLs |
| Email addresses | User-entered |
| Technical terms | Keep consistent (e.g., "preseed" could stay English or be translated) |

### Translating Format Names

The format names `random-seed` and `preseed` are technical. Options:

1. **Keep English everywhere**: Simple, consistent
2. **Translate display names**: Better UX for non-English speakers
3. **Translate display, keep technical in DB**: Best of both

**Recommendation**: Option 3. Store `random-seed` / `preseed` in DB, display translated names in UI.

| Technical Name | English | German | French | Spanish |
|---------------|---------|--------|--------|---------|
| `random-seed` | Random Seed | Zufallsreihenfolge | Tirage au sort | Semilla aleatoria |
| `preseed` | Preseed | Vorgeordnet | Pré-semé | Pre-semilla |
