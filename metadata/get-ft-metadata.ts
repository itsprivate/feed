export default function getMetadata(html: string): string | null {
  try {
    const schemaJson = html.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/,
    );
    if (schemaJson) {
      const json = JSON.parse(schemaJson[1]);

      if (json && json.image && json.image.url) {
        return json.image.url;
      } else {
        return null;
      }
    } else {
      return null;
    }
  } catch (_e) {
    return null;
  }
}
