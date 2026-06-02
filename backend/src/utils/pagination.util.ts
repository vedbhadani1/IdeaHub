export type CursorObj = {
  createdAt: Date;
  id: number | string; // Phase 4: Support string CUIDs for Audit Logs
};

/**
 * Encodes a cursor object to a base64 string
 */
export const encodeCursor = (cursor: CursorObj): string => {
  const json = JSON.stringify(cursor);
  return Buffer.from(json).toString('base64');
};

/**
 * Decodes a base64 string to a cursor object.
 * Note: Zod validation should be applied after this to ensure structure.
 */
export const decodeCursor = (encodedCursor: string): CursorObj | null => {
  try {
    const json = Buffer.from(encodedCursor, 'base64').toString('utf8');
    const parsed = JSON.parse(json);
    return {
      createdAt: new Date(parsed.createdAt),
      id: isNaN(Number(parsed.id)) ? String(parsed.id) : Number(parsed.id),
    };
  } catch (error) {
    return null; // Malformed cursor
  }
};

/**
 * Evaluates hasMore and nextCursor based on the take limit.
 * It inherently handles the `take + 1` logic.
 *
 * @param items Array of items returned from DB (expected length: limit + 1 if more exist)
 * @param limit The requested limit
 * @param getCursorObj Function to extract { createdAt, id } from an item
 * @returns { results, nextCursor, hasMore }
 */
export const buildPaginatedResult = <T>(
  items: T[],
  limit: number,
  getCursorObj: (item: T) => CursorObj
) => {
  let hasMore = false;
  let nextCursor: string | undefined = undefined;

  // If we got more items than the limit, we have a next page
  if (items.length > limit) {
    hasMore = true;
    items.pop(); // Remove the extra item used for looking ahead
  }

  // If we have items left, the last one defines the cursor for the NEXT page
  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    nextCursor = encodeCursor(getCursorObj(lastItem));
  }

  return {
    results: items,
    nextCursor,
    hasMore,
  };
};
