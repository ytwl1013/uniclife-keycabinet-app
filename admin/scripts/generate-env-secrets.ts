import { randomBytes } from 'node:crypto';
import { emitKeypressEvents } from 'node:readline';

import { hash } from 'bcryptjs';

async function readHiddenPassword(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('请在交互式终端中运行此命令');
  }
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdout.write(prompt);

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

function generateSecret(): string {
  return randomBytes(48).toString('base64url');
}

async function main(): Promise<void> {
  const password = await readHiddenPassword('请输入管理员登录密码（12–128 个字符）：');
  if (password.length < 12 || password.length > 128) {
    throw new Error('管理员密码长度必须在 12–128 个字符之间');
  }
  const confirmedPassword = await readHiddenPassword('请再次输入相同密码：');
  if (password !== confirmedPassword) {
    throw new Error('两次输入的密码不一致，请重新运行命令');
  }

  const passwordHash = await hash(password, 12);
  const sessionSecret = generateSecret();
  const apiToken = generateSecret();

  process.stdout.write('\n生成完成。请手动复制以下三行到 admin/.env.local：\n\n');
  process.stdout.write(`ADMIN_PASSWORD_HASH=${passwordHash}\n`);
  process.stdout.write(`ADMIN_SESSION_SECRET=${sessionSecret}\n`);
  process.stdout.write(`ADMIN_API_TOKEN=${apiToken}\n`);
  process.stdout.write('\n其中 ADMIN_API_TOKEN 还需要复制到后端环境变量，且必须完全一致。\n');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : '生成管理环境变量失败';
  process.stderr.write(`\n错误：${message}\n`);
  process.exitCode = 1;
});
