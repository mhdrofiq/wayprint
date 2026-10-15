import type { Instrumentation } from 'next';
import { log } from '@/lib/log';

// Logs server errors Next.js catches outside the API route wrapper, such as a
// crash while rendering the map or a pin page.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  log.error('request.unhandled_error', {
    method: request.method,
    path: request.path.split('?')[0],
    routePath: context.routePath,
    routeType: context.routeType,
    digest: (err as { digest?: string }).digest,
    err,
  });
};
