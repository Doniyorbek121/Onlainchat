import { ensureSeeded } from "../src/lib/seed";
import { countCharacters } from "../src/lib/db";

ensureSeeded();
console.log(`✅ Database seeded. Characters: ${countCharacters()}`);
