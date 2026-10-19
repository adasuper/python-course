import { useEffect } from 'preact/hooks';
import { t } from '../i18n/en';
import { route, saveDialogOpen, unsaved } from '../state/store';
import { LiveRegion, Toasts } from './components/Common';
import { SaveDialog } from './components/SaveDialogs';
import { QuestScreen } from './quest/QuestScreen';
import { CheckScreen } from './screens/Check';
import { ConceptScreen } from './screens/Concept';
import { CreatorScreen } from './screens/Creator';
import { InventoryScreen } from './screens/Inventory';
import { OverworldScreen } from './screens/Overworld';
import { StoryScreen } from './screens/Story';
import { TitleScreen } from './screens/Title';

export function App() {
  const r = route.value;
  // Warn before leaving with progress that hasn't been saved out (§12.5).
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsaved.value) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);
  useEffect(() => {
    document.title = r.name === 'quest' ? `${t.appName} — quest` : t.appName;
  }, [r]);

  let screen;
  switch (r.name) {
    case 'loading':
      screen = (
        <main id="main" class="screen center">
          <p>{t.loading}</p>
        </main>
      );
      break;
    case 'title':
      screen = <TitleScreen />;
      break;
    case 'creator':
      screen = <CreatorScreen />;
      break;
    case 'story':
      screen = <StoryScreen key={r.title} route={r} />;
      break;
    case 'concept':
      screen = <ConceptScreen route={r} />;
      break;
    case 'overworld':
      screen = <OverworldScreen />;
      break;
    case 'quest':
      screen = <QuestScreen key={r.questId} questId={r.questId} />;
      break;
    case 'check':
      screen = <CheckScreen regionId={r.regionId} />;
      break;
    case 'inventory':
      screen = <InventoryScreen />;
      break;
  }
  return (
    <>
      {screen}
      <Toasts onSave={() => (saveDialogOpen.value = true)} />
      {saveDialogOpen.value && <SaveDialog onClose={() => (saveDialogOpen.value = false)} />}
      <LiveRegion />
    </>
  );
}
