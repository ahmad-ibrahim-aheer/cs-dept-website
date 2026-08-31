// Image (PNG) export utilities for the timetable feature

import { DAY_ORDER, to12, buildClassShort } from './timetableUtils';
import type { FlatRecord } from './timetableTypes';

export type ColorPalette = {
  id: string;
  name: string;
  bgStart: string;
  bgEnd: string;
  dayLabelStart: string;
  dayLabelEnd: string;
  /** RGB base string, e.g. '59, 130, 246' — used in rgba() */
  accent1: string;
  accent2: string;
  /** Row label gradients: [time, course, room, class] */
  labelGradStarts: string[];
  labelGradEnds: string[];
  /** Teacher row label gradient (used when includeTeacher is on) */
  teacherLabelStart: string;
  teacherLabelEnd: string;
  /** Cell colors: [time, course, room, class, teacher] */
  cellBgs: string[];
  cellAccents: string[];
  cellTextColors: string[];
};

export const palettes: ColorPalette[] = [
  {
    id: 'classroom',
    name: 'Neon Chalk',
    bgStart: '#2b2b2b',
    bgEnd: '#3d3d3d',
    dayLabelStart: '#111111',
    dayLabelEnd: '#242424',
    accent1: '0, 188, 212',
    accent2: '139, 195, 74',
    labelGradStarts: ['#1b5e20', '#bf360c', '#01579b', '#4a148c'],
    labelGradEnds: ['#388e3c', '#e64a19', '#0277bd', '#7b1fa2'],
    teacherLabelStart: '#7b3f00',
    teacherLabelEnd: '#e65100',
    cellBgs: [
      'rgba(139, 195, 74, 0.88)',
      'rgba(255, 214, 0, 0.88)',
      'rgba(0, 188, 212, 0.88)',
      'rgba(186, 104, 200, 0.88)',
      'rgba(255, 152, 0, 0.88)',
    ],
    cellAccents: [
      'rgba(85, 139, 47, 0.9)',
      'rgba(200, 162, 0, 0.9)',
      'rgba(0, 139, 163, 0.9)',
      'rgba(142, 36, 170, 0.9)',
      'rgba(200, 100, 0, 0.9)',
    ],
    cellTextColors: ['#1a2e00', '#2d2200', '#00202a', '#1a0025', '#2d1500'],
  },
  {
    id: 'emerald-night',
    name: 'Emerald Night',
    bgStart: '#0f172a',
    bgEnd: '#1e1b4b',
    dayLabelStart: '#1e3a5f',
    dayLabelEnd: '#3b1f7e',
    accent1: '59, 130, 246',
    accent2: '139, 92, 246',
    labelGradStarts: ['#065f46', '#881337', '#1e3a5f', '#4c1d95'],
    labelGradEnds: ['#047857', '#be123c', '#1d4ed8', '#6d28d9'],
    teacherLabelStart: '#78350f',
    teacherLabelEnd: '#92400e',
    cellBgs: [
      'rgba(16, 185, 129, 0.38)',
      'rgba(244, 63, 94, 0.38)',
      'rgba(59, 130, 246, 0.38)',
      'rgba(139, 92, 246, 0.38)',
      'rgba(245, 158, 11, 0.38)',
    ],
    cellAccents: [
      'rgba(52, 211, 153, 0.65)',
      'rgba(251, 113, 133, 0.65)',
      'rgba(96, 165, 250, 0.65)',
      'rgba(167, 139, 250, 0.65)',
      'rgba(251, 191, 36, 0.65)',
    ],
    cellTextColors: ['#ecfdf5', '#fff1f2', '#eff6ff', '#f5f3ff', '#fffbeb'],
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    bgStart: '#0a0a0a',
    bgEnd: '#1c1c2e',
    dayLabelStart: '#1e293b',
    dayLabelEnd: '#0f172a',
    accent1: '100, 116, 139',
    accent2: '148, 163, 184',
    labelGradStarts: ['#1e293b', '#334155', '#1e293b', '#374151'],
    labelGradEnds: ['#334155', '#475569', '#374151', '#4b5563'],
    teacherLabelStart: '#3f4f5c',
    teacherLabelEnd: '#506070',
    cellBgs: [
      'rgba(148, 163, 184, 0.25)',
      'rgba(100, 116, 139, 0.25)',
      'rgba(71, 85, 105, 0.35)',
      'rgba(203, 213, 225, 0.2)',
      'rgba(165, 180, 196, 0.30)',
    ],
    cellAccents: [
      'rgba(203, 213, 225, 0.6)',
      'rgba(148, 163, 184, 0.6)',
      'rgba(100, 116, 139, 0.6)',
      'rgba(241, 245, 249, 0.5)',
      'rgba(165, 180, 196, 0.60)',
    ],
    cellTextColors: ['#f1f5f9', '#f8fafc', '#e2e8f0', '#cbd5e1', '#e2e8f0'],
  },
];

