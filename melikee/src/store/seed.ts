/**
 * Sample content. There is no backend yet, so a new account is filled with the
 * prototype's cast — Maya and her friends — so every surface has something to
 * show. Friends' birthdays are placed relative to today so the countdowns stay
 * meaningful (the prototype pinned them to a fixed "today").
 */
import { inDays } from '@/lib/dates';
import { brand, palette } from '@/theme/tokens';
import type {
  Contact,
  FeedEntry,
  Friend,
  FriendList,
  FriendRequest,
  Item,
  LinkHolder,
  Notif,
  Profile,
  SentInvite,
  WishList,
} from './types';

const H = 3_600_000;
const D = 24 * H;

export function token() {
  return Math.random().toString(36).slice(2, 10);
}

export function seedLists(): WishList[] {
  return [
    { id: 'w', name: 'My wants', vis: 'friends', accent: brand.lime, linkToken: token(), linkExpiry: 'always' },
    { id: 's16', name: 'Sweet 16', vis: 'invite', accent: brand.pink, isBirthday: true, linkToken: token(), linkExpiry: 'date' },
    { id: 'sec', name: 'Secret stash', vis: 'me', accent: palette.vio, linkToken: token(), linkExpiry: 'always' },
  ];
}

export function seedItems(now = Date.now()): Item[] {
  return [
    { id: 1, list: 'w', name: 'On Cloudmonster 2', price: '$180', store: 'REI', upc: '194671203984', added: 'by camera · Sat', createdAt: now - 3 * D, alert: true },
    { id: 2, list: 'w', drop: '$3', name: 'LED strip lights', price: '$24', store: 'Amazon', upc: '840268919287', added: 'from trending · Jul 26', createdAt: now - 10 * D, alert: true },
    { id: 3, list: 'w', name: 'Instax Mini 12', price: '$79', store: 'Target', upc: '074101204209', added: 'scanned · Jul 20', createdAt: now - 16 * D, alert: true },
    { id: 4, list: 's16', name: 'Mini crossbody bag', price: '$58', store: 'Urban Outfitters', upc: '191267439204', added: 'from Feed · Jul 18', createdAt: now - 18 * D, alert: true },
    { id: 5, list: 's16', name: 'Airpods 4', price: '$129', store: 'Apple', upc: '195949052026', added: 'dictated · Jul 12', createdAt: now - 24 * D, alert: true },
    { id: 6, list: 'sec', name: 'Journal + gel pens', price: '$22', store: 'Muji', upc: '458934720117', added: 'by camera · Jul 8', createdAt: now - 28 * D, alert: true },
  ];
}

export function seedFriends(): Friend[] {
  return [
    { id: 'p1', name: 'Ava', initial: 'A', birthday: inDays(12), access: { w: true, s16: true } },
    { id: 'p2', name: 'Jordan', initial: 'J', birthday: inDays(90), access: { w: true, s16: false } },
    { id: 'p3', name: 'Sam', initial: 'S', birthday: inDays(170), access: { w: true, s16: true } },
    { id: 'p4', name: 'Mia', initial: 'M', birthday: inDays(216), access: { w: true, s16: false } },
  ];
}

export function seedFriendLists(): FriendList[] {
  return [
    {
      id: 'ava16',
      friendId: 'p1',
      name: "Ava's Sweet 16",
      items: [
        { id: 'a1', name: 'Mini crossbody bag', price: '$58', store: 'Urban Outfitters', star: true },
        { id: 'a2', name: 'Kindle Paperwhite', price: '$149', store: 'Amazon', taken: true },
        { id: 'a3', name: 'Glossier You set', price: '$45', store: 'Sephora', star: true, drop: '$6' },
        { id: 'a4', name: 'Fujifilm film 3-pack', price: '$27', store: 'Target' },
        { id: 'a5', name: 'Claw clips (big)', price: '$12', store: 'Amazon' },
        { id: 'a6', name: 'Concert fund chip-in', price: 'any $', store: 'pooled', chipIn: true },
      ],
    },
  ];
}

export function seedFeed(now = Date.now()): FeedEntry[] {
  return [
    { id: 'f2', friendId: 'p2', list: 'Skate stuff', name: 'Santa Cruz deck', price: '$75', store: 'Zumiez', at: now - 5 * H, hearts: 8, myHeart: false, wanted: false },
    { id: 'f3', friendId: 'p3', list: 'Photo stuff', name: 'Fujifilm film 3-pack', price: '$27', store: 'Target', at: now - 1 * D, hearts: 3, myHeart: false, wanted: false },
    { id: 'f4', friendId: 'p4', list: 'My wants', name: 'Big claw clips', price: '$12', store: 'Amazon', at: now - 2 * D, hearts: 5, myHeart: false, wanted: false },
  ];
}

