import { FormatedItem } from "./interface.ts";
import { MAX_ITEMS_PER_PAGE } from "./constant.ts";
export default function getLatestItems(
  currentItemsJson: Record<string, FormatedItem>,
): FormatedItem[] {
  // sort current items by date_published
  // archive over max items
  const currentItemsKeys = Object.keys(currentItemsJson);
  const currentItemsKeysSorted = currentItemsKeys.sort((a, b) => {
    const aModified = currentItemsJson[a]["date_published"]!;
    const bModified = currentItemsJson[b]["date_published"]!;
    return new Date(aModified) > new Date(bModified) ? -1 : 1;
  });

  // generate new current items
  const newCurrentItems = currentItemsKeysSorted.slice(
    0,
    MAX_ITEMS_PER_PAGE,
  ).map((key) => currentItemsJson[key]);
  return newCurrentItems;
}
/*
    .reduce(
      (acc, key) => {
        acc[key] = currentItemsJson[key];
        return acc;
      },
      {} as Record<string, FormatedItem>,
    );
*/
