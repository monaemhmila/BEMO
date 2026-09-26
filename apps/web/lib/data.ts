export type Book = {
  slug: string;
  title: string;
  tagline: string;
  price: string;
  compareAt?: string;
  badge?: string;
};

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Books", href: "/books" },
  { label: "My Books", href: "/login" },
  { label: "Support", href: "/support" },
];

export const bestsellers: Book[] = [
  {
    slug: "girls-sticker-pack",
    title: "Girl's Sticker Pack",
    tagline: "Personalized sticker packs for your little girl",
    price: "$14.99",
    compareAt: "$29.99",
    badge: "-50%",
  },
  {
    slug: "boys-sticker-pack",
    title: "Boy's Sticker Pack",
    tagline: "Personalized sticker packs for your little boy",
    price: "$14.99",
    compareAt: "$29.99",
    badge: "-50%",
  },
  {
    slug: "the-portugals-new-legend",
    title: "The Portugal's New Legend",
    tagline: "For champions with red and green at heart 🇵🇹",
    price: "From $44.99",
  },
  {
    slug: "princess-girl-the-one-we-all-needed",
    title: "Princess Girl, the One We All Needed",
    tagline: "A magical journey of kindness and courage",
    price: "From $34.99",
  },
  {
    slug: "super-boy-and-the-dragon",
    title: "Super Boy and the Dragon",
    tagline: "Kindness turns a scary dragon into a true friend",
    price: "From $34.99",
  },
  {
    slug: "princess-and-the-glowing-flower",
    title: "Princess and the Glowing Flower",
    tagline: "A heartwarming tale of sharing, love, and bravery",
    price: "From $34.99",
  },
];

export const newReleases: Book[] = [
  {
    slug: "the-boy-and-the-cosmic-journey",
    title: "The Boy and the Cosmic Journey",
    tagline: "A bedtime journey through space and stars",
    price: "From $34.99",
  },
  {
    slug: "super-boy-and-the-dragon",
    title: "Super Boy and the Dragon",
    tagline: "Kindness turns a scary dragon into a true friend",
    price: "From $34.99",
  },
  {
    slug: "boy-explores-the-zoo",
    title: "Boy Explores the Zoo",
    tagline: "Wild zoo adventure: meet and learn with animals",
    price: "From $34.99",
  },
  {
    slug: "girl-explores-the-zoo",
    title: "Girl Explores the Zoo",
    tagline: "Wild zoo adventure: meet and learn with animals",
    price: "From $34.99",
  },
  {
    slug: "girl-and-the-lost-fairy-wings",
    title: "Girl and the Lost Fairy Wings",
    tagline: "Believe in magic: a fairy's journey",
    price: "From $34.99",
  },
  {
    slug: "vroom-vroom-the-boy-wins-the-race",
    title: "Vroom Vroom, The Boy Wins the Race",
    tagline: "A child's race to believe, try, and win",
    price: "From $34.99",
  },
];

export const girlsBooks: Book[] = [
  {
    slug: "girl-counts-with-the-forest-friends",
    title: "Girl Counts with the Forest Friends",
    tagline: "A magical way to explore numbers together",
    price: "From $34.99",
  },
  {
    slug: "the-abc-journey-with-girl",
    title: "The ABC Journey with Girl",
    tagline: "A magical way to explore the alphabet together",
    price: "From $34.99",
  },
  {
    slug: "girls-fun-in-the-sun",
    title: "Girl's Fun in the Sun",
    tagline: "Imagination builds the best obstacle course",
    price: "From $34.99",
  },
  {
    slug: "princess-and-the-glowing-flower",
    title: "Princess and the Glowing Flower",
    tagline: "A heartwarming tale of sharing, love, and bravery",
    price: "From $34.99",
  },
];

export const boysBooks: Book[] = [
  {
    slug: "the-abc-journey-with-boy",
    title: "The ABC Journey with Boy",
    tagline: "A magical way to explore the alphabet together",
    price: "From $34.99",
  },
  {
    slug: "boy-and-the-forgotten-robot",
    title: "Boy and the Forgotten Robot",
    tagline: "Explore secrets of space with a brave new friend",
    price: "From $34.99",
  },
  {
    slug: "the-boy-who-could-talk-to-animals",
    title: "The Boy Who Could Talk to Animals",
    tagline: "A magical tale of animals, kindness, and sharing",
    price: "From $34.99",
  },
  {
    slug: "the-boy-and-the-cosmic-journey",
    title: "The Boy and the Cosmic Journey",
    tagline: "A bedtime journey through space and stars",
    price: "From $34.99",
  },
];

export const steps = [
  { n: 1, title: "Pick a storybook", art: "Step one storybook" },
  { n: 2, title: "Add your child's picture", art: "Step two upload" },
  { n: 3, title: "Preview and order", art: "Step three preview" },
  {
    n: 4,
    title: "Your story is printed with care and delivered with joy.",
    art: "Step four delivery",
  },
];

export const careers = [
  { label: "Firefighter", art: "Firefighter child" },
  { label: "Police Officer", art: "Police officer child" },
  { label: "Pilot", art: "Pilot child" },
  { label: "Doctor", art: "Doctor child" },
];

export const ageGroups = [
  { range: "Age 2-4", art: "Child 2-4" },
  { range: "Age 4-6", art: "Child 4-6" },
  { range: "Age 6-8", art: "Child 6-8" },
];

