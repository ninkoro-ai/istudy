import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={'bg-white rounded-2xl border border-black/5 shadow-sm px-4 py-4 mb-3 ' + className}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2 mt-1">
      <h2 className="text-[15px] font-extrabold text-[#2B2328] pl-2.5 relative">
        <span className="absolute left-0 top-1 bottom-1 w-1 rounded bg-[#FF6B8A]" />
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Button({ children, onClick, variant = 'primary', disabled, className = '', type = 'button' }: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'gold';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-xl px-4 min-h-[42px] text-sm font-bold transition active:scale-[.97] disabled:opacity-50 disabled:cursor-not-allowed ';
  const styles: Record<string, string> = {
    primary: 'bg-gradient-to-br from-[#FF6B8A] to-[#E8557A] text-white shadow-md shadow-pink-200',
    soft: 'bg-pink-50 text-[#E8557A]',
    ghost: 'bg-transparent text-[#8A7B80]',
    gold: 'bg-gradient-to-br from-[#F0A868] to-[#E8A050] text-white shadow-md shadow-amber-200'
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={base + styles[variant] + ' ' + className}>
      {children}
    </button>
  );
}

export function Pill({ children, color = 'pink' }: { children: ReactNode; color?: 'pink' | 'green' | 'gold' | 'gray' }) {
  const map = {
    pink: 'bg-pink-50 text-[#E8557A]',
    green: 'bg-emerald-50 text-emerald-700',
    gold: 'bg-amber-50 text-amber-700',
    gray: 'bg-black/5 text-[#8A7B80]'
  };
  return <span className={'inline-block text-[11px] font-bold px-2 py-0.5 rounded-full ' + map[color]}>{children}</span>;
}

export function Progress({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={'h-2 rounded-full bg-pink-50 overflow-hidden ' + className}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#7FC8A9] to-emerald-600 transition-all" style={{ width: Math.max(2, Math.min(100, value)) + '%' }} />
    </div>
  );
}

export function Empty({ text }: { text: string }) {
  return <div className="text-center text-[13px] text-[#8A7B80] py-6">{text}</div>;
}

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={
        'px-3.5 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 ' +
        (active ? 'bg-[#FF6B8A] border-[#FF6B8A] text-white' : 'bg-white border-black/10 text-[#8A7B80]')
      }
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs text-[#8A7B80] mb-3">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputCls = 'w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[15px] text-[#2B2328] outline-none focus:border-[#FF6B8A]';
