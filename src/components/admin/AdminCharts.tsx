import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { DailyPoint, NameValue, PageStat } from './types';
import { PALETTE } from './types';

type ChannelFilter = 'all' | 'tg' | 'web';
type ChartKind = 'area' | 'line' | 'bar';

type ActivityStudioChartProps = {
  data: DailyPoint[];
  channel: ChannelFilter;
  chartKind: ChartKind;
  onSelectDay?: (dayIso: string) => void;
  chartRefOut?: React.MutableRefObject<echarts.ECharts | null>;
};

export const ActivityStudioChart: React.FC<ActivityStudioChartProps> = ({
  data,
  channel,
  chartKind,
  onSelectDay,
  chartRefOut,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: 'canvas' });
    instanceRef.current = chart;
    if (chartRefOut) chartRefOut.current = chart;

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      if (chartRefOut) chartRefOut.current = null;
      chart.dispose();
      instanceRef.current = null;
    };
  }, [chartRefOut]);

  useEffect(() => {
    const chart = instanceRef.current;
    if (!chart) return;

    const labels = data.map((d) => d.label);
    const tgData = data.map((d) => d.tg);
    const webData = data.map((d) => d.web);

    const series: echarts.SeriesOption[] = [];

    if (channel === 'all' || channel === 'tg') {
      series.push({
        name: 'Telegram',
        type: chartKind === 'bar' ? 'bar' : 'line',
        smooth: chartKind !== 'bar',
        symbol: 'circle',
        symbolSize: 6,
        barMaxWidth: 14,
        data: tgData,
        itemStyle: { color: PALETTE.gold, borderRadius: chartKind === 'bar' ? [4, 4, 0, 0] : 0 },
        lineStyle: { width: 2.2, color: PALETTE.gold },
        areaStyle:
          chartKind === 'area'
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(201,168,106,0.34)' },
                  { offset: 1, color: 'rgba(201,168,106,0.01)' },
                ]),
              }
            : undefined,
      });
    }

    if (channel === 'all' || channel === 'web') {
      series.push({
        name: 'Web',
        type: chartKind === 'bar' ? 'bar' : 'line',
        smooth: chartKind !== 'bar',
        symbol: 'circle',
        symbolSize: 6,
        barMaxWidth: 14,
        data: webData,
        itemStyle: { color: PALETTE.blue, borderRadius: chartKind === 'bar' ? [4, 4, 0, 0] : 0 },
        lineStyle: { width: 2.2, color: PALETTE.blue },
        areaStyle:
          chartKind === 'area'
            ? {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                  { offset: 0, color: 'rgba(91,155,255,0.30)' },
                  { offset: 1, color: 'rgba(91,155,255,0.01)' },
                ]),
              }
            : undefined,
      });
    }

    chart.setOption(
      {
        backgroundColor: 'transparent',
        animationDuration: 320,
        grid: { left: 32, right: 12, top: 14, bottom: 26 },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: '#161614',
          borderColor: 'rgba(201,168,106,0.35)',
          borderWidth: 1,
          textStyle: { color: '#F5F1EB', fontSize: 12 },
        },
        xAxis: {
          type: 'category',
          data: labels,
          axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
          axisLabel: { color: '#9A9389', fontSize: 10 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
          axisLabel: { color: '#8D867C', fontSize: 10 },
        },
        series,
      },
      true,
    );

    const zr = chart.getZr();
    const handleZrClick = (event: { offsetX: number; offsetY: number }) => {
      if (!onSelectDay) return;
      const px = [event.offsetX, event.offsetY];
      if (!chart.containPixel('grid', px)) return;
      const gridCoord = chart.convertFromPixel({ seriesIndex: 0 }, px);
      const idx = Array.isArray(gridCoord) ? Math.round(gridCoord[0]) : -1;
      const picked = data[idx];
      if (picked) onSelectDay(picked.day_iso);
    };

    zr.on('click', handleZrClick);
    return () => {
      zr.off('click', handleZrClick);
    };
  }, [data, channel, chartKind, onSelectDay]);

  return <div ref={containerRef} className="w-full h-[210px]" />;
};

type DonutCardProps = {
  title: string;
  subtitle?: string;
  items: NameValue[];
  centerText: string;
  colors?: string[];
  valueSuffix?: string;
};

const DEFAULT_DONUT_COLORS = [
  PALETTE.gold,
  PALETTE.blue,
  PALETTE.emerald,
  PALETTE.violet,
  PALETTE.coral,
  PALETTE.amber,
];