export const faqs = [
  {
    q: "How do I place an order?",
    a: "It's easy! Choose the book you want personalised, upload a photo of your child (make sure it matches our recommendations), and enter their name and age. You'll then get a preview of the book. If you're happy with it, just proceed to payment to complete your order.",
  },
  {
    q: "Do you ship to my location?",
    a: "Yes! We ship to over 200 countries and regions, so wherever you are, we'll make sure your order reaches you. Simply enter your shipping details at checkout, and we'll take care of the rest.",
  },
  {
    q: "Can I get a refund for my order?",
    a: "Yes, you can receive a full refund if your book hasn't been printed yet, or a partial refund if it has been printed but not yet shipped. Once the book has been printed and shipped, we're unable to offer a refund. To request a refund contact us through our support page or by email at support@monpetithero.shop.",
  },
  {
    q: "How long does shipping take?",
    a: "Shipping times depend on the shipping method you choose at checkout. Standard shipping usually takes 10 to 30 business days, while express shipping typically arrives within 7 to 20 business days. Delivery times include only business days, so holidays or weekends may cause slight delays.",
  },
  {
    q: "Will I have to pay duties or extra fees?",
    a: "The prices listed on our website do not include any additional taxes, customs duties, or import fees. These charges may apply depending on your country's regulations and are the responsibility of the recipient. We recommend checking with your local customs office for more information.",
  },
  {
    q: "What if I'm not happy with my order?",
    a: "After payment, you'll review and approve your book. If you're not happy with it, you can request changes, and our dedicated support team will be happy to assist you.",
  },
  {
    q: "How can I reach customer support?",
    a: "You can contact our customer support team anytime through our support page or by emailing support@monpetithero.shop.",
  },
  {
    q: "What languages are your books available in?",
    a: "Our books are currently available in English, Spanish, Portuguese (Brazil), Arabic, French, Turkish, German, Italian, Dutch and Albanian. We are actively working on adding more languages soon.",
  },
];

export const footerColumns = [
  {
    heading: "About Mon Petit Hero",
    links: [
      { label: "Contact us", href: "/contact" },
      { label: "FAQs", href: "/faqs" },
      { label: "Blog", href: "/blog" },
      { label: "Support", href: "/support" },
    ],
  },
  {
    heading: "Customer Area",
    links: [
      { label: "My Account", href: "/profile" },
      { label: "Orders", href: "/my/purchases" },
      { label: "Site Statistics", href: "/stats" },
      { label: "Terms", href: "/support/terms-and-conditions" },
      { label: "Privacy Policy", href: "/support/privacy-policy" },
    ],
  },
];

export const allBooks: Book[] = [
  ...bestsellers,
  ...newReleases,
  ...girlsBooks,
  ...boysBooks,
].filter((book, i, arr) => arr.findIndex((b) => b.slug === book.slug) === i);

export function getBook(slug: string) {
  return allBooks.find((book) => book.slug === slug);
}

const ageKeywords: Record<string, string[]> = {
  "Age 2-4": ["counts", "abc", "zoo", "forest", "sun", "glowing-flower"],
  "Age 4-6": [
    "princess",
    "fairy",
    "animals",
    "dragon",
    "super-boy",
    "vroom",
    "wins-the-race",
    "legend",
    "talk-to-animals",
    "lost-fairy",
  ],
  "Age 6-8": ["cosmic", "robot", "legend", "wins-the-race", "dragon", "zoo"],
};

export function booksForAge(age: string) {
  const keywords = ageKeywords[age];
  if (!keywords) return allBooks;
  const matches = allBooks.filter((book) =>
    keywords.some((k) => book.slug.includes(k)),
  );
  return matches.length > 0 ? matches : allBooks;
}

export type BookMeta = {
  gender: "boy" | "girl" | "any";
  ages: string[];
  categories: string[];
};

export type SearchBook = Book & BookMeta;

const bookCategoriesBySlug: Record<string, string[]> = {
  "girls-sticker-pack": ["Emotional"],
  "boys-sticker-pack": ["Emotional"],
  "the-portugals-new-legend": ["Dream", "Job"],
  "princess-girl-the-one-we-all-needed": ["Emotional", "Adventure"],
  "super-boy-and-the-dragon": ["Adventure", "Bedtime story"],
  "princess-and-the-glowing-flower": ["Emotional", "Bedtime story"],
  "the-boy-and-the-cosmic-journey": ["Dream", "Job"],
  "boy-explores-the-zoo": ["Educative", "Adventure"],
  "girl-explores-the-zoo": ["Educative", "Adventure"],
  "girl-and-the-lost-fairy-wings": ["Bedtime story", "Dream"],
  "vroom-vroom-the-boy-wins-the-race": ["Dream", "Job"],
  "girl-counts-with-the-forest-friends": ["Educative"],
  "the-abc-journey-with-girl": ["Educative"],
  "girls-fun-in-the-sun": ["Adventure", "Emotional"],
  "the-abc-journey-with-boy": ["Educative"],
  "boy-and-the-forgotten-robot": ["Adventure"],
  "the-boy-who-could-talk-to-animals": ["Emotional", "Educative"],
};

export function bookMeta(slug: string): BookMeta {
  let gender: BookMeta["gender"] = "any";
  if (/girl|princess/.test(slug)) gender = "girl";
  else if (/boy/.test(slug)) gender = "boy";

  const ages: string[] = [];
  for (const [range, keywords] of Object.entries(ageKeywords)) {
    if (keywords.some((keyword) => slug.includes(keyword))) {
      ages.push(range === "Age 2-4" ? "2-4" : range === "Age 4-6" ? "4-6" : "6-8");
    }
  }

  return {
    gender,
    ages,
    categories: bookCategoriesBySlug[slug] ?? [],
  };
}

export const searchableBooks: SearchBook[] = allBooks.map((book) => ({
  ...book,
  ...bookMeta(book.slug),
}));