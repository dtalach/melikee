/**
 * What a new account starts with: four empty lists (My wants, Birthday,
 * Christmas, Secret stash) and nothing else. Friends, the
 * Feed and notifications fill in from real activity; until then each screen
 * shows its empty state.
 *
 * `SAMPLE` names the prototype's demo content (Maya and her friends) that
 * earlier builds put on every new account, so `cleanSample` can take it off
 * accounts made before this change.
 */
import { brand, palette } from '@/theme/tokens';
import type { Profile, WishList } from './types';

/** Christmas list colour: a holly green that reads on the dark theme. */
const CHRISTMAS = '#4fd18b';

export function token() {
  return Math.random().toString(36).slice(2, 10);
}

export function startingLists(): WishList[] {
  return [
    { id: 'w', name: 'My wants', vis: 'friends', accent: brand.lime, linkToken: token(), linkSince: Date.now(), linkExpiry: 'always' },
    { id: 's16', name: 'Birthday', vis: 'invite', accent: brand.pink, isBirthday: true, linkToken: token(), linkSince: Date.now(), linkExpiry: 'date' },
    christmasList(),
    { id: 'sec', name: 'Secret stash', vis: 'me', accent: palette.vio, linkToken: token(), linkSince: Date.now(), linkExpiry: 'always' },
  ];
}

/** Christmas: a dated list (Dec 25) shared by link, like the birthday list. */
export function christmasList(): WishList {
  return { id: 'xmas', name: 'Christmas', vis: 'invite', accent: CHRISTMAS, date: { month: 'Dec', day: 25 }, linkToken: token(), linkSince: Date.now(), linkExpiry: 'date' };
}

export function startingProfile(): Profile {
  return {
    name: '',
    handle: '',
    birthday: { month: 'Oct', day: 14, year: 2010 },
    remindGifters: true,
    showCountdown: true,
    parent: null,
    email: '',
    birthdaySet: false,
  };
}

/** Ideas on the Feed: names only; tapping one looks up the real price. */
export const trending = [
  { rank: '#1', name: 'Sol de Janeiro mist', price: '$38', tone: 'pink' as const },
  { rank: '#2', name: 'LED strip lights', price: '$24', tone: 'vio' as const },
  { rank: '#3', name: 'Nike Field General', price: '$85', tone: 'lime' as const },
];

/** The demo content earlier builds seeded, by id (and item name, to be sure). */
export const SAMPLE = {
  items: { 1: 'On Cloudmonster 2', 2: 'LED strip lights', 3: 'Instax Mini 12', 4: 'Mini crossbody bag', 5: 'Airpods 4', 6: 'Journal + gel pens' } as Record<number, string>,
  friends: ['p1', 'p2', 'p3', 'p4'],
  friendLists: ['ava16'],
  feed: ['f2', 'f3', 'f4'],
  contacts: ['c1', 'c2', 'c3', 'c4', 'c5'],
  sent: ['i1'],
  request: 'r1',
  linkHolders: ['h1', 'h2', 'h3'],
  notifs: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6'],
};
