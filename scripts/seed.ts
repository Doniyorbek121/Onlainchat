import { ensureSeeded } from "../src/lib/seed";
import { countCharacters } from "../src/lib/db";

async function main() {
  await ensureSeeded();
  console.log(`✅ Database seeded. Characters: ${await countCharacters()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
