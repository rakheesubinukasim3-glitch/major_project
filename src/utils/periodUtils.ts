// Shared utilities for period scheduling and thresholds

interface PeriodConfig {
    startHour: number;
    startMinute: number;
    durationMin: number;
    lateAfterMin: number;
}

const periodConfig: Record<number, PeriodConfig> = {
    1: { startHour: 9, startMinute: 0, durationMin: 75, lateAfterMin: 40 },
    2: { startHour: 10, startMinute: 15, durationMin: 75, lateAfterMin: 40 },
    3: { startHour: 11, startMinute: 30, durationMin: 75, lateAfterMin: 40 },
    4: { startHour: 12, startMinute: 30, durationMin: 75, lateAfterMin: 40 },
    5: { startHour: 13, startMinute: 45, durationMin: 75, lateAfterMin: 40 },
    6: { startHour: 15, startMinute: 0, durationMin: 75, lateAfterMin: 40 },
};

export const getPeriodStart = (period: number): Date => {
    const cfg = periodConfig[period] || periodConfig[1];
    const d = new Date();
    d.setHours(cfg.startHour, cfg.startMinute, 0, 0);
    return d;
};

export const getPeriodLateThreshold = (period: number): Date => {
    const start = getPeriodStart(period);
    const cfg = periodConfig[period] || periodConfig[1];
    const late = new Date(start);
    late.setMinutes(late.getMinutes() + cfg.lateAfterMin);
    return late;
};

export const getPeriodEnd = (period: number): Date => {
    const start = getPeriodStart(period);
    const cfg = periodConfig[period] || periodConfig[1];
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + cfg.durationMin);
    return end;
};

export const getCurrentPeriod = (): number | null => {
    const now = new Date();
    for (const period of Object.keys(periodConfig).map(Number)) {
        const start = getPeriodStart(period);
        const end = getPeriodEnd(period);
        if (now >= start && now <= end) {
            return period;
        }
    }
    return null;
};
