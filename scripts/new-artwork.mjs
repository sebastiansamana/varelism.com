import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const artworkDir = path.join(process.cwd(), 'src', 'data', 'artworks');

const rl = readline.createInterface({ input, output });

const slugify = (value) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const quoteYaml = (value) => JSON.stringify(value ?? '');

const ask = async (question) => (await rl.question(question)).trim();

const askRequired = async (question) => {
  while (true) {
    const value = await ask(question);
    if (value) return value;
    console.log('A title is required so the artwork file can be named. No value was invented.');
  }
};

const askInteger = async (question) => {
  while (true) {
    const value = await ask(question);
    if (!value) return '';
    if (/^-?\d+$/.test(value)) return value;
    console.log('Please enter a whole number, or leave it blank.');
  }
};

const askStatus = async () => {
  while (true) {
    const value = (await ask('Status (draft/public, default draft): ')).toLowerCase();
    if (!value) return 'draft';
    if (value === 'draft' || value === 'public') return value;
    console.log('Please enter draft or public.');
  }
};

try {
  const title = await askRequired('Title: ');
  const slugInput = await ask(`Slug (default ${slugify(title)}): `);
  const slug = slugInput || slugify(title);

  if (!slug) {
    throw new Error('Unable to create a slug from the provided title.');
  }

  const status = await askStatus();
  const date = await ask('Date label: ');
  const sortYear = await askInteger('Sort year: ');
  const sortMonth = await askInteger('Sort month: ');
  const sortDay = await askInteger('Sort day: ');
  const orderInYear = await askInteger('Order in year: ');
  const medium = await ask('Medium: ');
  const dimensions = await ask('Dimensions: ');
  const location = await ask('Location: ');
  const description = await ask('Exhibition description: ');
  const image = await ask('Public image path, for example /images/artworks/example.jpg: ');
  const imageWidth = await askInteger('Image width in pixels: ');
  const imageHeight = await askInteger('Image height in pixels: ');
  const imageAlt = await ask('Image alt text: ');

  const frontmatter = [
    '---',
    `title: ${quoteYaml(title)}`,
    `status: ${status}`,
    `date: ${quoteYaml(date)}`,
    `sortYear: ${sortYear}`,
    `sortMonth: ${sortMonth}`,
    `sortDay: ${sortDay}`,
    `orderInYear: ${orderInYear}`,
    `medium: ${quoteYaml(medium)}`,
    `dimensions: ${quoteYaml(dimensions)}`,
    `location: ${quoteYaml(location)}`,
    `description: ${quoteYaml(description)}`,
    `image: ${quoteYaml(image)}`,
    `imageWidth: ${imageWidth}`,
    `imageHeight: ${imageHeight}`,
    `imageAlt: ${quoteYaml(imageAlt)}`,
    '---',
    '',
  ].join('\n');

  await mkdir(artworkDir, { recursive: true });

  const filePath = path.join(artworkDir, `${slug}.md`);
  await writeFile(filePath, frontmatter, { encoding: 'utf8', flag: 'wx' });

  console.log(`Created ${path.relative(process.cwd(), filePath)}`);
} finally {
  rl.close();
}
