import { useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { handleIncomingUrl, checkDeferredInstall, ResolvedLink } from './linking';

interface UseWildlinksResult {
  resolved: ResolvedLink | null;
  loading: boolean;
}

/**
 * Drop this hook near the root of your app (above your navigator). It:
 * 1. Checks the initial URL if the app was cold-started from a Universal Link/App Link
 * 2. Subscribes to further links tapped while the app is already running
 * 3. On first mount only, also checks for a deferred install match (clipboard-based)
 *
 * Use the returned `resolved.deepLinkPayload` to navigate once it becomes non-null.
 */
export function useWildlinks(): UseWildlinksResult {
  const [resolved, setResolved] = useState<ResolvedLink | null>(null);
  const [loading, setLoading] = useState(true);
  const checkedDeferred = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const result = await handleIncomingUrl(initialUrl);
        if (isMounted && result.matched) setResolved(result);
      } else if (!checkedDeferred.current) {
        checkedDeferred.current = true;
        const deferred = await checkDeferredInstall();
        if (isMounted && deferred.matched) setResolved(deferred);
      }
      if (isMounted) setLoading(false);
    }

    bootstrap();

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleIncomingUrl(url).then((result) => {
        if (isMounted && result.matched) setResolved(result);
      });
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  return { resolved, loading };
}
