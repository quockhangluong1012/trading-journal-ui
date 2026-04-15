import { registerOverlay, utils } from "klinecharts";

export interface OrderSegment {
  text: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function registerCustomOverlays() {
  registerOverlay({
    name: "tradingViewOrder",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    totalStep: 2,
    createPointFigures: ({ overlay, coordinates, bounding }) => {
      if (coordinates.length === 0) return [];

      const data = overlay.extendData as {
        color: string;
        segments: OrderSegment[];
        isDashed?: boolean;
      } | undefined;

      if (!data) return [];

      const y = coordinates[0].y;
      const figures: any[] = [];
      const fontSize = 12;
      const fontFamily = "sans-serif";
      const paddingX = 6;
      const paddingY = 4;
      const gap = -1; // Negative gap to make borders overlap seamlessly like TV

      // Helper to compute line start X and offset
      let currentX = 10;
      let totalWidth = 0;

      // Calculate total width first to know how many segments
      if (data.segments && data.segments.length > 0) {
          for (let i = 0; i < data.segments.length; i++) {
              totalWidth += utils.calcTextWidth(data.segments[i].text, fontSize, "normal", fontFamily) + (paddingX * 2) + gap;
          }
      }

      // 1. Draw the horizontal line from right of the rightmost box to the end of the chart
      figures.push({
        type: "line",
        attrs: {
          coordinates: [
            { x: totalWidth > 0 ? totalWidth + 10 : 0, y },
            { x: bounding.width, y }
          ]
        },
        styles: {
          style: data.isDashed ? "dashed" : "solid",
          color: data.color,
          size: 1,
          dashedValue: data.isDashed ? [4, 4] : undefined
        }
      });

      if (!data.segments || data.segments.length === 0) return figures;

      // 2. Draw segments
      for (let i = 0; i < data.segments.length; i++) {
        const seg = data.segments[i];
        const textWidth = utils.calcTextWidth(seg.text, fontSize, "normal", fontFamily);
        
        figures.push({
          type: "rectText",
          attrs: {
            x: currentX,
            y: y,
            text: seg.text,
            align: "left",
            baseline: "middle"
          },
          styles: {
            style: "stroke_fill",
            color: seg.color,
            size: fontSize,
            family: fontFamily,
            paddingLeft: paddingX,
            paddingRight: paddingX,
            paddingTop: paddingY,
            paddingBottom: paddingY,
            backgroundColor: seg.bgColor,
            borderColor: seg.borderColor,
            borderSize: 1,
            borderRadius: 2
          }
        });

        currentX += textWidth + (paddingX * 2) + gap;
      }

      return figures;
    }
  });

  registerOverlay({
    name: "tradeMarker",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    totalStep: 2,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length === 0) return [];

      const data = overlay.extendData as {
        type: "buy" | "sell";
        text: string;
      } | undefined;

      if (!data) return [];

      const { x, y } = coordinates[0];
      const isBuy = data.type === "buy";
      const color = isBuy ? "#2563eb" : "#dc2626"; // Blue for buy, Red for sell
      const arrowText = isBuy ? "↑" : "↓";

      // Draw the arrow pointing at the price
      const textFigure = {
         type: "text",
         attrs: {
           x: x,
           y: isBuy ? y + 20 : y - 20, // Buy appears below pointing up, Sell appears above pointing down
           text: `${arrowText} ${data.text}`,
           align: "center",
           baseline: isBuy ? "top" : "bottom"
         },
         styles: {
           color: color,
           size: 14,
           weight: "bold",
           family: "sans-serif"
         }
      };

      return [textFigure];
    }
  });

  registerOverlay({
    name: "sessionBox",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    totalStep: 3,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 2) return [];

      const data = overlay.extendData as {
        name: string;
        color: string;
        bgColor: string;
      } | undefined;

      if (!data) return [];

      const { name, color, bgColor } = data;
      const x1 = coordinates[0].x;
      const y1 = coordinates[0].y;
      const x2 = coordinates[1].x;
      const y2 = coordinates[1].y;

      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);

      return [
        {
          type: "polygon",
          attrs: {
            coordinates: [
              { x: minX, y: minY },
              { x: maxX, y: minY },
              { x: maxX, y: maxY },
              { x: minX, y: maxY }
            ]
          },
          styles: {
            style: "stroke_fill",
            color: color,
            borderColor: color,
            borderSize: 1,
            borderStyle: "dashed",
            backgroundColor: bgColor
          }
        },
        {
          type: "text",
          attrs: {
            x: minX + (maxX - minX) / 2,
            y: minY - 4,
            text: name,
            align: "center",
            baseline: "bottom"
          },
          styles: {
            color: color,
            size: 11
          }
        }
      ];
    }
  });

  registerOverlay({
    name: "customRect",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    totalStep: 3,
    createPointFigures: ({ overlay, coordinates }) => {
      if (coordinates.length < 2) return [];
      const [start, end] = coordinates;
      
      const data = overlay.extendData as { text?: string } | undefined;
      const text = data?.text ?? "FVG";

      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      const midY = (minY + maxY) / 2;

      const figures: any[] = [
        {
          type: "polygon",
          attrs: {
            coordinates: [
              { x: minX, y: minY },
              { x: maxX, y: minY },
              { x: maxX, y: maxY },
              { x: minX, y: maxY }
            ]
          },
          styles: { 
            style: "fill",
            color: "rgba(76, 175, 80, 0.15)"
          }
        },
        {
          type: "line",
          attrs: {
            coordinates: [
              { x: minX, y: midY },
              { x: maxX, y: midY }
            ]
          },
          styles: {
            style: "solid",
            color: "rgba(30, 30, 30, 0.7)",
            size: 1
          }
        }
      ];

      if (text) {
        figures.push({
          type: "text",
          attrs: {
            x: maxX - 4,
            y: midY,
            text,
            align: "right",
            baseline: "middle"
          },
          styles: {
            color: "rgba(30, 30, 30, 0.8)",
            size: 12
          }
        });
      }

      return figures;
    }
  });

  registerOverlay({
    name: "customArrow",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    totalStep: 3,
    createPointFigures: ({ coordinates }) => {
      if (coordinates.length < 2) return [];
      const [start, end] = coordinates;
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      const headLength = 12;
      const angle1 = angle - Math.PI / 6;
      const angle2 = angle + Math.PI / 6;
      const p1 = { x: end.x - headLength * Math.cos(angle1), y: end.y - headLength * Math.sin(angle1) };
      const p2 = { x: end.x - headLength * Math.cos(angle2), y: end.y - headLength * Math.sin(angle2) };
      return [
        { type: "line", attrs: { coordinates: [start, end] } },
        { type: "line", attrs: { coordinates: [p1, end, p2] } }
      ];
    }
  });

  registerOverlay({
    name: "customPath",
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,
    totalStep: 1000, // Large number to allow continuous drawing until right-click/double-click
    createPointFigures: ({ coordinates }) => {
      return [{ type: "line", attrs: { coordinates } }];
    }
  });
}
