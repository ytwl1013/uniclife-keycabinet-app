import { emitKeypressEvents } from 'node:readline';

import { hash } from 'bcryptjs';

async function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('请在交互式终端中运行此命令');
  }
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write('请输入管理员密码（至少 12 个字符）：');

  return new Promise((resolve, reject) => {
    let password = '';
    const cleanup = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.removeListener('keypress', onKeypress);
      process.stdout.write('\n');
    };
    const onKeypress = (character: string, key: { name?: string; ctrl?: boolean }) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('已取消'));
        return;
      }
      if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(password);
        return;
      }
      if (key.name === 'backspace') {
        if (password) {
          password = password.slice(0, -1);
          process.stdout.write('\b \b');
        }
        return;
      }
      if (character && !key.ctrl) {
        password += character;
        process.stdout.write('•');
      }
    };
    process.stdin.on('keypress', onKeypress);
  });
}

async function main(): Promise<void> {
  const password = await readHiddenPassword();
  if (password.length < 12 || password.length > 128) {
    throw new Error('管理员密码长度必须在 12–128 个字符之间');
  }
  process.stdout.write(`${await hash(password, 12)}\n`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '生成密码哈希失败';
  process.stderr.write(`\n错误：${message}\n`);
  process.exitCode = 1;
});
