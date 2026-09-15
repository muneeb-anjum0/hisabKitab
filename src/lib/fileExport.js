const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MONEY_FORMAT = '"Rs." #,##0;[Red]-"Rs." #,##0';

const isNativeApp = () => Boolean(window.Capacitor?.isNativePlatform?.());

const rowColour = (row, index) => {
  if (index === 0) return '#F4D431';
  const type = String(row[1] || '').toLowerCase();
  if (type.includes('received') || type.includes('allocated')) return '#BDE8CA';
  if (type === 'expense') return '#F7CBC5';
  if (type === 'transfer' || type === 'adjustment') return '#FFE58A';
  if (row.length && row.length <= 2) return '#E9E2D4';
  return undefined;
};

const sheetData = (rows) =>
  rows.map((row, rowIndex) => {
    const backgroundColor = rowColour(row, rowIndex);
    return row.map((value, columnIndex) => ({
      value,
      type: typeof value === 'number' ? Number : String,
      format: typeof value === 'number' && columnIndex > 0 ? MONEY_FORMAT : undefined,
      backgroundColor,
      fontWeight: rowIndex === 0 || (row.length > 0 && row.length <= 2) ? 'bold' : undefined,
      align: typeof value === 'number' ? 'right' : 'left',
      alignVertical: 'center',
      borderColor: '#111111',
      borderStyle: 'thin',
    }));
  });

const columnsFor = (rows) => {
  const count = Math.max(1, ...rows.map((row) => row.length));
  return Array.from({ length: count }, (_, column) => ({
    width: Math.min(44, Math.max(12, ...rows.map((row) => String(row[column] ?? '').length + 2))),
  }));
};

export async function buildXlsxWorkbook(rows, requestedSheetName) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const sheet =
    String(requestedSheetName || 'Ledger')
      .replace(/[\\/*?:[\]]/g, '')
      .slice(0, 31) || 'Ledger';
  return writeExcelFile(sheetData(rows), {
    columns: columnsFor(rows),
    stickyRowsCount: 1,
    sheet,
  }).toBlob();
}

const toBase64 = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(binary);
};

export async function exportXlsxFile(filename, rows, title = 'HisabKitab ledger', sheetName) {
  const workbook = await buildXlsxWorkbook(rows, sheetName);
  if (isNativeApp()) {
    const [{ Directory, Filesystem }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const saved = await Filesystem.writeFile({
      path: `exports/${filename}`,
      data: await toBase64(workbook),
      directory: Directory.Cache,
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

  const file = new File([workbook], filename, { type: XLSX_TYPE });
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
