export function isStaffAppPath(pathname: string): boolean {
  return pathname === '/kitchen' || pathname.startsWith('/kitchen/') || pathname.startsWith('/dashboard');
}
