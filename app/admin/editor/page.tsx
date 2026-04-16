import type { Metadata } from 'next';
import AdminEditor from './AdminEditor';

export const metadata: Metadata = {
  title: 'Site Editor',
  robots: { index: false, follow: false }
};

export default function Page() {
  return <AdminEditor />;
}
