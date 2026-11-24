import messages from "@/messages/en.json";

/** "a driver", "an admin", "a booker": the role as the invite line says it (D043: manager is "admin"). */
export function roleWithArticle(role: string) {
  const word = (messages.org.roles[role as keyof typeof messages.org.roles] ?? role).toLowerCase();
  return `${/^[aeiou]/.test(word) ? "an" : "a"} ${word}`;
}
