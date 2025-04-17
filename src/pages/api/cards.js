import path from 'path';
import { promises as fs } from 'fs';

export default async function handler(req, res) {
  try {
    // Build the path to the JSON file
    const jsonDirectory = path.join(process.cwd(), 'public', 'data');
    const fileContents = await fs.readFile(
      path.join(jsonDirectory, '/cards.json'),
      'utf8'
    );
    res.status(200).json(JSON.parse(fileContents));
  } catch (error) {
    res.status(500).json({ error: 'Failed to load data' });
  }
}