export const trending = [
  { rank: '#1', name: 'Sol de Janeiro mist', price: '$38', tone: 'pink' as const },
  { rank: '#2', name: 'LED strip lights', price: '$24', tone: 'vio' as const },
  { rank: '#3', name: 'Nike Field General', price: '$85', tone: 'lime' as const },
];

export function seedContacts(): Contact[] {
  return [
    { id: 'c1', name: 'Zoe P.', handle: '@zoepp', initial: 'Z', context: 'from your contacts', mutual: 8, follows: true, requested: false },
    { id: 'c2', name: 'Marcus T.', handle: '@marct', initial: 'M', context: 'from your contacts', mutual: 3, follows: false, requested: false },
    { id: 'c3', name: 'Lena K.', handle: '@lenak', initial: 'L', context: 'from your contacts', mutual: 0, follows: false, requested: false },
    { id: 'c4', name: 'Priya S.', handle: '@priyahearts', initial: 'P', context: 'on MeLikee', mutual: 2, follows: true, requested: false, searchOnly: true },
    { id: 'c5', name: 'Dee Alvarez', handle: '@deedee', initial: 'D', context: 'on MeLikee', mutual: 0, follows: true, requested: false, searchOnly: true },
  ];
}

export function seedSent(now = Date.now()): SentInvite[] {
  return [{ id: 'i1', name: 'Zoe P.', initial: 'Z', at: now - 2 * D }];
}

export function seedRequest(): FriendRequest {
  return { id: 'r1', name: 'Riley', initial: 'R', mutual: 4, birthday: inDays(118), state: 'pending', access: { w: true, s16: false } };
}

export function seedLinkHolders(now = Date.now()): LinkHolder[] {
  return [
    { id: 'h1', initial: 'G', name: 'Grandma', listId: 's16', action: 'called dibs', at: now - 2 * D },
    { id: 'h2', initial: 'J', name: 'Aunt Jo', listId: 's16', action: 'called dibs', at: now - 3 * D },
    { id: 'h3', initial: '?', name: 'Someone without a name', listId: 'w', action: 'viewed', at: now - 7 * D },
  ];
}

export function seedNotifs(now = Date.now()): Notif[] {
  return [
    { id: 'n1', kind: 'drop', title: 'Sony XM6 dropped to $349', sub: 'Best Buy · $50 off · on My wants', at: now - 2 * H, read: false, to: { name: 'lists' } },
    { id: 'n2', kind: 'req', title: 'Riley wants to follow your lists', sub: '4 mutual friends · tap to review', at: now - 3 * H, read: false, to: { name: 'people' } },
    { id: 'n3', kind: 'coming', title: 'Something’s coming…', sub: 'someone called dibs on your Sweet 16 — we won’t say what', at: now - 5 * H, read: false, to: { name: 'list', id: 's16' } },
    { id: 'n4', kind: 'love', title: 'Ava loved your Cloudmonster 2', sub: 'on My wants', at: now - 6 * H, read: false, to: { name: 'item', id: 1 } },
    { id: 'n5', kind: 'too', title: 'Jordan wants your Cloudmonster 2 too', sub: 'great minds', at: now - 1 * D, read: false, to: { name: 'item', id: 1 } },
    { id: 'n6', kind: 'bday', title: 'Ava turns 16 in 12 days', sub: '4 shinies still up for dibs', at: now - 1 * D - H, read: false, to: { name: 'friendList', id: 'ava16' } },
  ];
}

export function seedProfile(): Profile {
  return {
    name: 'Maya',
    handle: 'mayalikes',
    birthday: { month: 'Oct', day: 14, year: 2010 },
    remindGifters: true,
    showCountdown: true,
    parent: { on: true, approve: true, name: 'Jen (Mom)', contact: '', since: Date.UTC(2026, 8, 2) },
    email: 'maya@…',
  };
}

/** Which of the user's own items friends also want, for the item detail. */
export const alsoWant: Record<number, string> = {
  1: 'Jordan + 2 friends want this too',
  2: 'Ava wants this too',
  3: 'Sam + 1 friend want this too',
};

/** Gifters already holding dibs on the user's own items, by item id. */
export const otherGifters: Record<number, string> = { 2: 'Aunt Jo' };
