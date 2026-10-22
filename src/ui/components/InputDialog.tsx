// Mode B input (docs/specs.md §6.5): when a program asks for input and the queue is empty,
// the player types the answer here. The program then runs again from the top with it.
import { useState } from 'preact/hooks';
import { t } from '../../i18n/en';
import { Modal } from './Common';

export function InputDialog({
  prompt,
  output,
  onAnswer,
  onCancel,
}: {
  prompt: string;
  /** What the program printed before it asked. */
  output: string;
  onAnswer(value: string): void;
  onCancel(): void;
}) {
  const [value, setValue] = useState('');
  return (
    <Modal title={t.quest.inputHeading} onClose={onCancel} labelId="input-dialog-title">
      {output.trim() && (
        <>
          <p class="small-text muted">{t.quest.inputSoFar}</p>
          <pre class="input-so-far" tabIndex={0} aria-label={t.quest.inputSoFar}>
            {output}
          </pre>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAnswer(value);
        }}
      >
        <label for="program-input">{t.quest.inputLabel(prompt)}</label>
        <input
          id="program-input"
          data-autofocus
          type="text"
          autocomplete="off"
          spellcheck={false}
          value={value}
          aria-describedby="program-input-help"
          onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        />
        <p id="program-input-help" class="small-text muted">
          {t.quest.inputHelp}
        </p>
        <div class="modal-actions">
          <button type="submit" class="primary">
            {t.quest.inputSubmit}
          </button>
          <button type="button" class="ghost" onClick={onCancel}>
            {t.quest.inputCancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
