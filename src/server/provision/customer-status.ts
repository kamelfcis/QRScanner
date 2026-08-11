import type { ToggleableCustomerStatus } from '@/lib/engaz/status';
import { pauseProject, resolveVercelProjectId, unpauseProject } from '@/server/provision/vercel';

export async function syncVercelForCustomerStatus(
  customer: {
    slug: string;
    vercel_project_id?: string | null;
    production_url?: string | null;
  },
  status: ToggleableCustomerStatus
): Promise<{ vercelProjectId: string; vercelProjectName: string }> {
  const project = await resolveVercelProjectId(customer);

  if (status === 'archived') {
    await pauseProject(project.id);
  } else {
    await unpauseProject(project.id);
  }

  return { vercelProjectId: project.id, vercelProjectName: project.name };
}
