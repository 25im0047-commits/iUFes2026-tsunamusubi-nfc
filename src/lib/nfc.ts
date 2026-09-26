/** Consume only the NFC ID; preserve campaign parameters and the fragment. */
export function readNfcUrl(href: string) {
  const url = new URL(href);
  const id = url.searchParams.get("id");
  url.searchParams.delete("id");
  return { id, cleanPath: `${url.pathname}${url.search}${url.hash}` };
}
