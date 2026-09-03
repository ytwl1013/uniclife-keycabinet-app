import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (relativePath: string) => readFileSync(resolve(__dirname, '..', relativePath), 'utf8');

describe('Add key keyboard layout', () => {
  it('pins the add action to the keyboard instead of over-avoiding it', () => {
    const addKey = source('src/app/(details)/cabinets/[cabinetId]/keys/new.tsx');
    const keyboardAccessory = source('src/features/cabinet-prototype/components/add-key-keyboard-accessory.tsx');
    const webKeyboardAccessory = source(
      'src/features/cabinet-prototype/components/add-key-keyboard-accessory.web.tsx',
    );

    expect(addKey).toContain('inputAccessoryViewID={keyNameKeyboardAccessoryId}');
    expect(addKey).toContain('inputAccessoryViewID={keyNoteKeyboardAccessoryId}');
    expect(addKey).toContain('nativeIDs={[keyNameKeyboardAccessoryId, keyNoteKeyboardAccessoryId]}');
    expect(addKey).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(addKey).toContain('Keyboard.dismiss()');
    expect(addKey).not.toContain('KeyboardAvoidingView');
    expect(keyboardAccessory).toContain('<InputAccessoryView backgroundColor="transparent"');
    expect(keyboardAccessory).toContain('<ActionButton disabled={disabled} icon="key"');
    expect(webKeyboardAccessory).not.toContain('InputAccessoryView');
    expect(webKeyboardAccessory).toContain('return null');
  });
});
