import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchableMultiSelect, SearchableSelect, type SelectOption } from '@/components/searchable-select';

const OPTIONS: SelectOption[] = [
  { id: '1', label: 'Python', value: 'Python' },
  { id: '2', label: 'FastAPI', value: 'FastAPI' },
  { id: '3', label: 'Assembler', value: 'Assembler' },
];

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('SearchableSelect', () => {
  it('opens, searches after min length, selects and clears', async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn(async (q: string) =>
      OPTIONS.filter((o) => o.label.toLowerCase().includes(q.trim().toLowerCase())),
    );

    const { unmount } = render(
      <SearchableSelect
        label="Навык"
        placeholder="Выберите навык..."
        searchPlaceholder="Начните вводить навык..."
        value={null}
        onChange={onChange}
        onSearch={onSearch}
        debounceMs={20}
        minQueryLength={2}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    expect(await screen.findByText(/Начните вводить/i)).toBeTruthy();
    expect(onSearch).not.toHaveBeenCalled();

    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'as' } });
    await waitFor(() => expect(onSearch).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('option', { name: /Assembler/i }));
    expect(onChange).toHaveBeenCalledWith(OPTIONS[2]);
    unmount();

    render(
      <SearchableSelect
        label="Навык"
        value={OPTIONS[2]}
        onChange={onChange}
        onSearch={onSearch}
        debounceMs={20}
      />,
    );
    fireEvent.click(screen.getByLabelText('Очистить'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('supports keyboard navigation', async () => {
    const onChange = vi.fn();
    const onSearch = vi.fn(async () => OPTIONS);

    render(
      <SearchableSelect label="Должность" value={null} onChange={onChange} onSearch={onSearch} debounceMs={20} minQueryLength={2} />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    const input = await screen.findByRole('searchbox');
    fireEvent.change(input, { target: { value: 'py' } });
    await screen.findByRole('option', { name: 'Python' });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(OPTIONS[1]);
  });

  it('ignores stale search responses (race protection)', async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const resolvers: Array<(v: SelectOption[]) => void> = [];

    const onSearch = vi.fn((_q: string) => {
      return new Promise<SelectOption[]>((r) => {
        resolvers.push(r);
      });
    });

    render(
      <SearchableSelect label="Навык" value={null} onChange={onChange} onSearch={onSearch} debounceMs={50} minQueryLength={2} />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    const input = screen.getByRole('searchbox');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'py' } });
      await vi.advanceTimersByTimeAsync(60);
    });
    await act(async () => {
      fireEvent.change(input, { target: { value: 'python' } });
      await vi.advanceTimersByTimeAsync(60);
    });

    expect(onSearch.mock.calls.map((c) => c[0])).toEqual(['py', 'python']);

    await act(async () => {
      resolvers[1]?.([{ id: 'p', label: 'Python', value: 'Python' }]);
    });
    await act(async () => {
      resolvers[0]?.([{ id: 'j', label: 'Java', value: 'Java' }]);
    });

    expect(screen.getByRole('option', { name: 'Python' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Java' })).toBeNull();
  });

  it('shows empty state for no results', async () => {
    const onSearchEmpty = vi.fn(async () => []);
    render(
      <SearchableSelect label="Город" value={null} onChange={() => undefined} onSearch={onSearchEmpty} debounceMs={20} />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zz' } });
    expect(await screen.findByText('Ничего не найдено')).toBeTruthy();
  });

  it('shows error state with retry', async () => {
    const onSearchFail = vi.fn(async () => {
      throw new Error('network');
    });
    render(
      <SearchableSelect label="Город" value={null} onChange={() => undefined} onSearch={onSearchFail} debounceMs={20} />,
    );
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ir' } });
    expect(await screen.findByText('Не удалось загрузить подсказки')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeTruthy();
  });
});

describe('SearchableMultiSelect', () => {
  it('adds, removes and prevents duplicates', async () => {
    const onChange = vi.fn();
    const Wrapper = () => {
      const [value, setValue] = React.useState<SelectOption[]>([]);
      return (
        <SearchableMultiSelect
          label="Навыки"
          placeholder="Начните вводить навык..."
          searchPlaceholder="Начните вводить навык..."
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          onSearch={async () => OPTIONS}
          debounceMs={20}
          minQueryLength={2}
        />
      );
    };

    render(<Wrapper />);
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'py' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Python' }));
    expect(onChange).toHaveBeenLastCalledWith([OPTIONS[0]]);

    fireEvent.change(input, { target: { value: 'py' } });
    const pythonOption = await screen.findByRole('option', { name: /Python/ });
    const callsBefore = onChange.mock.calls.length;
    fireEvent.click(pythonOption);
    expect(onChange.mock.calls.length).toBe(callsBefore);

    fireEvent.click(screen.getByLabelText('Удалить Python'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
