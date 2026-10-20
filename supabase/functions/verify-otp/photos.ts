// Photo reconciliation for verify-otp. Pure module.
//
// create-lead stores the predetermined storage paths ("<leadId>/<uuid>.<ext>") before the browser has
// uploaded anything. After verification only the objects that really exist in the bucket are kept.

/**
 * @param declared      photo_urls as stored on the lead
 * @param leadId        the lead's id
 * @param folderObjects names (not paths) of the objects found under "<leadId>/" in the bucket
 */
export function reconcilePhotoPaths(
  declared: readonly string[] | null | undefined,
  leadId: string,
  folderObjects: readonly string[],
): string[] {
  const present = new Set(folderObjects);
  const prefix = `${leadId}/`;
  return (declared ?? []).filter((path) => {
    // Paths outside the lead folder (legacy uploads) cannot be checked here and are left alone.
    if (!path.startsWith(prefix)) return true;
    return present.has(path.slice(prefix.length));
  });
}
