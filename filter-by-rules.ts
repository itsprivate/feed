import { Rule } from "./interface.ts";
import { get, hasSameKeys } from "./util.ts";
import Item from "./item.ts";
import log from "./log.ts";
export default function filterByRules<T>(
  originalItems: Item<T>[],
  rules: Rule[],
): Item<T>[] {
  let limitRule: Rule | undefined;
  let deduplicateRule: Rule | undefined;
  for (const rule of rules) {
    if (rule.type === "limit") {
      limitRule = rule;
      break;
    }
  }

  for (const rule of rules) {
    if (rule.type === "deduplicate") {
      deduplicateRule = rule;
      break;
    }
  }
  let deduplicate: string | undefined;
  if (deduplicateRule) {
    deduplicate = deduplicateRule.value as string;
  }
  if (limitRule) {
    originalItems = originalItems.slice(0, Number(limitRule.value));
  }

  let topRule: Rule | undefined;
  for (const rule of rules) {
    if (rule.type === "topRatio") {
      topRule = rule;
      break;
    }
  }

  if (topRule && topRule.value) {
    const topRatio = Number(topRule.value);
    const topCount = Math.floor(originalItems.length * topRatio);
    // sort by score
    originalItems.sort((a, b) => {
      return b.getWeightedScore() - a.getWeightedScore();
    });

    originalItems = originalItems.slice(0, topCount);
    // sort by originalPublished
  }

  // remove duplicated items
  const keysMap = new Map<string, boolean>();

  const newItems = [];
  for (const item of originalItems) {
    // check is valid
    if (!item.isValid()) {
      continue;
    }
    let itemCachedKeys = [];
    try {
      itemCachedKeys = item.getCachedKeys();
      if (hasSameKeys(keysMap, itemCachedKeys, deduplicate).length > 0) {
        continue;
      }
    } catch (e) {
      log.error(e);
      log.error(`error in filterByRules, item: ${JSON.stringify(item)}`);

      continue;
      // throw e;
    }
    // check rules
    let isAllRulesFine = true;
    for (const rule of rules) {
      const { key: thekey, value: theValue, type } = rule;
      if (!thekey) {
        continue;
      }
      const key = thekey!;
      // check item[key] is function
      const itemValue = get(item, key);
      let originalValue = itemValue;
      if (typeof itemValue === "function") {
        // @ts-ignore: I know it's a function
        originalValue = item[key]();
      }

      const value = theValue as string;
      if (type === "greater") {
        if (Number(originalValue) <= Number(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "equal") {
        if (originalValue !== value) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "notEqual") {
        if (originalValue === value) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "include") {
        if (!(originalValue as string[]).includes(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "notInclude") {
        if ((originalValue as string[]).includes(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "startsWith") {
        if (!(originalValue as string).startsWith(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "endsWith") {
        if (!(originalValue as string).endsWith(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "notStartsWith") {
        if ((originalValue as string).startsWith(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "notEndsWith") {
        if ((originalValue as string).endsWith(value)) {
          log.debug(
            `remove originalValue, for rule ${key}  notEndsWith: ${value}`,
          );
          isAllRulesFine = false;
          break;
        }
      } else if (type === "notExist") {
        if (originalValue) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "exist") {
        if (!originalValue) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "notMatch") {
        if ((originalValue as string).match(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "match") {
        if (!(originalValue as string).match(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "greaterEqual") {
        if (Number(originalValue) < Number(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "less") {
        if (Number(originalValue) >= Number(value)) {
          isAllRulesFine = false;
          break;
        }
      } else if (type === "lessEqual") {
        if (Number(originalValue) > Number(value)) {
          isAllRulesFine = false;
          break;
        }
      } else {
        throw new Error(`unknown rule type ${type}`);
      }
    }
    if (!isAllRulesFine) {
      continue;
    } else {
      newItems.push(item);
    }
    if (itemCachedKeys) {
      for (const key of itemCachedKeys) {
        keysMap.set(key, true);
      }
    }
  }
  return newItems;
}
