"use client";

import { BookOpen } from "lucide-react";

interface StoryBookCoverProps {
  title: string;
  childName?: string | null;
  dedication?: string | null;
  language?: string | null;
  isClosing?: boolean;
}

const FINAL_COVER_COPY = {
  english: {
    title: "A Little Adventure to Remember Forever",
    body: "Childhood goes by so quickly, but the happy moments can stay with us forever.\n\nThat's why I'm here. To turn your child's dreams into a beautiful story they can call their own.\n\nWith their name, their favorite things, and a little magic, every Mon Petit Héros book takes them somewhere new and exciting.\n\nEvery page brings a new surprise, with your little one as the star of the adventure.\n\nI'm more than just a book. I'm a special part of their childhood, made to be loved today and remembered for years to come.",
  },
  french: {
    title: "Une petite aventure, un souvenir pour toujours",
    body: "L'enfance passe si vite, mais les plus beaux moments restent gravés dans nos cœurs.\n\nC'est pour cela que j'existe. Pour transformer les rêves de votre enfant en une belle histoire qui lui ressemble.\n\nAvec son prénom, ce qu'il aime et une touche de magie, chaque livre Mon Petit Héros l'emmène dans un nouvel univers plein de surprises.\n\nÀ chaque page, une nouvelle découverte, avec votre petit héros au cœur de l'aventure.\n\nJe suis bien plus qu'un simple livre. Je suis un petit morceau de son enfance, à aimer aujourd'hui et à garder précieusement pour les années à venir.",
  },
  arabic: {
    title: "مغامرة صغيرة، وذكرى تبقى للأبد",
    body: "تمرّ أيام الطفولة بسرعة، لكن أجمل اللحظات تبقى محفورة في قلوبنا إلى الأبد.\n\nلهذا وُجدتُ، لأحوّل أحلام طفلك إلى قصة جميلة تشبهه وتخصّه وحده.\n\nباسمه، وأشيائه المفضّلة، ولمسة من السحر، يأخذه كل كتاب من Mon Petit Héros إلى عالم جديد مليء بالمغامرات والمفاجآت.\n\nمع كل صفحة، يكتشف طفلك شيئًا جديدًا، ويكون هو بطل الحكاية.\n\nأنا أكثر من مجرد كتاب. أنا ذكرى جميلة من طفولته، يحبّها اليوم ويحتفظ بها في قلبه لسنوات طويلة.",
  },
} as const;

function getFinalCoverCopy(language?: string | null) {
  const normalized = (language || "english").toLowerCase();
  if (normalized.startsWith("fr")) return FINAL_COVER_COPY.french;
  if (normalized.startsWith("ar")) return FINAL_COVER_COPY.arabic;
  return FINAL_COVER_COPY.english;
}

/**
 * The visual "outside cover" overlay. The generated cover artwork stays the
 * hero; the existing BEMO title system is drawn on top, just like the printed
 * book - never burned into the AI image.
 */
export function StoryBookCover({ title, childName, dedication, language, isClosing = false }: StoryBookCoverProps) {
  if (isClosing) {
    const copy = getFinalCoverCopy(language);
    return (
      <div
        dir={language?.toLowerCase().startsWith("ar") ? "rtl" : "ltr"}
        className="absolute inset-0 flex items-center justify-center bg-black/25 px-[10%] text-center"
      >
        <div className="max-h-[86%] overflow-hidden text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
          <h2 className="font-display font-bold text-[clamp(0.9rem,3.4cqw,1.8rem)] leading-tight">{copy.title}</h2>
          <p className="mt-[3cqw] whitespace-pre-line font-display text-[clamp(0.45rem,1.45cqw,0.82rem)] leading-snug">{copy.body}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="absolute inset-0">
      {/* Scrim so the title stays readable over any artwork */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />

      <div className="absolute top-[7%] inset-x-0 text-center px-[8%]">
        <h2 className="font-display font-bold text-white text-[clamp(1rem,4.2cqw,2.2rem)] leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
          {title}
        </h2>
        {childName && (
          <p className="mt-[1.4cqw] text-buttercup font-semibold uppercase tracking-[0.28em] text-[clamp(0.45rem,1.5cqw,0.85rem)] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
            Starring {childName}
          </p>
        )}
      </div>

      <div className="absolute bottom-[4%] inset-x-0 text-center px-[8%]">
        {dedication ? (
          <p className="font-display italic text-white/90 text-[clamp(0.55rem,1.8cqw,1rem)] leading-snug [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            “{dedication}”
          </p>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-[2%] py-[0.8cqw] text-white/90 tracking-[0.3em] uppercase text-[clamp(0.4rem,1.2cqw,0.75rem)]">
            <BookOpen className="inline-block size-[1.2em]" aria-hidden="true" />
            Mon Petit Hero
          </span>
        )}
      </div>
    </div>
  );
}
