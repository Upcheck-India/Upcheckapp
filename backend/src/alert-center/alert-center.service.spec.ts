import { AlertCenterService } from './alert-center.service';

describe('AlertCenterService', () => {
  it('emit maps engine fields into the unified alert (source + steps in data)', () => {
    const alerts = { create: jest.fn((x) => x) };
    const svc = new AlertCenterService(alerts as any);
    svc.emit({
      userId: 'u',
      pondId: 'p1',
      source: 'disease',
      severity: 'critical',
      title: 'WSSV risk',
      body: 'Temperature dropped 4°C',
      steps: ['Raise biosecurity'],
    });
    const arg = alerts.create.mock.calls[0][0];
    expect(arg.type).toBe('disease');
    expect(arg.severity).toBe('critical');
    expect(arg.message).toBe('Temperature dropped 4°C');
    expect(arg.data).toEqual({
      source: 'disease',
      steps: ['Raise biosecurity'],
      status: 'open',
    });
  });

  it('buildBriefing picks the top-severity alert per pond, ordered by severity', () => {
    const svc = new AlertCenterService({} as any);
    const briefing = svc.buildBriefing([
      {
        pondId: 'A',
        severity: 'watch',
        title: 'Feed',
        data: { source: 'feed', steps: [] },
      },
      {
        pondId: 'A',
        severity: 'critical',
        title: 'WSSV',
        data: { source: 'disease', steps: ['x'] },
      },
      {
        pondId: 'B',
        severity: 'info',
        title: 'News',
        data: { source: 'news' },
      },
    ]);
    expect(briefing).toHaveLength(2); // one card per pond
    expect(briefing[0].pondId).toBe('A'); // critical sorts first
    expect(briefing[0].topTitle).toBe('WSSV');
    expect(briefing[0].topSeverity).toBe('critical');
    expect(briefing[0].alertCount).toBe(2);
    expect(briefing[0].steps).toEqual(['x']);
    expect(briefing[1].pondId).toBe('B');
  });

  it('morningBriefing reads the user unread alerts', async () => {
    const alerts = {
      findByUser: jest.fn().mockResolvedValue([
        {
          pondId: 'A',
          severity: 'critical',
          title: 'WSSV',
          data: { source: 'disease', steps: [] },
        },
      ]),
    };
    const svc = new AlertCenterService(alerts as any);
    const b = await svc.morningBriefing('u');
    expect(alerts.findByUser).toHaveBeenCalledWith('u', true);
    expect(b[0].topTitle).toBe('WSSV');
  });
});
