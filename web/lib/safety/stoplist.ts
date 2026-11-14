/**
 * Word lists of the safety layer (docs/SPEC.md 8.6, levels 1 and 4). Shared by the browser and the server.
 *
 * Level 1 (before the LLM): `UNSAFE` and `SENSITIVE` patterns. A match in UNSAFE sets the category at once
 * and nothing is sent to the model. A match in SENSITIVE fixes the category to `sensitive`; the model may
 * only draft the parent's answer and cannot lower the category. `REDIRECT` patterns (attempts to change the
 * rules, requests for scary content) give a kind off-topic line without a model call.
 *
 * Level 4 (after the LLM): `STOP_PHRASES` and `OUTPUT_PATTERNS` in model output replace the text with the
 * fallback.
 *
 * Patterns are matched against normalised text (see `normalise`): lower case, straight apostrophes,
 * single spaces. They are deliberately conservative: a false "sensitive" only sends the question through
 * Parent check, a missed "unsafe" is the failure we cannot accept.
 */
import type { Topic } from '../engine/types';

export function normalise(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’ʼ`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface SafetyRule {
  id: string;
  pattern: RegExp;
  /** Topic recorded for the question (sensitive) or for the log (unsafe). */
  topic: Topic;
  /**
   * The match does not count when one of these words opens the clause right before it,
   * e.g. "I'll bite the dentist IF he hurts me" or "WHAT IF someone touches me".
   */
  notAfter?: RegExp;
}

const CONDITIONAL = /\b(if|when|what if|will|would|could|might|does|do|can|should|in case)\b[^.,!?;]*$/;

const PERSON =
  "(?:someone|somebody|a man|a woman|a lady|a stranger|a grown-?up|an adult|a kid|kids|people|they|he|she|" +
  "my (?:mom|mommy|mum|dad|daddy|papa|brother|sister|uncle|aunt|auntie|cousin|grandpa|grandma|teacher|babysitter|nanny|coach|stepdad|stepmom|friend)|" +
  "(?:mom|mommy|dad|daddy|papa|uncle|auntie|grandpa|grandma)|the (?:babysitter|nanny|coach|teacher|neighbou?r))";

/** Level 1, category `unsafe`: harm, abuse, self-harm, violence. */
export const UNSAFE: SafetyRule[] = [
  // self-harm
  { id: 'self_harm', pattern: /\b(hurt|kill|cut|harm|hit|punch|bite|scratch)(ing)? (myself|my ?self)\b/, topic: 'safety' },
  { id: 'want_to_die', pattern: /\b(want|wanna|wish|would like|like) (to )?(die|be dead|kill me)\b/, topic: 'safety' },
  { id: 'wish_dead', pattern: /\b(wish|want) (i|that i) (was|were|am) (dead|not alive|never born)\b/, topic: 'safety' },
  { id: 'suicide', pattern: /\b(suicide|suicidal|end my life|not be alive anymore|better off dead)\b/, topic: 'safety' },
  // abuse and violence done to the child
  {
    id: 'person_hurts_me',
    pattern: new RegExp(
      `\\b${PERSON}(?: at home| at school| at night)?(?: always| keeps| sometimes| often| still| really)? ` +
        '(hurts|hurt|hit|hits|hitting|beats|beat|kicks|kicked|punches|punched|slaps|slapped|chokes|choked|' +
        'burns|burned|touches|touched|bites|bit|pinches|pinched|grabs|grabbed|shakes|shook) me\\b',
    ),
    topic: 'safety',
    notAfter: CONDITIONAL,
  },
  {
    id: 'touched_private',
    pattern: /\b(touch(es|ed)?|touching|look(s|ed)? at|show(s|ed)? me) (my|his|her|their) (private|privates|private parts?|pee-?pee|penis|vagina|vulva|bum|butt|bottom|willy)\b/,
    topic: 'safety',
    notAfter: CONDITIONAL,
  },
  { id: 'secret_touch', pattern: /\b(said|says|told me|tells me) (not to tell|don'?t tell|to keep (it|a) secret|it'?s (a|our) secret)\b/, topic: 'safety' },
  { id: 'bad_touch', pattern: /\b(bad|secret|private) touch(es|ing)?\b/, topic: 'safety' },
  { id: 'abuse', pattern: /\b(abuse[sd]?|abusing|molest\w*|rape[sd]?|raping)\b/, topic: 'safety' },
  { id: 'unsafe_home', pattern: /\b(scared|afraid) (of|to go) (home|my (mom|dad|mommy|daddy|stepdad|stepmom|uncle))\b/, topic: 'safety' },
  // weapons and violence
  { id: 'weapons', pattern: /\b(guns?|knife|knives|stab\w*|shoot(ing|s)?|shot (him|her|them|me)|murder\w*|strangle\w*)\b/, topic: 'safety' },
  {
    id: 'kill',
    pattern: /\b(kill|killing|killed|kills) (you|me|him|her|them|everyone|everybody|people|somebody|someone|my \w+|the (dentist|doctor|nurse|teacher|baby|pilot|barber|man|lady))\b/,
    topic: 'safety',
  },
];

/** Level 1, category `sensitive`: death, illness, divorce, body, babies, religion (and guilt, being replaced). */
export const SENSITIVE: SafetyRule[] = [
  { id: 'death', pattern: /\b(die|dies|died|dying|dead|death|funeral|grave|passed away|pass away)\b/, topic: 'other' },
  { id: 'illness', pattern: /\b(hospital|cancer|surgery|operation|disease|ambulance|very sick|so sick|really sick)\b/, topic: 'safety' },
  { id: 'divorce', pattern: /\b(divorce[ds]?|break(ing)? up|split(ting)? up|separated)\b/, topic: 'love' },
  {
    id: 'parents_fighting',
    pattern: /\b(you|mom|mommy|dad|daddy|parents|papa|they) (and (dad|daddy|mom|mommy|papa|you) )?(are |were |keep |always )?(fight|fighting|fought|yell|yelling|shout|shouting|argue|arguing)\b/,
    topic: 'love',
  },
  { id: 'private_parts', pattern: /\b(private parts?|privates|penis|vagina|vulva|nipples?|naked|pee-?pee|willy|sex|sexy)\b/, topic: 'body' },
  { id: 'body_different', pattern: /\b(my|his|her) body\b.*\b(different|weird|wrong|strange)\b/, topic: 'body' },
  { id: 'touch_me', pattern: /\b(touch|touches|touching) me\b/, topic: 'body' },
  { id: 'babies', pattern: /\b(bab(y|ies) (come|comes|came) from|how (is|are|was|were) (a )?bab(y|ies) (made|born)|pregnant|how did the baby get)\b/, topic: 'body' },
  { id: 'religion', pattern: /\b(god|jesus|allah|pray(ing|er|ers)?|church|mosque|synagogue|temple|bible|quran|torah|angels?|heaven|hell|devil|satan)\b/, topic: 'other' },
  { id: 'guilt', pattern: /\b(did i do something (bad|wrong)|is it my fault|am i (bad|naughty|in trouble)|because i('m| am| was) (bad|naughty)|my fault)\b/, topic: 'love' },
  { id: 'replaced', pattern: /\b(take|takes|replace|replaces) my place\b|\blove (the )?(new )?baby more\b|\bnot love me (any ?more|anymore)\b/, topic: 'love' },
];

/** Level 1, off-topic redirect without a model call: attempts to change the rules, scary content. */
export const REDIRECT: SafetyRule[] = [
  { id: 'ignore_rules', pattern: /\b(ignore|forget|break|disobey) (all |your |the |previous |these |my )*(rules?|instructions?|prompts?|orders)\b/, topic: 'other' },
  { id: 'system_prompt', pattern: /\b(system prompt|your (instructions|prompt|rules)|developer mode|jailbreak|act as an? (ai|assistant|chatbot))\b/, topic: 'other' },
  { id: 'not_character', pattern: /\byou('re| are) not (a |an )?(real )?(bunny|rabbit|bear|fox|kitten|cat|character)\b/, topic: 'other' },
  { id: 'scary_story', pattern: /\b(scary|creepy|horror|spooky) (story|stories|tale)\b|\b(story|stories) (with|about) (a )?(monsters?|ghosts?|zombies?|vampires?|blood)\b/, topic: 'other' },
];

/**
 * Level 4: phrases the model must never write to a child (8.6). Matched on normalised output.
 * Kept as plain substrings so the list is easy to read and extend.
 */
export const STOP_PHRASES: string[] = [
  "won't hurt at all",
  'will not hurt',
  "won't hurt",
  "doesn't hurt at all",
  "it doesn't hurt",
  'does not hurt',
  'no pain at all',
  "won't feel anything",
  'will not feel anything',
  'nothing bad will happen',
  'nothing bad can happen',
  'nothing will go wrong',
  'i promise',
  'promise you',
  'our secret',
  'our little secret',
  'just between us',
  'between you and me',
  "don't tell",
  'do not tell',
  "don't need to tell",
  'keep it a secret',
  'keep this a secret',
  "i'm real",
  'i am real',
  "i'm a real",
  'i am a real',
  "i'm alive",
  'i am alive',
  "i'm not a story",
  'i am a person',
  "i'm a person",
  'system prompt',
  'as an ai',
  'language model',
];

/** Level 4 patterns: dosages, links, contact details. */
export const OUTPUT_PATTERNS: { id: string; pattern: RegExp }[] = [
  { id: 'dosage', pattern: /\b\d+([.,]\d+)?\s*(mg|ml|mcg|cc|milligrams?|millilit(er|re)s?|pills?|tablets?|drops?|teaspoons?|tsp|capsules?|doses?)\b/i },
  { id: 'medicine_advice', pattern: /\b(take|give (him|her|them|you)|swallow) (some |a |an )?(medicine|pill|tablet|ibuprofen|tylenol|advil|motrin|acetaminophen|paracetamol|aspirin|benadryl|melatonin)\b/i },
  { id: 'url', pattern: /\b(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(com|org|net|io|ai|app|gov|edu)\b/i },
  { id: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/ },
  { id: 'phone', pattern: /(\+?\d[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/ },
];

/**
 * Honorifics that turn the next capitalised word into a name ("Dr. Molly", "Miss Ann").
 * The model is told to invent no names; family words are allowed (8.6 level 4).
 */
export const HONORIFICS = ['mr', 'mrs', 'ms', 'miss', 'dr', 'doctor', 'nurse', 'teacher', 'captain', 'aunt', 'auntie', 'uncle', 'coach', 'officer', 'pilot'];

/**
 * Common US first names (SSA lists of popular names, public data). A capitalised one in the middle of a
 * sentence is treated as an invented or leaked name. Not exhaustive by design: it catches the usual
 * suspects of model writing without flagging ordinary capitalised words.
 */
export const COMMON_FIRST_NAMES = new Set(
  (
    'liam noah oliver james elijah william henry lucas benjamin theodore mateo levi sebastian daniel jack michael ' +
    'alexander owen asher samuel ethan leo jackson mason ezra john hudson luca aiden joseph david jacob logan luke ' +
    'julian gabriel grayson wyatt matthew maverick dylan isaac elias anthony thomas jayden carter santiago ezekiel ' +
    'charles josiah caleb cooper lincoln christopher nathan isaiah kai joshua andrew adrian cameron nolan ' +
    'waylon jaxon roman eli wesley aaron ian christian ryan leonardo axel jonathan easton everett weston ' +
    'max sam tom tim ben bob bobby billy jim jimmy joe johnny mike tony peter paul george harry charlie frank ' +
    'olivia emma charlotte amelia sophia mia isabella ava evelyn luna harper sofia camila eleanor elizabeth violet ' +
    'scarlett emily hazel lily gianna aurora penelope aria nora chloe ellie mila avery layla abigail ella isla eliana ' +
    'nova madison zoe ivy lucy willow emilia riley naomi victoria stella elena hannah valentina maya zoey delilah ' +
    'leah lainey lillian paisley madelyn sadie sophie leilani addison natalie josephine alice ruby claire kinsley ' +
    'everly emery adeline kennedy maeve audrey athena anna eliza vivian aaliyah quinn sarah sara molly ' +
    'mary jane kate katie annie amy rosie daisy poppy ann susan linda karen lisa nancy betty sally jenny jessica ' +
    'ashley megan rachel laura julia'
  ).split(' '),
);

export interface RuleHit {
  id: string;
  topic: Topic;
}

function firstHit(rules: SafetyRule[], text: string): RuleHit | null {
  for (const rule of rules) {
    const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (rule.notAfter) {
        // Look back to the start of the clause only.
        const before = text.slice(Math.max(0, m.index - 40), m.index);
        if (rule.notAfter.test(before)) {
          if (m[0].length === 0) re.lastIndex++;
          continue;
        }
      }
      return { id: rule.id, topic: rule.topic };
    }
  }
  return null;
}

export function matchUnsafe(normalised: string): RuleHit | null {
  return firstHit(UNSAFE, normalised);
}

export function matchSensitive(normalised: string): RuleHit | null {
  return firstHit(SENSITIVE, normalised);
}

export function matchRedirect(normalised: string): RuleHit | null {
  return firstHit(REDIRECT, normalised);
}
