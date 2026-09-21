'use client';

import { Button, Input, Label, Spinner, TextField } from '@heroui/react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { useState, type FormEvent } from 'react';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.get('username'),
          password: form.get('password'),
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? '登录失败，请稍后再试');
        return;
      }
      window.location.replace('/');
    } catch {
      setError('网络连接异常，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action="/api/auth/login" className="mt-7 space-y-5" method="post" onSubmit={onSubmit}>
      <TextField fullWidth isRequired name="username" type="email">
        <Label>管理员邮箱</Label>
        <div className="relative mt-2">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" size={16} />
          <Input
            autoComplete="username"
            className="h-11 w-full pl-10"
            maxLength={320}
            placeholder="admin@example.com"
          />
        </div>
      </TextField>

      <TextField fullWidth isRequired name="password" type={showPassword ? 'text' : 'password'}>
        <div className="flex items-center justify-between">
          <Label>密码</Label>
          <span className="text-[11px] text-zinc-400">输入你设置的原始密码</span>
        </div>
        <div className="relative mt-2">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-zinc-400" size={16} />
          <Input
            autoComplete="current-password"
            className="h-11 w-full px-10"
            maxLength={128}
            minLength={12}
            placeholder="输入管理员密码"
          />
          <Button
            aria-label={showPassword ? '隐藏密码' : '显示密码'}
            className="absolute right-1.5 top-1/2 z-10 size-8 min-w-8 -translate-y-1/2"
            isIconOnly
            onPress={() => setShowPassword((value) => !value)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {showPassword ? <EyeOff aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}
          </Button>
        </div>
      </TextField>

      {error && (
        <p className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-xs leading-5 text-red-700" role="alert">
          {error}
        </p>
      )}

      <Button className="h-11 w-full" fullWidth isDisabled={isSubmitting} type="submit" variant="primary">
        {isSubmitting ? <Spinner color="current" size="sm" /> : <LockKeyhole aria-hidden="true" size={16} />}
        {isSubmitting ? '正在验证…' : '安全登录'}
      </Button>
    </form>
  );
}
