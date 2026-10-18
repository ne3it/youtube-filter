import { useEffect, useRef } from "react";
import type { SemanticPoint } from "@/types";
import { Card } from "@/components/ui/card";

export interface TimelineChartProps {
  points: SemanticPoint[];
  height?: number;
}

export function TimelineChart({ points, height = 160 }: TimelineChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, height);

    const maxT = Math.max(...points.map((p) => p.t));
    const minT = Math.min(...points.map((p) => p.t));
    const range = Math.max(1, maxT - minT);

    const padL = 8;
    const padR = 8;
    const padT = 16;
    const padB = 24;
    const plotW = rect.width - padL - padR;
    const plotH = height - padT - padB;

    // ось
    ctx.strokeStyle = "#e5e3da";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();

    // линия плотности
    const coords = points.map((p) => ({
      x: padL + ((p.t - minT) / range) * plotW,
      y: padT + plotH - p.density * plotH,
    }));

    // градиентная заливка
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, "rgba(255, 210, 0, 0.35)");
    grad.addColorStop(1, "rgba(255, 210, 0, 0.02)");

    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH);
    coords.forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.lineTo(padL + plotW, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // линия
    ctx.beginPath();
    coords.forEach((c, i) => {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.strokeStyle = "#ffd200";
    ctx.lineWidth = 2;
    ctx.stroke();

    // точки
    coords.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0a0a";
      ctx.fill();
    });

    // метки времени
    ctx.fillStyle = "#7a776d";
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    const labelCount = Math.min(5, points.length);
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (points.length - 1));
      const p = points[idx];
      const x = padL + ((p.t - minT) / range) * plotW;
      const mins = Math.floor(p.t / 60000);
      const secs = Math.floor((p.t % 60000) / 1000);
      ctx.fillText(`${mins}:${secs.toString().padStart(2, "0")}`, x, padT + plotH + 14);
    }
  }, [points, height]);

  return (
    <Card className="p-4">
      <h3 className="mb-2 text-sm font-semibold text-ink">Semantic timeline</h3>
      <canvas ref={canvasRef} style={{ width: "100%", height }} />
    </Card>
  );
}