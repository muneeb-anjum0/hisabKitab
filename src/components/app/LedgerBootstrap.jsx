import { DataProvider } from '../../contexts/DataContext';
import LedgerApp from './LedgerApp';

export default function LedgerBootstrap() {
  return (
    <DataProvider>
      <LedgerApp />
    </DataProvider>
  );
}
