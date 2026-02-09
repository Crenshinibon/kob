# Overview

The purpose of this project is to provide a simple way to track a "King Of he Beach" beach volleyball tournament, hence the name "kob".

## Users 

"Authenticated Users" (Org) are allowed to create, edit and delete every tournament. We decide only between authenticated users and Anonymous Users (Player).

Anonymous Users (Player) can only enter and change game results, until the Authenticated Users (Org) freezes this result and editing by a player is no longer possible.

## Creating / Editing Tournaments

Only Org can create a tournament.

After clicking "New Tournament" the Org sees a simple form, where he can insert the following information:

- optionally overwrite the default generated name
- the number of courts, default 4 ... (and that should be fixed for now)
- number of rounds (default 3)
- first-round-random, the Org can select if the first round is seated completely randomized, in contract to manually or by league points. When first-round-random is set, special reseating rules (described below) are followed.

For now, this determines the number of players, because ideally we always have all players playing. So four players per court.

- the UI adapts a field to enter player names, at no time there can be more players than available seats, but the list doesn't have to be completely filled, either.
- The org can enter player names by hand or can paste a list of Players from the
pasteboard

- Editing is same as creating

## Starting tournaments

When the tournament started no editing is possible, anymore.

The org can copy a link from every court to hand it out to the players that will play there, ideally via a QR code pointing to the page of the court.


## Tracking Results per Round

The players use the QR code to land on their court. 

Every player teams up with every other player. So that per round 3 matches are played on every court.

After every match the players insert the results. And the current court standings update. 

The points each player wins in each game are accumulated to get a total. The player with the highest total of won points will be the winner of this court.

When all matches of a round are played the rounds are closed and the standings are finalized.

## Example Process (with 4 courts / 16 players)

### First Round

After the first round all winners go to one court, all second places go to one court and so on. This works best for four courts.

### Further Rounds (Usually 2 - 3)

In the next rounds we have a top court, with all the winners from the first round. And we have a bottom court, with all players placed fourth.

After finishing a subsequent round, the third and fourth of the top court go down to second court. From second court first and second go up to first court and the fourth goes down to third court.

On third court only first can go up to second court. Third and fourth go down to fourth court.

On fourth court the first and second go up to third court.

### End

After concluding the final round. The standings for the tournament are final, and we have a winner, second, third and so on.

## Closing Round / the Tournament

The Org closes rounds after he has received all results from all games on all courts. The system automatically calculates the new seats for the next round, based on the rules above.

After the last round is closed, the system calculates the final standing and the Org announces the placing.