export const DonutCard: React.FC<DonutCardProps> = ({
  title,
  subtitle,
  items,
  centerText,
  colors = DEFAULT_DONUT_COLORS,
  valueSuffix = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const total = items.reduce((acc, i) => acc + i.value, 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: 'canvas' });

    const seriesData =
      items.length > 0 && total > 0
        ? items.map((item, idx) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: colors[idx % colors.length] },
          }))
        : [{ name: 'Нет данных', value: 1, itemStyle: { color: 'rgba(255,255,255,0.08)' } }];

    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        confine: true,
        backgroundColor: '#161614',
        borderColor: 'rgba(255,255,255,0.14)',
        textStyle: { color: '#F5F1EB', fontSize: 12 },
        formatter: (p: { name: string; value: number; percent: number }) =>
          total > 0 ? `${p.name}: <b>${p.value}</b>${valueSuffix} (${p.percent}%)` : 'Нет данных',
      },
      title: {
        text: centerText,
        left: 'center',
        top: 'center',
        textStyle: { color: '#F5F1EB', fontSize: 15, fontWeight: 700 },
      },
      series: [
        {
          type: 'pie',
          radius: ['58%', '82%'],
          avoidLabelOverlap: true,
          label: { show: false },
          emphasis: { scale: true, scaleSize: 4 },
          data: seriesData,
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [items, centerText, colors, total, valueSuffix]);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
      <div className="mb-2">
        <div className="text-[13px] font-semibold text-[#F5F1EB]">{title}</div>
        {subtitle && <div className="text-[11px] text-[#8D867C] mt-0.5">{subtitle}</div>}
      </div>
      <div ref={containerRef} className="w-full h-[140px]" />
      <div className="mt-2 space-y-1.5">
        {items.slice(0, 6).map((item, idx) => {
          const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span className="text-[#D6CFC4] truncate">{item.name}</span>
              </div>
              <div className="shrink-0 font-mono text-[#F5F1EB]">
                {item.value.toLocaleString('ru-RU')}
                {valueSuffix}{' '}
                <span className="text-[#8D867C]">({pct}%)</span>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="text-[12px] text-[#8D867C] text-center py-2">Пока нет данных</div>
        )}
      </div>
    </div>
  );
};

type PagesBarChartProps = {
  pages: PageStat[];
};

export const PagesBarChart: React.FC<PagesBarChartProps> = ({ pages }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = echarts.init(el, undefined, { renderer: 'canvas' });

    const top = pages.slice(0, 8).reverse();
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        confine: true,
        backgroundColor: '#161614',
        borderColor: 'rgba(255,255,255,0.14)',
        textStyle: { color: '#F5F1EB', fontSize: 12 },
      },
      grid: { left: 82, right: 16, top: 8, bottom: 24 },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
        axisLabel: { color: '#8D867C', fontSize: 10 },
      },
      yAxis: {
        type: 'category',
        data: top.map((p) => p.page),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#E7E1D7', fontSize: 11 },
      },
      series: [
        {
          name: 'Telegram',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 16,
          data: top.map((p) => p.tg),
          itemStyle: { color: PALETTE.gold, borderRadius: [3, 0, 0, 3] },
        },
        {
          name: 'Web',
          type: 'bar',
          stack: 'total',
          barMaxWidth: 16,
          data: top.map((p) => p.web),
          itemStyle: { color: PALETTE.blue, borderRadius: [0, 4, 4, 0] },
        },
      ],
    });

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(el);
    return () => {
      ro.disconnect();
      chart.dispose();
    };
  }, [pages]);

  const heightPx = Math.max(150, Math.min(300, pages.slice(0, 8).length * 36 + 50));

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[14px] font-semibold text-[#F5F1EB]">Рейтинг разделов</div>
          <div className="text-[11px] text-[#8D867C]">Уникальные посетители по экранам (TG + Web)</div>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[#A8A095]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#C9A86A]" /> TG
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm bg-[#5B9BFF]" /> Web
          </span>
        </div>
      </div>
      {pages.length > 0 ? (
        <div ref={containerRef} style={{ height: `${heightPx}px` }} className="w-full" />
      ) : (
        <div className="text-[12px] text-[#8D867C] py-8 text-center">За выбранный период данных нет</div>
      )}
    </div>
  );
};

type ConversionFunnelChartProps = {
  totalVisits: number;
  tgUsers: number;
  returningUsers: number;
  proActivations: number;
};

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({
  totalVisits,
  tgUsers,
  returningUsers,
  proActivations,
}) => {
  const base = Math.max(1, totalVisits);
  const steps = [
    {
      label: 'Всего визитов (период)',
      value: totalVisits,
      pct: totalVisits > 0 ? 100 : 0,
      color: PALETTE.gold,
    },
    {
      label: 'Из них в Telegram',
      value: tgUsers,
      pct: totalVisits > 0 ? Math.round((tgUsers / base) * 100) : 0,
      color: PALETTE.violet,
    },
    {
      label: 'Повторные визиты',
      value: returningUsers,
      pct: totalVisits > 0 ? Math.round((returningUsers / base) * 100) : 0,
      color: PALETTE.blue,
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#141412] p-4">
      <div className="mb-3">
        <div className="text-[14px] font-semibold text-[#F5F1EB]">Воронка вовлечения</div>
        <div className="text-[11px] text-[#8D867C]">Переход от визитов периода к глубине и PRO</div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-[#DED7CC]">{step.label}</span>
              <span className="font-mono text-[#F5F1EB]">
                {step.value}{' '}
                <span className="text-[#8D867C]">({step.pct}%)</span>
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(step.value > 0 ? 6 : 0, Math.min(100, step.pct))}%`,
                  backgroundColor: step.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-white/[0.07] flex items-center justify-between">
        <div>
          <div className="text-[12px] font-medium text-[#3FD08F]">PRO-активации (всего в Neon)</div>
          <div className="text-[11px] text-[#8D867C]">Накопительный итог по базе</div>
        </div>
        <div className="px-3 py-1 rounded-xl bg-[#3FD08F]/15 border border-[#3FD08F]/30 font-mono text-[14px] font-bold text-[#3FD08F]">
          {proActivations}
        </div>
      </div>
    </div>
  );
};
