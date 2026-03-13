import type { RotatedRect } from './types';
import { getHandlePositions, calculateHandleSize } from './utils';

const ROTATION_ARROW_SIZE = 6;

export function drawSelectionHandles(
  ctx: CanvasRenderingContext2D,
  rect: RotatedRect,
  displayWidth: number,
  dpr: number = 1,
) {
  const { visual } = calculateHandleSize(displayWidth, dpr);
  const halfHandle = visual / 2;
  const handles = getHandlePositions(rect);

  ctx.save();

  // Dashed selection border
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  ctx.translate(cx, cy);
  ctx.rotate(rect.rotation);

  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height);
  ctx.setLineDash([]);

  ctx.restore();

  // Corner handles (circles)
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const;
  for (const corner of corners) {
    const pos = handles[corner];
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, halfHandle, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Rotation handle line + curved arrow
  const topCenter = {
    x: (handles['top-left'].x + handles['top-right'].x) / 2,
    y: (handles['top-left'].y + handles['top-right'].y) / 2,
  };
  const rotHandle = handles['rotation'];

  ctx.beginPath();
  ctx.moveTo(topCenter.x, topCenter.y);
  ctx.lineTo(rotHandle.x, rotHandle.y);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rotation handle circle
  ctx.beginPath();
  ctx.arc(rotHandle.x, rotHandle.y, halfHandle + 2, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Curved arrow inside rotation handle
  ctx.beginPath();
  ctx.arc(rotHandle.x, rotHandle.y, ROTATION_ARROW_SIZE, -Math.PI * 0.7, Math.PI * 0.3);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Arrow tip
  const tipAngle = Math.PI * 0.3;
  const tipX = rotHandle.x + ROTATION_ARROW_SIZE * Math.cos(tipAngle);
  const tipY = rotHandle.y + ROTATION_ARROW_SIZE * Math.sin(tipAngle);
  ctx.beginPath();
  ctx.moveTo(tipX - 3, tipY - 3);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(tipX + 3, tipY - 1);
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
