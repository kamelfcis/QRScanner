import { redirect } from 'next/navigation';

/** Dashboard gallery admin removed — keep route so old bookmarks do not 404. */
export default function GalleryPage() {
  redirect('/dashboard/menu');
}
