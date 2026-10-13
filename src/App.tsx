import { useEffect } from 'react';
import { useLang } from './game/i18n.ts';
import { parseRoute, useRouteHash } from './game/router.ts';
import { useSave } from './game/store.ts';
import { Create, Custom } from './screens/Create.tsx';
import { Daily } from './screens/Daily.tsx';
import { Home } from './screens/Home.tsx';
import { Levels } from './screens/Levels.tsx';
import { Play } from './screens/Play.tsx';
import { Reverse } from './screens/Reverse.tsx';

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
  if (route.name === 'levels') return <Levels key={route.mode} mode={route.mode} />;
  if (route.name === 'reverse') return <Reverse index={route.index} />;
  if (route.name === 'create') return <Create />;
  if (route.name === 'custom') return <Custom key={route.code} code={route.code} />;
  return <Home />;
}
