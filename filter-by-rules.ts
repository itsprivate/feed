import { Rule } from "./interface.ts";
import { get } from "./util.ts";
import Item from "./item.ts";
export default function filterByRules<T>(
  originalItems: Item<T>[],
  rules: Rule[],
): Item<T>[] {
  let limitRule: Rule | undefined;
  for (const rule of rules) {
    if (rule.type === "limit") {
      limitRule = rule;
      break;
    }
  }

  if (limitRule) {
    originalItems = originalItems.slice(0, Number(limitRule.value));
  }
  const newItems = [];
  for (const item of originalItems) {
    // check is valid
    if (!item.isValid()) {
      continue;
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
  }
  return newItems;
}
