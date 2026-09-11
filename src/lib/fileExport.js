const CSV_TYPE = 'text/csv;charset=utf-8';

const isNativeApp = () => Boolean(window.Capacitor?.isNativePlatform?.());

export async function exportCsvFile(filename, csv, title = 'HisabKitab ledger') {
  if (isNativeApp()) {
    const [{ Directory, Encoding, Filesystem }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const saved = await Filesystem.writeFile({
      path: `exports/${filename}`,
      data: csv,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    });
    await Share.share({
      title,
      text: 'Exported from HisabKitab',
      files: [saved.uri],
      dialogTitle: 'SAVE OR SHARE YOUR LEDGER',
    });
    return 'shared';
  }

  const file = new File([csv], filename, { type: CSV_TYPE });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ title, files: [file] });
    return 'shared';
  }

  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
