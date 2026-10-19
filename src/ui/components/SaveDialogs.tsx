// "Save your progress" and "Continue from a save" (docs/specs.md §12.5).
import { useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { openFile } from '../../state/progressFile';
import {
  currentSaveCode,
  existingMatch,
  installRestored,
  restoreFromCode,
  restoreFromFile,
  saveProgressFile,
  type Restored,
} from '../../state/saving';
import { announce, markSavedOut } from '../../state/store';
import type { Profile } from '../../state/profile';
import { Modal } from './Common';

export function SaveDialog({ onClose }: { onClose: () => void }) {
  const [code] = useState(currentSaveCode);
  const [copied, setCopied] = useState(false);
  const [fileStatus, setFileStatus] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      (document.getElementById('save-code') as HTMLTextAreaElement | null)?.select();
    }
    setCopied(true);
    markSavedOut();
    announce(t.save.copied);
  };
  const file = async () => {
    const result = await saveProgressFile();
    if (result !== 'cancelled') {
      setFileStatus(result === 'saved' ? t.hud.saved : 'Downloaded to your Downloads folder.');
      announce(t.hud.saved);
    }
  };
  return (
    <Modal title={t.save.heading} onClose={onClose}>
      <p>{t.save.why}</p>
      <section aria-labelledby="save-code-h">
        <h3 id="save-code-h">{t.save.codeHeading}</h3>
        <p class="muted">{t.save.codeHelp}</p>
        <textarea
          id="save-code"
          class="save-code"
          readOnly
          rows={4}
          value={code}
          aria-labelledby="save-code-h"
          onFocus={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <button type="button" onClick={copy}>
          {copied ? `✓ ${t.save.copied}` : t.save.copy}
        </button>
      </section>
      <section aria-labelledby="save-file-h">
        <h3 id="save-file-h">{t.save.fileHeading}</h3>
        <p class="muted">{t.save.fileHelp}</p>
        <button type="button" onClick={file}>
          {t.save.saveFile}
        </button>
        {fileStatus && <p role="status">✓ {fileStatus}</p>}
      </section>
      <div class="modal-actions">
        <button type="button" class="ghost" onClick={onClose}>
          {t.save.close}
        </button>
      </div>
    </Modal>
  );
}

export function RestoreDialog({
  onClose,
  onRestored,
}: {
  onClose: () => void;
  onRestored: (p: Profile) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Restored | null>(null);

  const accept = async (restored: Restored) => {
    if (existingMatch(restored)) {
      setPending(restored);
      return;
    }
    onRestored(await installRestored(restored, 'keep'));
  };
  const fromCode = () => {
    const r = restoreFromCode(text);
    if (!r.ok) return setError(t.save[r.message]);
    void accept(r.restored);
  };
  const fromFile = async () => {
    const contents = await openFile();
    if (contents === null) return;
    const r = restoreFromFile(contents);
    if (!r.ok) return setError(t.save[r.message]);
    void accept(r.restored);
  };

  if (pending) {
    return (
      <Modal title={t.save.restoreHeading} onClose={onClose}>
        <p>{t.save.replaceOrKeep}</p>
        <div class="modal-actions">
          <button type="button" onClick={async () => onRestored(await installRestored(pending, 'replace'))}>
            {t.save.replace}
          </button>
          <button type="button" onClick={async () => onRestored(await installRestored(pending, 'keep'))}>
            {t.save.keepBoth}
          </button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title={t.save.restoreHeading} onClose={onClose}>
      <label for="restore-code">{t.save.pasteLabel}</label>
      <textarea
        id="restore-code"
        rows={4}
        value={text}
        onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
        aria-describedby={error ? 'restore-error' : undefined}
      />
      {error && (
        <p id="restore-error" class="error-text" role="alert">
          ⚠ {error}
        </p>
      )}
      <div class="modal-actions">
        <button type="button" onClick={fromCode} disabled={!text.trim()}>
          {t.save.restoreCode}
        </button>
        <button type="button" onClick={fromFile}>
          {t.save.openFile}
        </button>
        <button type="button" class="ghost" onClick={onClose}>
          {t.save.close}
        </button>
      </div>
    </Modal>
  );
}
