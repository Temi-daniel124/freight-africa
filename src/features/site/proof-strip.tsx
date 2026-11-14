import { Lock, MapPin, ShieldCheck } from "lucide-react";
import messages from "@/messages/en.json";

const icons = { verified: ShieldCheck, held: Lock, tracking: MapPin } as const;

export function ProofStrip() {
  return (
    <section className="border-b border-line bg-surface">
      <ul className="mx-auto grid max-w-site gap-6 px-4 py-8 sm:grid-cols-3 lg:px-6 lg:py-10">
        {messages.home.proof.map((item) => {
          const Icon = icons[item.icon as keyof typeof icons];
          return (
            <li key={item.title} className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-green-50 text-green-700">
                <Icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-body font-semibold text-ink">{item.title}</h2>
                <p className="text-body text-ink-2">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
