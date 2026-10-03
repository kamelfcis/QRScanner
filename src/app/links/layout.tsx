import { Providers } from '@/components/providers/Providers';

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
