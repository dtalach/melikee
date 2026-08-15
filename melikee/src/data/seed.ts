/**
 * Fake data, carried over verbatim from the prototype so the built app tells
 * the same story the design review signed off on. Everything here is display
 * fixture — it is the only place mock content lives, so swapping in a real API
 * later is a matter of replacing the seed, not touching the screens.
 */
import type {
  DirectoryPerson,
  FeedPost,
  Friend,
  FriendListItem,
  SentInvite,
  Shiny,
  TrendingItem,
  WishList,
} from '@/store/types';

/** The signed-in user. */
export const me = {
  name: 'Maya',
  handle: '@mayalikes',
  initial: 'M',
  /** The public page non-users open — the viral hook. */
  slug: 'maya',
  link: 'melikee.app/maya',
  birthday: 'Oct 14',
  daysToBirthday: 71,
  /** Taste tags inferred from your shinies (turn 10a). */
  tasteTags: ['SNEAKERHEAD', 'AUDIO NERD', 'COZY CORE'],
  /** Counters the app flatters you with. Shinies is computed from real state. */
  reactionsReceived: 23,
  dibsCalled: 3,
  mostLovedShiny: { name: 'On Cloudmonster 2', fires: 9 },
} as const;

export const seedLists: WishList[] = [
  { id: 'w', name: 'My wants', visibility: 'friends', accent: '#c8f542', starter: true },
  { id: 's16', name: 'Sweet 16', visibility: 'invite', accent: '#ff5da2', countdown: '71 days' },
  { id: 'sec', name: 'Secret stash', visibility: 'me', accent: '#a78bfa', starter: true },
];

/** What a brand-new account starts with, before the first capture. */
export const starterLists: WishList[] = [
  { id: 'w', name: 'My wants', visibility: 'friends', accent: '#c8f542', starter: true },
  {
    id: 'bday',
    name: 'Birthday',
    visibility: 'invite',
    accent: '#ff5da2',
    needsDate: true,
    countdown: 'set the date',
  },
  { id: 'sec', name: 'Secret stash', visibility: 'me', accent: '#a78bfa', starter: true },
];

export const seedItems: Shiny[] = [
  {
    id: '1',
    listId: 'w',
    name: 'On Cloudmonster 2',
    price: '$180',
    store: 'REI',
    upc: '194671203984',
    provenance: 'by camera · Sat',
    secret: false,
  },
  {
    id: '2',
    listId: 'w',
    name: 'LED strip lights',
    price: '$24',
    store: 'Amazon',
    upc: '840268919287',
    provenance: 'from trending · Jul 26',
    secret: false,
  },
  {
    id: '3',
    listId: 'w',
    name: 'Instax Mini 12',
    price: '$79',
    store: 'Target',
    upc: '074101204209',
    provenance: 'by scan · Jul 20',
    secret: false,
  },
  {
    id: '4',
    listId: 's16',
    name: 'Mini crossbody bag',
    price: '$58',
    store: 'Urban Outfitters',
    upc: '191267439204',
    provenance: 'from the Feed · Jul 18',
    secret: false,
  },
  {
    id: '5',
    listId: 's16',
    name: 'Airpods 4',
    price: '$129',
    store: 'Apple',
    upc: '195949052026',
    provenance: 'by voice · Jul 12',
    secret: false,
  },
  {
    id: '6',
    listId: 'sec',
    name: 'Journal + gel pens',
    price: '$22',
    store: 'Muji',
    upc: '458934720117',
    provenance: 'by camera · Jul 8',
    secret: true,
  },
];

export const seedFriends: Friend[] = [
  {
    id: 'p1',
    name: 'Ava',
    initial: 'A',
    birthday: 'Aug 17',
    daysAway: 12,
    access: { w: true, s16: true },
  },
  { id: 'p2', name: 'Jordan', initial: 'J', birthday: 'Nov 3', access: { w: true, s16: false } },
  { id: 'p3', name: 'Sam', initial: 'S', birthday: 'Jan 22', access: { w: true, s16: true } },
  { id: 'p4', name: 'Mia', initial: 'M', birthday: 'Mar 9', access: { w: true, s16: false } },
];

