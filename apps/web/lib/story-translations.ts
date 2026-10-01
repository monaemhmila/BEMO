import type { Locale } from "@/lib/i18n";

export type StoryCopyField = "title" | "description" | "tagline" | "excerpt";
type StoryCopy = Partial<Record<StoryCopyField, string>>;

export const storyTranslations: Record<
  string,
  Partial<Record<Locale, StoryCopy>>
> = {
  "lets-count-1-10": {
    fr: {
      title: "Comptons ! De 1 à 10",
      description:
        "Une aventure ludique où l'enfant compte des animaux de un à cinq, puis découvre des fruits colorés en comptant de six à dix.",
      tagline: "Compte les animaux, compte les fruits et découvre les nombres de 1 à 10 !",
      excerpt:
        "L'enfant commence une aventure de comptage avec des animaux sympathiques. Puis un jardin de fruits colorés apparaît pour faire découvrir les nombres de six à dix.",
    },
    ar: {
      title: "هيا نعدّ! من 1 إلى 10",
      description:
        "مغامرة مرحة يعدّ فيها الطفل الحيوانات من واحد إلى خمسة، ثم يكتشف الفواكه الملونة وهو يعدّ من ستة إلى عشرة.",
      tagline: "عدّ الحيوانات والفواكه واكتشف الأرقام من 1 إلى 10!",
      excerpt:
        "يبدأ الطفل مغامرة ممتعة في العد مع حيوانات لطيفة، ثم تظهر حديقة فواكه ملونة لتعرّفه إلى الأعداد من ستة إلى عشرة.",
    },
  },
  "my-abc-adventure": {
    fr: {
      title: "Mon aventure avec l'alphabet",
      description:
        "Une aventure d'apprentissage où l'enfant explore l'alphabet deux lettres à la fois et découvre un mot familier pour chaque lettre dans la langue choisie.",
      tagline: "Chaque lettre ouvre la porte vers un nouveau mot !",
      excerpt:
        "L'enfant commence une aventure colorée dans l'alphabet et découvre deux nouvelles lettres à la fois. Chaque lettre est associée à un mot simple et familier dans la langue choisie.",
    },
    ar: {
      title: "مغامرتي مع الحروف",
      description:
        "مغامرة تعليمية يستكشف فيها الطفل الحروف حرفين في كل مرة، ويكتشف كلمة مألوفة لكل حرف باللغة المختارة.",
      tagline: "كل حرف يفتح الباب أمام كلمة جديدة!",
      excerpt:
        "يبدأ الطفل مغامرة ملونة في عالم الحروف، فيكتشف حرفين جديدين في كل مرة، ويربط كل حرف بكلمة بسيطة ومألوفة باللغة المختارة.",
    },
  },
  "girls-sticker-pack": {
    fr: {
      title: "Pack d'autocollants pour fille",
      tagline: "Des autocollants personnalisés pour ta petite fille",
    },
    ar: {
      title: "مجموعة ملصقات للفتيات",
      tagline: "ملصقات مخصصة لابنتك الصغيرة",
    },
  },
  "boys-sticker-pack": {
    fr: {
      title: "Pack d'autocollants pour garçon",
      tagline: "Des autocollants personnalisés pour ton petit garçon",
    },
    ar: {
      title: "مجموعة ملصقات للفتيان",
      tagline: "ملصقات مخصصة لابنك الصغير",
    },
  },
  "the-portugals-new-legend": {
    fr: {
      title: "La nouvelle légende du Portugal",
      tagline: "Pour les champions qui portent le rouge et le vert dans leur cœur 🇵🇹",
    },
    ar: {
      title: "أسطورة البرتغال الجديدة",
      tagline: "للأبطال الذين يحملون الأحمر والأخضر في قلوبهم 🇵🇹",
    },
  },
  "princess-girl-the-one-we-all-needed": {
    fr: {
      title: "La princesse, celle dont nous avions tous besoin",
      tagline: "Un voyage magique rempli de gentillesse et de courage",
    },
    ar: {
      title: "الأميرة التي احتجنا إليها جميعًا",
      tagline: "رحلة سحرية مليئة باللطف والشجاعة",
    },
  },
  "super-boy-and-the-dragon": {
    fr: {
      title: "Super garçon et le dragon",
      tagline: "La gentillesse transforme un dragon effrayant en véritable ami",
    },
    ar: {
      title: "البطل الصغير والتنين",
      tagline: "اللطف يحوّل تنينًا مخيفًا إلى صديق حقيقي",
    },
  },
  "princess-and-the-glowing-flower": {
    fr: {
      title: "La princesse et la fleur lumineuse",
      tagline: "Une histoire touchante de partage, d'amour et de courage",
    },
    ar: {
      title: "الأميرة والزهرة المضيئة",
      tagline: "حكاية مؤثرة عن المشاركة والحب والشجاعة",
    },
  },
  "the-boy-and-the-cosmic-journey": {
    fr: {
      title: "Le garçon et le voyage cosmique",
      tagline: "Un voyage du soir à travers l'espace et les étoiles",
    },
    ar: {
      title: "الفتى والرحلة الكونية",
      tagline: "رحلة قبل النوم عبر الفضاء والنجوم",
    },
  },
  "boy-explores-the-zoo": {
    fr: {
      title: "Le garçon explore le zoo",
      tagline: "Une aventure sauvage au zoo à la rencontre des animaux",
    },
    ar: {
      title: "الفتى يستكشف حديقة الحيوانات",
      tagline: "مغامرة في حديقة الحيوانات للتعرف إلى الحيوانات والتعلم منها",
    },
  },
  "girl-explores-the-zoo": {
    fr: {
      title: "La fille explore le zoo",
      tagline: "Une aventure sauvage au zoo à la rencontre des animaux",
    },
    ar: {
      title: "الفتاة تستكشف حديقة الحيوانات",
      tagline: "مغامرة في حديقة الحيوانات للتعرف إلى الحيوانات والتعلم منها",
    },
  },
  "girl-and-the-lost-fairy-wings": {
    fr: {
      title: "La fille et les ailes de fée perdues",
      tagline: "Croire en la magie : le voyage d'une fée",
    },
    ar: {
      title: "الفتاة وأجنحة الجنية الضائعة",
      tagline: "آمن بالسحر: رحلة جنية",
    },
  },
  "vroom-vroom-the-boy-wins-the-race": {
    fr: {
      title: "Vroum vroum, le garçon gagne la course",
      tagline: "La course d'un enfant pour croire en lui, essayer et gagner",
    },
    ar: {
      title: "فرووم فرووم، الفتى يفوز بالسباق",
      tagline: "سباق طفل ليثق بنفسه ويحاول ويفوز",
    },
  },
  "girl-counts-with-the-forest-friends": {
    fr: {
      title: "La fille compte avec ses amis de la forêt",
      tagline: "Une façon magique d'explorer les nombres ensemble",
    },
    ar: {
      title: "الفتاة تعدّ مع أصدقاء الغابة",
      tagline: "طريقة سحرية لاستكشاف الأرقام معًا",
    },
  },
  "the-abc-journey-with-girl": {
    fr: {
      title: "Le voyage ABC avec une fille",
      tagline: "Une façon magique d'explorer l'alphabet ensemble",
    },
    ar: {
      title: "رحلة الحروف مع فتاة",
      tagline: "طريقة سحرية لاستكشاف الحروف معًا",
    },
  },
  "girls-fun-in-the-sun": {
    fr: {
      title: "Les jeux de la fille au soleil",
      tagline: "L'imagination crée le meilleur parcours d'obstacles",
    },
    ar: {
      title: "مرح الفتيات تحت الشمس",
      tagline: "الخيال يبني أفضل مسار للعقبات",
    },
  },
  "the-abc-journey-with-boy": {
    fr: {
      title: "Le voyage ABC avec un garçon",
      tagline: "Une façon magique d'explorer l'alphabet ensemble",
    },
    ar: {
      title: "رحلة الحروف مع فتى",
      tagline: "طريقة سحرية لاستكشاف الحروف معًا",
    },
  },
  "boy-and-the-forgotten-robot": {
    fr: {
      title: "Le garçon et le robot oublié",
      tagline: "Explore les secrets de l'espace avec un nouvel ami courageux",
    },
    ar: {
      title: "الفتى والروبوت المنسي",
      tagline: "استكشف أسرار الفضاء مع صديق جديد شجاع",
    },
  },
  "the-boy-who-could-talk-to-animals": {
    fr: {
      title: "Le garçon qui parlait aux animaux",
      tagline: "Une histoire magique d'animaux, de gentillesse et de partage",
    },
    ar: {
      title: "الفتى الذي كان يتحدث إلى الحيوانات",
      tagline: "حكاية سحرية عن الحيوانات واللطف والمشاركة",
    },
  },
};
