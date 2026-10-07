export function downloadSaveText(serialized: string, fileName: string): boolean {
  let objectUrl: string | null = null;
  let link: HTMLAnchorElement | null = null;
  try {
    const blob = new Blob([serialized], { type: 'application/json;charset=utf-8' });
    objectUrl = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.hidden = true;
    document.body.append(link);
    link.click();
    return true;
  } catch {
    return false;
  } finally {
    link?.remove();
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl as string), 1000);
  }
}
