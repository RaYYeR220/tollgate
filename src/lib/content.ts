/**
 * Client-safe editorial metadata for Tollgate.
 *
 * Note what is NOT here: the paid paragraphs. Those live in `content.server.ts`
 * (server-only) and are released by the API route only after the paywall has
 * verified entitlement on-chain. This module is all that ever reaches the
 * browser, so the locked text cannot be scraped from the client bundle.
 */

export type Author = {
  name: string;
  handle: string;
  bio: string;
};

export type Article = {
  slug: string;
  /** bytes32 id registered on-chain (keccak of the slug at registration time). */
  contentId: `0x${string}`;
  kicker: string;
  title: string;
  dek: string;
  author: Author;
  readMinutes: number;
  priceCents: number;
  /** issue/plate number, shown on the cover plate */
  plate: string;
  /** two-stop cover gradient */
  tone: [string, string];
  /** freely readable lede */
  free: string[];
  /** number of paragraphs waiting behind the paywall (for the teaser) */
  gatedParagraphs: number;
};

export const AUTHORS: Record<string, Author> = {
  marlowe: {
    name: "Junia Marlowe",
    handle: "junia",
    bio: "Writes on attention, money, and the machinery of taste. Former markets desk.",
  },
  okafor: {
    name: "Thande Okafor",
    handle: "thande",
    bio: "Field reporter. Spent a year inside the logistics of forgetting.",
  },
  reyes: {
    name: "Caleb Reyes",
    handle: "caleb",
    bio: "Design critic. Believes the interface is the argument.",
  },
  vance: {
    name: "Edda Vance",
    handle: "edda",
    bio: "Essayist. Long sentences, short patience for nonsense.",
  },
};

export const ARTICLES: Article[] = [
  {
    slug: "the-price-of-attention",
    contentId:
      "0x9a1d2c3b4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9",
    kicker: "Essay · Money",
    title: "The Price of Attention",
    dek: "We metered everything except the one resource the whole economy is built on. What happens when you finally put a number on a glance.",
    author: AUTHORS.marlowe,
    readMinutes: 9,
    priceCents: 50,
    plate: "No. 01",
    tone: ["#e8c66a", "#d23c18"],
    free: [
      "For twenty years the bargain was simple, and almost nobody read it. You gave away your attention and received, in exchange, things that felt free. The feed was free. The article was free. The argument, conducted at volume in a thousand quote-tweets, was free. The only cost was the thing you never thought to count.",
      "What I want to propose is uncomfortable, so I will say it plainly. The free era was never free. It was merely unpriced, which is a different and more dangerous condition. An unpriced thing cannot be defended, cannot be budgeted, cannot be refused with any precision. You can only give it all away or wall it off completely, and we spent two decades lurching between those two bad options.",
      "A price, by contrast, is a kind of dignity. It says: this has an edge. It can be declined. The interesting question of the next decade is not whether attention has a price — it always did — but whether we can finally make that price small enough, and quiet enough, to be humane.",
    ],
    gatedParagraphs: 5,
  },
  {
    slug: "the-logistics-of-forgetting",
    contentId:
      "0x1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f901",
    kicker: "Reportage · Field",
    title: "The Logistics of Forgetting",
    dek: "A year inside the warehouses where the internet's deleted things go to not-quite-die.",
    author: AUTHORS.okafor,
    readMinutes: 14,
    priceCents: 75,
    plate: "No. 02",
    tone: ["#7fa6a0", "#2c4f4a"],
    free: [
      "The building has no sign, which is the first thing they tell you not to write about and the first thing everyone writes about. It sits at the end of a service road in a county that offered tax relief and asked no questions, and from the outside it could be a distribution center for anything: shoes, frozen fish, ballots.",
      "Inside it is colder than you expect and quieter than you want. The hum is not machinery so much as the sound of a great many things waiting. I had come to understand a simple claim that turns out not to be simple at all: that when you delete something online, it is gone.",
      "It is not gone. It is relocated. The distinction is the entire business, and over the following months it became the only thing I could think about when anyone said the word 'forget.'",
    ],
    gatedParagraphs: 5,
  },
  {
    slug: "the-interface-is-the-argument",
    contentId:
      "0x2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9012a",
    kicker: "Criticism · Design",
    title: "The Interface Is the Argument",
    dek: "Every product makes a claim about how you should live. Most of them are lying. A few are honest enough to be beautiful.",
    author: AUTHORS.reyes,
    readMinutes: 7,
    priceCents: 50,
    plate: "No. 03",
    tone: ["#c98a9b", "#6d2440"],
    free: [
      "Show me your empty state and I will tell you what you believe. Not your mission statement — anyone can write a mission statement — but the screen the user sees when they have done nothing yet, the blank that you were forced to fill with your actual opinion of them.",
      "An interface is not a neutral window onto a function. It is a rhetorical act. It arranges attention, it implies a tempo, it flatters or scolds. By the time a user notices they are being persuaded, the argument is over and they have already lost or won.",
      "We talk about design as if it were decoration applied to logic. It is the reverse. The logic is the easy part. The design is where the company finally has to say, out loud and in pixels, what kind of relationship it wants with you.",
    ],
    gatedParagraphs: 5,
  },
  {
    slug: "small-money",
    contentId:
      "0x3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b",
    kicker: "Essay · Culture",
    title: "Small Money",
    dek: "On tipping, busking, and the lost art of paying a little for a lot.",
    author: AUTHORS.vance,
    readMinutes: 6,
    priceCents: 25,
    plate: "No. 04",
    tone: ["#d8b15a", "#8a5a16"],
    free: [
      "My grandfather carried coins the way some men carry opinions: heavily, and with the constant readiness to distribute them. A busker, a paper, a boy who carried a bag — each transaction was small enough to be almost wordless and frequent enough to be a kind of weather. He was not generous, exactly. He simply lived in an economy that had a denomination for gratitude.",
      "We have lost the denomination. Not the gratitude — that survives, anxious and inflationary, in the form of the five-star review and the heart-shaped tap. But the small, exact, frictionless coin that said 'that was worth something, though not very much, and here is precisely that much' — that coin has no digital twin we actually use.",
      "I have come to think this is a more serious loss than it sounds.",
    ],
    gatedParagraphs: 5,
  },
  {
    slug: "the-quiet-rail",
    contentId:
      "0x4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9012a3b4c",
    kicker: "Analysis · Infrastructure",
    title: "The Quiet Rail",
    dek: "The most important payment systems are the ones you have never heard of. That is not an accident — it is the whole design goal.",
    author: AUTHORS.marlowe,
    readMinutes: 11,
    priceCents: 60,
    plate: "No. 05",
    tone: ["#8c93c4", "#2f3470"],
    free: [
      "There is a hierarchy of infrastructure that runs exactly opposite to fame. The systems we discuss are the ones that fail. The systems that work are the ones we forget exist, and the very best of them we never learned the names of in the first place.",
      "Ask someone to name a payment network and they will name a brand — a card, an app, a logo. They will not name the clearing house, the settlement layer, the interbank messaging standard, the unglamorous middle through which the money actually moves. This is correct. They are not supposed to know. A rail that requires you to know its name has failed at the one thing a rail is for.",
      "I have spent years now watching builders rediscover this principle the hard way, and I have started to think it is the only principle that matters.",
    ],
    gatedParagraphs: 5,
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function formatPrice(cents: number): string {
  if (cents % 100 === 0) return `$${cents / 100}`;
  if (cents < 100) return `${cents}¢`;
  return `$${(cents / 100).toFixed(2)}`;
}
