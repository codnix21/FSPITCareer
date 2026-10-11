'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

export type SelectOption = {
  id: string;
  label: string;
  value: string;
  meta?: Record<string, unknown>;
};

type CommonProps = {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  options?: SelectOption[];
  onSearch?: (query: string) => Promise<SelectOption[]>;
  debounceMs?: number;
  /** Minimum characters before calling onSearch (external APIs require ≥2) */
  minQueryLength?: number;
  emptyText?: string;
  emptyHint?: string;
  idleHint?: string;
  loadingText?: string;
  truncatedText?: string;
  clearLabel?: string;
};

type SingleProps = CommonProps & {
  multiple?: false;
  value: SelectOption | null;
  onChange: (value: SelectOption | null) => void;
};

type MultiProps = CommonProps & {
  multiple: true;
  value: SelectOption[];
  onChange: (value: SelectOption[]) => void;
};

export type SearchableSelectProps = SingleProps | MultiProps;

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SearchableSelect(props: SearchableSelectProps) {
  const {
    label,
    placeholder = 'Выберите...',
    searchPlaceholder = 'Начните вводить...',
    disabled,
    error: externalError,
    className,
    options: staticOptions,
    onSearch,
    debounceMs = 350,
    minQueryLength = 2,
    emptyText = 'Ничего не найдено',
    emptyHint = 'Попробуйте изменить запрос',
    idleHint = 'Начните вводить название',
    loadingText = 'Поиск...',
    truncatedText = 'Уточните запрос для более точных результатов',
    clearLabel = 'Очистить',
  } = props;

  const multiple = !!props.multiple;
  const listId = useId();
  const searchId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState<SelectOption[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounced = useDebounced(query, debounceMs);

  const selectedList = multiple
    ? (props as MultiProps).value
    : (props as SingleProps).value
      ? [(props as SingleProps).value!]
      : [];
  const selectedValues = new Set(selectedList.map((v) => v.value));
  const hasSelection = selectedList.length > 0;

  const runSearch = useCallback(
    async (q: string) => {
      const trimmed = q.trim();

      if (trimmed.length < minQueryLength) {
        setItems([]);
        setTruncated(false);
        setLoading(false);
        setLoadError('');
        return;
      }

      if (!onSearch) {
        const nq = trimmed.toLowerCase();
        const base = staticOptions || [];
        setItems(base.filter((o) => o.label.toLowerCase().includes(nq) || o.value.toLowerCase().includes(nq)));
        setTruncated(false);
        setLoading(false);
        setLoadError('');
        return;
      }

      const reqId = ++reqIdRef.current;
      setLoading(true);
      setLoadError('');
      try {
        const res = await onSearch(trimmed);
        if (reqId !== reqIdRef.current) return;
        setItems(res);
        setTruncated(res.length >= 10);
        setActiveIdx(0);
      } catch {
        if (reqId !== reqIdRef.current) return;
        setItems([]);
        setLoadError('Не удалось загрузить подсказки');
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    },
    [onSearch, staticOptions, minQueryLength],
  );

  useEffect(() => {
    if (!open) return;
    void runSearch(debounced);
  }, [debounced, open, runSearch]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function select(opt: SelectOption) {
    if (multiple) {
      const cur = (props as MultiProps).value;
      if (cur.some((v) => v.value === opt.value)) return;
      (props as MultiProps).onChange([...cur, opt]);
      setQuery('');
      setItems([]);
      searchRef.current?.focus();
    } else {
      (props as SingleProps).onChange(opt);
      setQuery('');
      setOpen(false);
    }
  }

  function clearAll(e?: React.MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    if (multiple) (props as MultiProps).onChange([]);
    else (props as SingleProps).onChange(null);
    setQuery('');
  }

  function removeChip(e: React.MouseEvent, value: string) {
    e.stopPropagation();
    e.preventDefault();
    if (!multiple) return;
    (props as MultiProps).onChange((props as MultiProps).value.filter((v) => v.value !== value));
  }

  function onSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(items.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (items[activeIdx]) select(items[activeIdx]);
    }
  }

  const showIdle = open && query.trim().length < minQueryLength && !loading && !loadError;
  const showEmpty =
    open && query.trim().length >= minQueryLength && !loading && !loadError && items.length === 0;

  const dropdown = open && (
    <div className="absolute left-0 right-0 z-40 mt-1 max-h-72 max-w-[min(100%,calc(100vw-1.5rem))] overflow-hidden rounded-[10px] border border-ink-950/10 bg-white shadow-panel">
      {!multiple && (
        <div className="border-b border-ink-950/8 p-2">
          <input
            id={searchId}
            ref={searchRef}
            role="searchbox"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={items[activeIdx] ? `${listId}-opt-${activeIdx}` : undefined}
            className="field min-h-11 w-full !py-2"
            placeholder={searchPlaceholder}
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onSearchKeyDown}
          />
        </div>
      )}

      <ul id={listId} role="listbox" aria-label={label || placeholder} className="max-h-56 overflow-auto py-1">
        {loading && (
          <li className="flex min-h-11 items-center gap-2 px-3 text-sm text-ink-500" role="status">
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600"
              aria-hidden
            />
            {loadingText}
          </li>
        )}

        {!loading && loadError && (
          <li className="space-y-2 px-3 py-3 text-sm">
            <p className="text-red-700">{loadError}</p>
            <button type="button" className="btn-secondary !py-2" onClick={() => void runSearch(debounced)}>
              Повторить
            </button>
          </li>
        )}

        {showIdle && (
          <li className="px-3 py-3 text-sm text-ink-500">
            <p className="font-medium text-ink-700">{idleHint}</p>
            <p className="mt-1 text-xs">Минимум {minQueryLength} символа</p>
          </li>
        )}

        {showEmpty && (
          <li className="px-3 py-3 text-sm text-ink-500">
            <p className="font-medium text-ink-700">{emptyText}</p>
            <p className="mt-1 text-xs">{emptyHint}</p>
          </li>
        )}

        {!loadError &&
          items.map((opt, idx) => {
            const selected = selectedValues.has(opt.value);
            const secondary =
              typeof opt.meta?.region === 'string'
                ? opt.meta.region
                : typeof opt.meta?.city === 'string'
                  ? opt.meta.city
                  : undefined;
            return (
              <li key={`${opt.id}-${opt.value}`} role="presentation">
                <button
                  type="button"
                  id={`${listId}-opt-${idx}`}
                  role="option"
                  aria-selected={selected || idx === activeIdx}
                  className={clsx(
                    'flex min-h-11 w-full items-center gap-2 px-3 text-left text-sm',
                    idx === activeIdx ? 'bg-brand-50 text-brand-900' : 'hover:bg-ink-50',
                    selected && 'font-semibold',
                  )}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => select(opt)}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {opt.label}
                    {secondary && <span className="mt-0.5 block truncate text-xs font-normal text-ink-400">{secondary}</span>}
                  </span>
                  {selected && <span className="shrink-0 text-xs text-brand-700">✓</span>}
                </button>
              </li>
            );
          })}

        {!loading && !loadError && truncated && items.length > 0 && (
          <li className="border-t border-ink-950/5 px-3 py-2 text-xs text-ink-400">{truncatedText}</li>
        )}
      </ul>
    </div>
  );

  if (multiple) {
    return (
      <div ref={rootRef} className={clsx('relative', className)}>
        {label && (
          <label className="label" id={`${listId}-label`}>
            {label}
          </label>
        )}

        <div
          className={clsx(
            'field flex min-h-11 flex-wrap items-center gap-1.5 !py-1.5',
            open && 'ring-2 ring-brand-500',
            (externalError || loadError) && 'ring-2 ring-red-400',
            disabled && 'opacity-60',
          )}
          onClick={() => {
            if (disabled) return;
            setOpen(true);
            searchRef.current?.focus();
          }}
        >
          {(props as MultiProps).value.map((v) => (
            <span
              key={v.value}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-sm text-brand-900 ring-1 ring-brand-200"
            >
              <span className="truncate">{v.label}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Удалить ${v.label}`}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-base leading-none text-brand-700 hover:bg-brand-100"
                onClick={(e) => removeChip(e, v.value)}
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={searchId}
            ref={searchRef}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-labelledby={label ? `${listId}-label` : undefined}
            aria-activedescendant={items[activeIdx] ? `${listId}-opt-${activeIdx}` : undefined}
            className="min-h-9 min-w-[10rem] flex-1 border-0 bg-transparent px-1 text-sm outline-none placeholder:text-ink-400"
            placeholder={hasSelection ? searchPlaceholder : placeholder || searchPlaceholder}
            value={query}
            disabled={disabled}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onSearchKeyDown}
          />
        </div>

        {hasSelection && !disabled && (
          <button type="button" className="mt-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900" onClick={clearAll}>
            Очистить всё
          </button>
        )}

        {externalError && <p className="mt-1 text-xs text-red-600">{externalError}</p>}
        {dropdown}
      </div>
    );
  }

  const triggerText = (props as SingleProps).value?.label || placeholder;

  return (
    <div ref={rootRef} className={clsx('relative', className)}>
      {label && (
        <label className="label" id={`${listId}-label`}>
          {label}
        </label>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={label ? `${listId}-label` : undefined}
          className={clsx(
            'field flex min-h-11 flex-1 items-center justify-between gap-2 text-left !py-2',
            open && 'ring-2 ring-brand-500',
            (externalError || loadError) && 'ring-2 ring-red-400',
            disabled && 'opacity-60',
            !hasSelection && 'text-ink-400',
          )}
          onClick={() => {
            if (disabled) return;
            setOpen((o) => !o);
          }}
        >
          <span className="truncate">{triggerText}</span>
          <span aria-hidden className="shrink-0 text-ink-400">
            {open ? '▴' : '▾'}
          </span>
        </button>
        {hasSelection && !disabled && (
          <button type="button" className="btn-secondary min-h-11 shrink-0 !px-3" onClick={clearAll} aria-label={clearLabel}>
            {clearLabel}
          </button>
        )}
      </div>

      {externalError && <p className="mt-1 text-xs text-red-600">{externalError}</p>}
      {dropdown}
    </div>
  );
}

export function SearchableMultiSelect(props: Omit<MultiProps, 'multiple'>) {
  return <SearchableSelect {...props} multiple />;
}
