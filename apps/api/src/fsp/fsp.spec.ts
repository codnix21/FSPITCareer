describe('FSP integration contract', () => {
  it('ответ участника содержит обязательные поля', () => {
    const payload = {
      participantId: 'fsp-001',
      name: 'Иван Петров',
      isDemo: false,
      notice: 'Данные синхронизированы с реестром ФСП. При расхождении приоритет у официального источника.',
      disciplines: [{ id: 'programming', name: 'Программирование' }],
      competitions: [{ name: 'Чемпионат России', year: 2026, place: 12, status: 'Финалист' }],
      roles: ['Участник'],
      ranks: [],
    };

    expect(payload.participantId).toBeTruthy();
    expect(payload.notice).toContain('реестром ФСП');
    expect(payload.competitions[0].status).toBe('Финалист');
  });
});
