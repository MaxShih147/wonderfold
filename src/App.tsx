import { useEffect } from 'react';
import { useLang } from './game/i18n.ts';
import { parseRoute, useRouteHash } from './game/router.ts';
import { useSave } from './game/store.ts';
import { Daily } from './screens/Daily.tsx';
import { Home } from './screens/Home.tsx';
import { Play } from './screens/Play.tsx';

export function App() {
  const route = parseRoute(useRouteHash());
  const lang = useLang();
  const { theme } = useSave().settings;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  if (route.name === 'daily') return <Daily />;
  if (route.name === 'level') return <Play index={route.index} />;
  return <Home />;
}
