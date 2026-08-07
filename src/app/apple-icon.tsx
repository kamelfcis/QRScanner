import { fetchDynamicSiteIconResponse } from '@/lib/seo/dynamicSiteIcon';

export const revalidate = 300;

export default async function AppleIcon() {
  return fetchDynamicSiteIconResponse();
}
