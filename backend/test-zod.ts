import { z } from 'zod';

const getCommentsSchema = z.object({
  query: z.object({
    limit: z.any()
  }).strict(),
  params: z.object({
    id: z.string().regex(/^\d+$/).transform(Number)
  }).strict()
});

async function main() {
  try {
    const parsed = await getCommentsSchema.parseAsync({
      body: {},
      query: { limit: "10" },
      params: { id: "12" },
    });
    console.log('SUCCESS:', parsed);
  } catch (err) {
    console.log('ERROR:', err);
  }
}
main();
