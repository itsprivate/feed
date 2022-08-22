import { handleRequest } from "../route.js";
export function onRequestGet(...args) {
  return handleRequest(...args);
}
