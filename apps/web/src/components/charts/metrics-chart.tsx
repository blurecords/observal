"use client";

import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";
import type { EChartsOption } from "echarts";

export interface MetricPoint {
  ts: string;
  value: number;
}

interface MetricsChartProps {
  title?: string;
  series: Array<{ name: string; data: MetricPoint[]; color?: string }>;
  height?: number;
  unit?: string;
}

export function MetricsChart({
  title,
  series,
  height = 280,
  unit,
}: MetricsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const option: EChartsOption = useMemo(
    () => ({
      backgroundColor: "transparent",
      title: title
        ? {
            text: title,
            textStyle: { color: "#8b95a8", fontSize: 13, fontWeight: 500 },
            left: 0,
          }
        : undefined,
      grid: { left: 48, right: 16, top: title ? 40 : 16, bottom: 32 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#0d1220",
        borderColor: "#1a2236",
        textStyle: { color: "#eef2ff", fontSize: 12 },
      },
      legend:
        series.length > 1
          ? { bottom: 0, textStyle: { color: "#8b95a8" } }
          : undefined,
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: "#1a2236" } },
        axisLabel: { color: "#8b95a8", fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        axisLine: { show: false },
        axisLabel: { color: "#8b95a8", fontSize: 10 },
        splitLine: { lineStyle: { color: "#1a2236", type: "dashed" } },
        name: unit,
        nameTextStyle: { color: "#8b95a8", fontSize: 10 },
      },
      series: series.map((s) => ({
        name: s.name,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color: s.color ?? "#3b82f6" },
        itemStyle: { color: s.color ?? "#3b82f6" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: (s.color ?? "#3b82f6") + "33" },
              { offset: 1, color: "transparent" },
            ],
          },
        },
        data: s.data.map((p) => [p.ts, p.value]),
      })),
    }),
    [title, series, unit],
  );

  useEffect(() => {
    if (!containerRef.current || series.every((s) => s.data.length === 0)) {
      return;
    }

    chartRef.current ??= echarts.init(containerRef.current, undefined, {
      renderer: "canvas",
    });
    chartRef.current.setOption(option);

    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [option, series]);

  useEffect(() => {
    return () => {
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  if (series.every((s) => s.data.length === 0)) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-card bg-card text-sm text-muted"
        style={{ height }}
      >
        Sin datos en este periodo
      </div>
    );
  }

  return <div ref={containerRef} style={{ height, width: "100%" }} />;
}

interface UptimeBarProps {
  online: number;
  total: number;
  label: string;
}

export function UptimeBar({ online, total, label }: UptimeBarProps) {
  const pct = total > 0 ? Math.round((online / total) * 100) : 0;
  const color =
    pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span>{label}</span>
        <span className="text-muted">
          {online}/{total} · {pct}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-[#1a2236] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
