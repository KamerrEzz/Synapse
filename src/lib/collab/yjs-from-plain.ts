import * as Y from "yjs";

/** Tiptap Collaboration reads Y.XmlFragment("default") with paragraph nodes. */
export function yjsStateHexFromPlainText(plain: string): string {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("default");
  const lines = plain.replace(/\r\n/g, "\n").split("\n");
  ydoc.transact(() => {
    for (const line of lines) {
      const paragraph = new Y.XmlElement("paragraph");
      const text = new Y.XmlText();
      if (line) text.insert(0, line);
      paragraph.insert(0, [text]);
      fragment.push([paragraph]);
    }
  });
  const update = Y.encodeStateAsUpdate(ydoc);
  return `\\x${Buffer.from(update).toString("hex")}`;
}
