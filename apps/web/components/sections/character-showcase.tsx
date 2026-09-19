import { FillerImage } from "@/components/filler";

const groups = [
  {
    heading: "Many styles",
    tiles: ["Style one", "Style two", "Style three"],
  },
  {
    heading: "Full of expressions",
    tiles: ["Expression one", "Expression two", "Expression three"],
  },
  {
    heading: "Different angles",
    tiles: ["Angle one", "Angle two", "Angle three"],
  },
];

export function CharacterShowcase() {
  return (
    <section className="py-16 lg:py-20">
      <div className="shell">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-primary">
            Customize faces, expressions, and angles
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-violet-deep sm:text-4xl">
            To bring your character to life!
          </h2>
        </div>

        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {groups.map((group) => (
            <div key={group.heading}>
              <div className="grid grid-cols-2 gap-3">
                {group.tiles.map((tile, i) => (
                  <div
                    key={tile}
                    className={
                      i === 2
                        ? "col-span-2 aspect-[2/1] overflow-hidden rounded-[1.5rem] border-4 border-white shadow-[0_14px_30px_-20px_rgba(31,22,54,.5)]"
                        : "aspect-square overflow-hidden rounded-[1.5rem] border-4 border-white shadow-[0_14px_30px_-20px_rgba(31,22,54,.5)]"
                    }
                  >
                    <FillerImage label={tile} />
                  </div>
                ))}
              </div>
              <h3 className="mt-5 text-center font-display text-xl font-semibold text-violet-deep">
                {group.heading}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}