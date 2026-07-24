export default function normalizeTargets(doc: any) {
  if (!doc.targets || doc.targets.length === 0) {
    doc.targets = [{ price: doc.target }];
  }
  return doc;
}
