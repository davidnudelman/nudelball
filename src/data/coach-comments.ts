/**
 * coach-comments.ts — Funny coach quips displayed during match simulation.
 *
 * Comments are categorised by match state (winning, losing, drawing, etc.)
 * and shown at half-time and full-time to add personality and humour.
 */

/** Comments when the player's team is winning */
export const WINNING_COMMENTS: readonly string[] = [
  "Keep it tight lads, we've got them rattled!",
  "Beautiful stuff! Even my nan could see that was coming.",
  "If we keep this up, drinks are on me... just kidding, you're paying.",
  "That's more like it! Now don't do anything stupid.",
  "We're playing like a well-oiled machine... that occasionally catches fire.",
  "Tell the lads to keep their heads. And their shirts on.",
  "I'm not saying we're brilliant, but we're definitely not terrible!",
  "The board is watching. Try not to let them down... again.",
  "This is what I've been talking about in training! Well, some of it.",
  "We're winning? Someone pinch me. Actually, don't.",
  "Even the physio is smiling and he NEVER smiles.",
  "Quick, nobody change anything. Don't even breathe differently.",
  "My tactics are working? I should write these down.",
  "I told you lot you were good. Did anyone record me saying that?",
  "The fans are singing! Well, it's more like shouting, but still.",
  "Keep this up and I might actually sleep tonight.",
  "We trained for this. Well, some of us trained. You know who you are.",
  "Right, let's not get cocky. Remember what happened last time.",
] as const;

/** Comments when the player's team is losing */
export const LOSING_COMMENTS: readonly string[] = [
  "Right, who forgot to set their alarm this morning?",
  "I've seen better defending at a kid's birthday party.",
  "Don't panic! ...Okay, maybe panic a little.",
  "I want everyone to take a deep breath. Especially me.",
  "My grandma could have saved that. And she's been dead for years.",
  "If we were a ship, we'd be the Titanic. After the iceberg.",
  "I'm going to pretend that didn't happen. You should too.",
  "Let's remember: it's just a game. A game we're LOSING.",
  "I've seen more fight in a packet of crisps.",
  "The fans are leaving. Can't blame them, really.",
  "Someone check if we're actually on the right pitch.",
  "I need a holiday. Maybe I'll start looking during the second half.",
  "At least the kit looks nice. That's something.",
  "Play like you WANT the ball. Revolutionary concept, I know.",
  "I've had root canals more enjoyable than watching this.",
  "My dog could organise a better defence and he's afraid of squirrels.",
  "Come on lads, show some pride! Or at least pretend!",
  "This is fine. Everything is fine. Nothing is on fire.",
] as const;

/** Comments when the score is level */
export const DRAWING_COMMENTS: readonly string[] = [
  "All square. This is anyone's game. Even ours, surprisingly.",
  "We're level. Not great, not terrible. The Chernobyl of football.",
  "A draw is like kissing your sister. Let's not settle for that.",
  "It's tight out there. Like my trousers after the Christmas party.",
  "We need a spark. Someone do something unexpected! But not stupid.",
  "Deadlock. Right, who wants to be a hero?",
  "We're holding our own. That's... adequate.",
  "I've seen chess matches with more excitement. Push forward!",
  "Even Stevens. Let's tip the balance, shall we?",
  "We need more creativity! Pretend the goal is a buffet table!",
  "This is tighter than my first suit. Someone break the deadlock!",
  "We're neither winning nor losing. We're just... existing.",
  "One goal changes everything. Preferably ours, not theirs.",
  "Come on, show me something! Anything! Even a dodgy throw-in!",
  "It's like watching paint dry. Someone spice things up!",
] as const;

/** Comments when winning by 3+ goals */
export const THRASHING_COMMENTS: readonly string[] = [
  "I almost feel sorry for them. Almost.",
  "Is this real life? Someone check the scoreboard!",
  "At this rate we'll need a bigger scoreboard!",
  "Stop, stop, they're already dead! ...Actually, keep going.",
  "I'm going to frame the match report and hang it in my office.",
  "This is the kind of performance that makes legends.",
  "Even the ball boy is celebrating. Love the energy!",
  "My only complaint is we should be winning by MORE.",
  "I take back everything bad I ever said about you lot.",
  "This is better than my wedding day. Don't tell my wife.",
] as const;

/** Comments when losing by 3+ goals */
export const GETTING_THRASHED_COMMENTS: readonly string[] = [
  "I'd sub everyone if I could. Including myself.",
  "Anyone know the phone number for a good therapist?",
  "I'm updating my CV at half time.",
  "At least we can only go up from here. In theory.",
  "This is character building. That's what I'll tell the press.",
  "I've seen car crashes that were easier to watch.",
  "Forget the tactics board. We need a miracle board.",
  "On the bright side... no, there is no bright side.",
  "If this was a boxing match, they'd have stopped it by now.",
  "I'm not angry. I'm disappointed. Actually no, I'm angry.",
] as const;

/**
 * Pick a random coach comment based on the current match state.
 *
 * @param myGoals    - The player's team's goals
 * @param theirGoals - The opponent's goals
 * @returns A randomly selected comment string
 */
export function getCoachComment(myGoals: number, theirGoals: number): string {
  const diff = myGoals - theirGoals;
  let pool: readonly string[];

  if (diff >= 3) {
    pool = THRASHING_COMMENTS;
  } else if (diff > 0) {
    pool = WINNING_COMMENTS;
  } else if (diff <= -3) {
    pool = GETTING_THRASHED_COMMENTS;
  } else if (diff < 0) {
    pool = LOSING_COMMENTS;
  } else {
    pool = DRAWING_COMMENTS;
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