export interface GeneratePNGOptions {
  /** All records in the currently loaded dataset (used to infer visible days). */
  allFlat: FlatRecord[];
  activeDegrees: Set<string>;
  activePrograms: Set<string>;
  activeSemesters: Set<string>;
  activeSections: Set<string>;
  /** Dataset display name shown in the corner of the image (e.g. "Week 1"). */
  datasetName: string;
}

export async function generateWeeklyPNG(
  records: FlatRecord[],
  footerText = '',
  palette: ColorPalette = palettes[0],
  withTeacher = false,
  opts: GeneratePNGOptions
): Promise<Blob> {
  const {
    allFlat,
    activeDegrees,
    activePrograms,
    activeSemesters,
    activeSections,
    datasetName: dsName,
  } = opts;

  // Sort by day order then start time
  records.sort((a, b) => {
    const dayA = DAY_ORDER.indexOf(a.day);
    const dayB = DAY_ORDER.indexOf(b.day);
    if (dayA !== dayB) return dayA - dayB;
    const tA = a.start_time
      ? parseInt(a.start_time.slice(0, 2)) * 60 +
        parseInt(a.start_time.slice(3, 5))
      : 0;
    const tB = b.start_time
      ? parseInt(b.start_time.slice(0, 2)) * 60 +
        parseInt(b.start_time.slice(3, 5))
      : 0;
    return tA - tB;
  });

  // Group by day
  const byDay: Record<string, FlatRecord[]> = {};
  for (const r of records) {
    if (!byDay[r.day]) byDay[r.day] = [];
    byDay[r.day].push(r);
  }
  const daysInData = new Set(records.map((r) => r.day));
  const daysToShow = DAY_ORDER.filter((d) => daysInData.has(d));

  // Also add days from the full dataset that have 0 filtered results
  const allDaysInFlat = new Set(allFlat.map((r: FlatRecord) => r.day));
  for (const d of DAY_ORDER) {
    if (allDaysInFlat.has(d) && !daysToShow.includes(d)) {
      daysToShow.push(d);
    }
  }
  daysToShow.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  // Build title from active filters, falling back to records data
  const titleParts: string[] = [];
  if (activeDegrees.size === 1) {
    titleParts.push([...activeDegrees][0]);
  } else {
    const degs = new Set(records.map((r) => r.degree).filter(Boolean));
    if (degs.size === 1) titleParts.push([...degs][0]);
  }
  if (activePrograms.size === 1) {
    titleParts.push([...activePrograms][0]);
  } else {
    const progs = new Set(records.map((r) => r.program).filter(Boolean));
    if (progs.size === 1) titleParts.push([...progs][0]);
  }
  if (activeSemesters.size === 1) {
    titleParts.push('Semester ' + [...activeSemesters][0]);
  } else {
    const sems = new Set(
      records.map((r) => r.semester).filter((s) => s != null)
    );
    if (sems.size === 1) titleParts.push('Semester ' + [...sems][0]);
  }
  if (activeSections.size === 1) {
    titleParts.push('(' + [...activeSections][0] + ')');
  } else {
    const secs = new Set(records.map((r) => r.section).filter(Boolean));
    if (secs.size === 1) titleParts.push('(' + [...secs][0] + ')');
  }
  const extraParts: string[] = [];
  const uniqueCourses = new Set(
    records.map((r) => r.course_title).filter(Boolean)
  );
  if (uniqueCourses.size === 1)
    extraParts.push([...uniqueCourses][0] as string);
  const uniqueTeachers = new Set(
    records.map((r) => r.teacher_name).filter(Boolean)
  );
  if (uniqueTeachers.size === 1)
    extraParts.push([...uniqueTeachers][0] as string);
  const classBase = titleParts.join(' ');
  const classInfo = [classBase, ...extraParts].filter(Boolean).join(' | ');
  const title = classInfo || 'Weekly Timetable';

  // Detect multiple classes — a "class" = degree+program+semester+section
  const classSet = new Set<string>();
  for (const r of records) {
    const cid =
      buildClassShort(r) + (r.semester != null ? ` (Sem #${r.semester})` : '');
    classSet.add(cid);
  }
  const showClassRow = classSet.size > 1;
  const rowCount = showClassRow ? (withTeacher ? 5 : 4) : withTeacher ? 4 : 3;

  const cellBgs = palette.cellBgs;
  const cellAccents = palette.cellAccents;
  const cellTextColors = palette.cellTextColors;

  // Text measurement canvas
  const measureCanvas = document.createElement('canvas');
  const mCtx = measureCanvas.getContext('2d');
  if (!mCtx) throw new Error('Unable to create canvas context');

  const cellFont = '13px system-ui, sans-serif';
  const cellFontBold = 'bold 13px system-ui, sans-serif';
  const lineHeight = 17;
  const cellPadV = 8;
  const minRowH = 32;

  function wrapText(text: string, maxWidth: number, font: string): string[] {
    mCtx!.font = font;
    if (maxWidth <= 0) return [text];
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (mCtx!.measureText(test).width <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [text];
  }

  function txtH(lc: number): number {
    return lc * lineHeight + cellPadV;
  }

  // Layout constants
  const scale = 2;
  const dayLabelW = 160;
  const rowLabelW = 90;
  const cellMinW = 130;
  const dayGap = 14;
  const titleH = 64;
  const footerH = footerText ? 36 : 0;
  const sidePad = 24;
  const cardRadius = 10;
  const maxLogicalW = 8000;

  let maxCols = 0;
  for (const d of daysToShow) {
    maxCols = Math.max(maxCols, (byDay[d] || []).length);
  }
  if (maxCols === 0) maxCols = 1;

  function classId(e: FlatRecord): string {
    return (
      buildClassShort(e) + (e.semester != null ? ` (Sem #${e.semester})` : '')
    );
  }

  function courseLabel(e: FlatRecord): string {
    const base = e.course_title || 'TBA';
    return e.practical ? `[P] ${base}` : base;
  }

  interface DayLayout {
    timeH: number;
    courseH: number;
    teacherH: number;
    roomH: number;
    classH: number;
    blockH: number;
  }

  function computeLayouts(logicalW: number): {
    layouts: DayLayout[];
    natH: number;
    dataW: number;
  } {
    const dw = logicalW - sidePad * 2 - dayLabelW - rowLabelW;
    const layouts: DayLayout[] = [];
    for (const day of daysToShow) {
      const entries = byDay[day] || [];
      if (entries.length === 0) {
        const bh = minRowH * rowCount;
        layouts.push({
          timeH: minRowH,
          courseH: minRowH,
          teacherH: withTeacher ? minRowH : 0,
          roomH: minRowH,
          classH: showClassRow ? minRowH : 0,
          blockH: bh,
        });
      } else {
        const n = entries.length;
        const cw = dw / n;
        const tw = cw - 16;
        let mxT = 1,
          mxC = 1,
          mxTch = 1,
          mxR = 1,
          mxCl = 1;
        for (const e of entries) {
          const ts = to12(e.start_time) + ' \u2013 ' + to12(e.end_time);
          mxT = Math.max(mxT, wrapText(ts, tw, cellFontBold).length);
          mxC = Math.max(
            mxC,
            wrapText(courseLabel(e), tw, cellFont).length
          );
          if (withTeacher) {
            mxTch = Math.max(
              mxTch,
              wrapText(e.teacher_name || '', tw, cellFont).length
            );
          }
          mxR = Math.max(mxR, wrapText(e.room, tw, cellFont).length);
          if (showClassRow) {
            mxCl = Math.max(mxCl, wrapText(classId(e), tw, cellFont).length);
          }
        }
        const tH = Math.max(minRowH, txtH(mxT));
        const cH = Math.max(minRowH, txtH(mxC));
        const tchH = withTeacher ? Math.max(minRowH, txtH(mxTch)) : 0;
        const rH = Math.max(minRowH, txtH(mxR));
        const clH = showClassRow ? Math.max(minRowH, txtH(mxCl)) : 0;
        layouts.push({
          timeH: tH,
          courseH: cH,
          teacherH: tchH,
          roomH: rH,
          classH: clH,
          blockH: tH + cH + tchH + rH + clH,
        });
      }
    }
    const natH =
      titleH +
      layouts.reduce((s, l) => s + l.blockH + dayGap, 0) +
      footerH +
      30;
    return { layouts, natH, dataW: dw };
  }

  const natW = Math.min(
    Math.max(1280, dayLabelW + rowLabelW + cellMinW * maxCols + sidePad * 2),
    maxLogicalW
  );

  let result = computeLayouts(natW);
  let dayLayouts = result.layouts;
  const natH = result.natH;
  let dataW = result.dataW;

  let finalW = Math.max(natW, Math.ceil(natH * (16 / 9)));
  finalW = Math.min(finalW, maxLogicalW);
  let finalH = Math.round(finalW * (9 / 16));

  if (finalH < natH) finalH = natH;

  if (finalW !== natW) {
    result = computeLayouts(finalW);
    dayLayouts = result.layouts;
    dataW = result.dataW;
  }

  const cardsH =
    dayLayouts.reduce((s, l) => s + l.blockH + dayGap, 0) -
    (daysToShow.length > 0 ? dayGap : 0);
  const cardsStartY = Math.max(titleH, Math.floor((finalH - cardsH) / 2));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(finalW * scale);
  canvas.height = Math.round(finalH * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas context');
  ctx.scale(scale, scale);

  function roundRectPath(
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    radius: number
  ) {
    const r = Math.min(radius, rw / 2, rh / 2);
    ctx!.beginPath();
    ctx!.moveTo(rx + r, ry);
    ctx!.lineTo(rx + rw - r, ry);
    ctx!.arcTo(rx + rw, ry, rx + rw, ry + r, r);
    ctx!.lineTo(rx + rw, ry + rh - r);
    ctx!.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
    ctx!.lineTo(rx + r, ry + rh);
    ctx!.arcTo(rx, ry + rh, rx, ry + rh - r, r);
    ctx!.lineTo(rx, ry + r);
    ctx!.arcTo(rx, ry, rx + r, ry, r);
    ctx!.closePath();
  }

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, finalW * 0.4, finalH);
  bgGrad.addColorStop(0, palette.bgStart);
  bgGrad.addColorStop(1, palette.bgEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, finalW, finalH);

  // Title
  const titleMidY = cardsStartY / 2;
  const titleFontSize =
    title.length < 30
      ? 24
      : title.length < 50
        ? 20
        : title.length < 70
          ? 17
          : 14;
  ctx.save();
  ctx.shadowColor = 'rgba(96, 165, 250, 0.4)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#f1f5f9';
  ctx.font = `bold ${titleFontSize}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, finalW / 2, titleMidY);
  ctx.restore();

  // Dataset name — right-aligned
  if (dsName) {
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(dsName, finalW - sidePad - 4, titleMidY);
  }

  // University name — left-aligned
  ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('University of Sargodha', sidePad + 4, titleMidY);

  // Gradient accent line under title
  const accentGrad = ctx.createLinearGradient(
    finalW * 0.25,
    0,
    finalW * 0.75,
    0
  );
  accentGrad.addColorStop(0, `rgba(${palette.accent1}, 0)`);
  accentGrad.addColorStop(0.3, `rgba(${palette.accent1}, 0.7)`);
  accentGrad.addColorStop(0.7, `rgba(${palette.accent2}, 0.7)`);
  accentGrad.addColorStop(1, `rgba(${palette.accent2}, 0)`);
  ctx.fillStyle = accentGrad;
  roundRectPath(finalW * 0.2, titleMidY + 18, finalW * 0.6, 3, 1.5);
  ctx.fill();

  function drawWrapped(
    text: string,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    font: string,
    color = '#000000'
  ) {
    const lines = wrapText(text, rw - 16, font);
    ctx!.font = font;
    ctx!.fillStyle = color;
    ctx!.textAlign = 'center';
    ctx!.textBaseline = 'middle';
    const totH = lines.length * lineHeight;
    const sy = ry + (rh - totH) / 2 + lineHeight / 2;
    lines.forEach((ln, li) => {
      ctx!.fillText(ln, rx + rw / 2, sy + li * lineHeight);
    });
  }

  const rowLabels = ['Time', 'Course'];
  if (withTeacher) rowLabels.push('Teacher');
  rowLabels.push('Room');
  if (showClassRow) rowLabels.push('Class');

  const rowLabelGradStarts = [
    palette.labelGradStarts[0],
    palette.labelGradStarts[1],
  ];
  const rowLabelGradEnds = [palette.labelGradEnds[0], palette.labelGradEnds[1]];
  if (withTeacher) {
    rowLabelGradStarts.push(palette.teacherLabelStart);
    rowLabelGradEnds.push(palette.teacherLabelEnd);
  }
  rowLabelGradStarts.push(palette.labelGradStarts[2]);
  rowLabelGradEnds.push(palette.labelGradEnds[2]);
  if (showClassRow) {
    rowLabelGradStarts.push(palette.labelGradStarts[3]);
    rowLabelGradEnds.push(palette.labelGradEnds[3]);
  }

  let curY = cardsStartY;

  for (let di = 0; di < daysToShow.length; di++) {
    const day = daysToShow[di];
    const entries = byDay[day] || [];
    const layout = dayLayouts[di];
    const dx = sidePad;
    const cardW = finalW - sidePad * 2;

    ctx.save();
    roundRectPath(dx, curY, cardW, layout.blockH, cardRadius);
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)';
    ctx.fill();
    roundRectPath(dx, curY, cardW, layout.blockH, cardRadius);
    ctx.clip();

    // Day label
    const dayGrd = ctx.createLinearGradient(dx, curY, dx, curY + layout.blockH);
    dayGrd.addColorStop(0, palette.dayLabelStart);
    dayGrd.addColorStop(1, palette.dayLabelEnd);
    ctx.fillStyle = dayGrd;
    ctx.fillRect(dx, curY, dayLabelW, layout.blockH);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(day, dx + dayLabelW / 2, curY + layout.blockH / 2);

    const labelX = dx + dayLabelW;
    const dataX = labelX + rowLabelW;
    const heights = [layout.timeH, layout.courseH];
    if (withTeacher) heights.push(layout.teacherH);
    heights.push(layout.roomH);
    if (showClassRow) heights.push(layout.classH);

    if (entries.length > 0) {
      let ly = curY;
      for (let ri = 0; ri < rowLabels.length; ri++) {
        const lg = ctx.createLinearGradient(
          labelX,
          ly,
          labelX + rowLabelW,
          ly + heights[ri]
        );
        lg.addColorStop(0, rowLabelGradStarts[ri]);
        lg.addColorStop(1, rowLabelGradEnds[ri]);
        ctx.fillStyle = lg;
        ctx.fillRect(labelX, ly, rowLabelW, heights[ri]);
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(labelX, ly, rowLabelW, 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          rowLabels[ri],
          labelX + rowLabelW / 2,
          ly + heights[ri] / 2
        );
        ly += heights[ri];
      }
    }

    if (entries.length === 0) {
      const noClassW = dataW + rowLabelW;
      ctx.fillStyle = 'rgba(51, 65, 85, 0.4)';
      ctx.fillRect(labelX, curY, noClassW, layout.blockH);
      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = 'italic 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'No Classes',
        labelX + noClassW / 2,
        curY + layout.blockH / 2
      );
    } else {
      const n = entries.length;
      const cellW = dataW / n;
      const rooms = entries.map((e) => e.room);
      const allSameRoom =
        rooms.length > 1 && rooms.every((r) => r === rooms[0]);

      function drawRow(
        y: number,
        h: number,
        bgIdx: number,
        // eslint-disable-next-line no-unused-vars
        getText: (_e: FlatRecord) => string,
        font: string,
        merge: boolean,
        mergedText: string
      ) {
        const txtColor = cellTextColors[bgIdx];
        if (merge) {
          ctx!.fillStyle = cellBgs[bgIdx];
          ctx!.fillRect(dataX, y, dataW, h);
          ctx!.fillStyle = cellAccents[bgIdx];
          ctx!.fillRect(dataX, y, dataW, 1.5);
          drawWrapped(mergedText, dataX, y, dataW, h, font, txtColor);
        } else {
          entries.forEach((e, i) => {
            const cx = dataX + i * cellW;
            ctx!.fillStyle = cellBgs[bgIdx];
            ctx!.fillRect(cx, y, cellW, h);
            ctx!.fillStyle = cellAccents[bgIdx];
            ctx!.fillRect(cx, y, cellW, 1.5);
            if (i > 0) {
              ctx!.fillStyle = 'rgba(255,255,255,0.05)';
              ctx!.fillRect(cx, y, 1, h);
            }
            drawWrapped(getText(e), cx, y, cellW, h, font, txtColor);
          });
        }
      }

      let rowY = curY;
      drawRow(
        rowY,
        layout.timeH,
        0,
        (e) => to12(e.start_time) + ' \u2013 ' + to12(e.end_time),
        cellFontBold,
        false,
        ''
      );

      rowY += layout.timeH;
      drawRow(
        rowY,
        layout.courseH,
        1,
        (e) => courseLabel(e),
        cellFont,
        false,
        ''
      );

      if (withTeacher) {
        rowY += layout.courseH;
        const teachers = entries.map((e) => e.teacher_name || '');
        const allSameTeacher =
          teachers.length > 1 && teachers.every((t) => t === teachers[0]);
        drawRow(
          rowY,
          layout.teacherH,
          4,
          (e) => e.teacher_name || '',
          cellFont,
          allSameTeacher,
          teachers[0]
        );
      }

      rowY =
        curY +
        layout.timeH +
        layout.courseH +
        (withTeacher ? layout.teacherH : 0);
      drawRow(
        rowY,
        layout.roomH,
        2,
        (e) => e.room,
        cellFont,
        allSameRoom,
        rooms[0]
      );

      if (showClassRow) {
        rowY += layout.roomH;
        const classIds = entries.map((e) => classId(e));
        const allSameClass =
          classIds.length > 1 && classIds.every((c) => c === classIds[0]);
        drawRow(
          rowY,
          layout.classH,
          3,
          (e) => classId(e),
          cellFont,
          allSameClass,
          classIds[0]
        );
      }
    }

    ctx.restore();
    ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 1;
    roundRectPath(dx, curY, cardW, layout.blockH, cardRadius);
    ctx.stroke();

    curY += layout.blockH + dayGap;
  }

  // Footer
  if (footerText) {
    const footerMidY =
      cardsStartY + cardsH + (finalH - (cardsStartY + cardsH)) / 2;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(footerText, sidePad + 8, footerMidY);
    ctx.textAlign = 'right';
    ctx.fillText(
      'Department of Computer Science',
      finalW - sidePad - 8,
      footerMidY
    );
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob returned null'));
    });
  });
}