export const seedSentInvites: SentInvite[] = [
  { id: 'i1', name: 'Zoe P.', initial: 'Z', when: '2 days ago' },
];

export const seedDirectory: DirectoryPerson[] = [
  {
    id: 'c1',
    name: 'Zoe P.',
    handle: '@zoepp',
    initial: 'Z',
    context: 'Westfield High',
    mutual: 8,
    followsYou: true,
    requested: false,
  },
  {
    id: 'c2',
    name: 'Marcus T.',
    handle: '@marct',
    initial: 'M',
    context: 'Westfield High',
    mutual: 3,
    followsYou: false,
    requested: false,
  },
  {
    id: 'c3',
    name: 'Lena K.',
    handle: '@lenak',
    initial: 'L',
    context: 'from your contacts',
    mutual: 0,
    followsYou: false,
    requested: false,
  },
  {
    id: 'c4',
    name: 'Priya S.',
    handle: '@priyahearts',
    initial: 'P',
    context: 'Northside Prep',
    mutual: 2,
    followsYou: true,
    requested: false,
    searchOnly: true,
  },
  {
    id: 'c5',
    name: 'Dee Alvarez',
    handle: '@deedee',
    initial: 'D',
    context: 'Westfield High',
    mutual: 0,
    followsYou: true,
    requested: false,
    searchOnly: true,
  },
];

export const seedFeed: FeedPost[] = [
  {
    id: 'f1',
    who: 'Ava',
    initial: 'A',
    listName: 'Sweet 16',
    productName: 'Mini crossbody bag',
    productPrice: '$58',
    when: '2h',
    fires: 12,
    hearts: 4,
    myFire: false,
    myHeart: false,
    wanted: false,
  },
  {
    id: 'f2',
    who: 'Jordan',
    initial: 'J',
    listName: 'Skate stuff',
    productName: 'Santa Cruz deck',
    productPrice: '$75',
    when: '5h',
    fires: 8,
    hearts: 2,
    myFire: false,
    myHeart: false,
    wanted: false,
  },
];

export const trending: TrendingItem[] = [
  { rank: '#1', name: 'Sol de Janeiro mist', price: '$38', tone: 'pink' },
  { rank: '#2', name: 'LED strip lights', price: '$24', tone: 'violet' },
  { rank: '#3', name: 'Nike Field General', price: '$85', tone: 'lime' },
];

/** The friend list you can open from the Feed's birthday nudge. */
export const avaList = {
  friendId: 'p1',
  owner: 'Ava',
  initial: 'A',
  listName: "Ava's Sweet 16",
  daysAway: 12,
  items: [
    { id: 'a1', name: 'Mini crossbody bag', price: '$58' },
    { id: 'a2', name: 'Kindle Paperwhite', price: '$149' },
    { id: 'a3', name: 'Glossier You set', price: '$45' },
    { id: 'a4', name: 'Fujifilm film 3-pack', price: '$27' },
    { id: 'a5', name: 'Claw clips (big)', price: '$12' },
    { id: 'a6', name: 'Concert fund chip-in', price: 'any $' },
  ] as FriendListItem[],
};

/** The digest that used to be a welcome-back interstitial, now living in Feed. */
export const digest = {
  priceDrop: { product: 'Sony XM6', from: '$399', to: '$349', store: 'Best Buy', delta: '−$50' },
  reaction: { who: 'Ava', product: 'Cloudmonsters', emoji: '🔥' },
  request: { name: 'Riley', initial: 'R', mutual: 4 },
} as const;

/** The note the "✨ Write one for me" helper fills in. */
export const suggestedShareNote =
  "Hello all, I'm turning 16! Your company is all I ask — but if you need ideas, here they are ✨";
