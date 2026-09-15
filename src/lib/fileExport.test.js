import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import { buildXlsxWorkbook } from './fileExport';

describe('Excel workbook export', () => {
  it('creates a styled workbook with sized columns and safe user text', async () => {
    const bytes = await buildXlsxWorkbook(
      [
        ['Date', 'Type', 'Description', 'Amount (PKR)'],
        ['2026-09-15', 'Expense', 'Tea & snacks <office>', 750],
        [],
        ['Total spent', 750],
      ],
      'House / Daily',
    );
    const files = unzipSync(new Uint8Array(await bytes.arrayBuffer()));
    const sheet = strFromU8(files['xl/worksheets/sheet1.xml']);
    const styles = strFromU8(files['xl/styles.xml']);
    const workbook = strFromU8(files['xl/workbook.xml']);
    const strings = strFromU8(files['xl/sharedStrings.xml']);

    expect(sheet).toContain('customWidth="1"');
    expect(sheet).toContain('state="frozen"');
    expect(strings).toContain('Tea &amp; snacks &lt;office&gt;');
    expect(styles).toContain('&quot;Rs.&quot; #,##0');
    expect(styles).toContain('F7CBC5');
    expect(workbook).toContain('name="House  Daily"');
  });
});
